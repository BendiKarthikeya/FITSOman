import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, X, Image as ImageIcon, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { getAuthToken } from "@/lib/authUtils";

interface MultipleImageUploadProps {
  value?: string[];
  onChange: (urls: string[]) => void;
  maxImages?: number;
  maxFileSize?: number; // in MB
  disabled?: boolean;
}

export function MultipleImageUpload({
  value = [],
  onChange,
  maxImages = 6,
  maxFileSize = 5,
  disabled = false,
}: MultipleImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleFileSelect = async (files: File[]) => {
    if (disabled) return;

    // Validate file count
    const totalFiles = value.length + files.length;
    if (totalFiles > maxImages) {
      toast({
        title: t('alerts.upload.tooManyImages'),
        description: `Maximum ${maxImages} images allowed. You have ${value.length} and trying to add ${files.length}.`,
        variant: "destructive",
      });
      return;
    }

    // Validate file types and sizes
    const validFiles = files.filter((file) => {
      if (!file.type.startsWith("image/")) {
        toast({
          title: t('alerts.upload.invalidFileType'),
          description: `${file.name} is not an image file.`,
          variant: "destructive",
        });
        return false;
      }

      if (file.size > maxFileSize * 1024 * 1024) {
        toast({
          title: t('alerts.upload.fileTooLarge'),
          description: `${file.name} is larger than ${maxFileSize}MB.`,
          variant: "destructive",
        });
        return false;
      }

      return true;
    });

    if (validFiles.length === 0) return;

    setUploading(true);

    try {
      const uploadPromises = validFiles.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);

        const headers: Record<string, string> = {};

        // Add Authorization header with JWT token if available
        const token = getAuthToken();
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
          console.log(
            `[DEBUG] Upload using auth token (length: ${token.length})`,
          );
        } else {
          console.log(`[DEBUG] No auth token available for upload`);
        }

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
          headers,
          credentials: "include", // Include session cookies
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const data = await response.json();
        return data.url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const newImageUrls = [...value, ...uploadedUrls];
      onChange(newImageUrls);

      toast({
        title: "Images uploaded",
        description: `Successfully uploaded ${uploadedUrls.length} image(s).`,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: t('alerts.upload.uploadFailed'),
        description:
          error instanceof Error ? error.message : t('alerts.upload.uploadFailedDesc'),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    handleFileSelect(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    handleFileSelect(files);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (indexToRemove: number) => {
    if (disabled) return;
    const newImageUrls = value.filter((_, index) => index !== indexToRemove);
    onChange(newImageUrls);
  };

  const handleUploadClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card
        className={`border-2 border-dashed transition-colors cursor-pointer ${
          dragOver
            ? "border-primary bg-primary/5"
            : disabled
              ? "border-gray-200 bg-gray-50"
              : "border-gray-300 hover:border-primary hover:bg-primary/5"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleUploadClick}
      >
        <CardContent className="flex flex-col items-center justify-center py-8">
          {uploading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
              <p className="text-sm text-gray-600">Uploading images...</p>
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 text-gray-400 mb-3" />
              <p className="text-sm font-medium text-gray-700 mb-1">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-gray-500 text-center">
                PNG, JPG, JPEG up to {maxFileSize}MB each
                <br />
                Maximum {maxImages} images
              </p>
              <Badge variant="secondary" className="mt-2">
                {value.length} / {maxImages} images
              </Badge>
            </>
          )}
        </CardContent>
      </Card>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled || uploading}
      />

      {/* Image Preview Grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {value.map((imageUrl, index) => (
            <div key={index} className="relative group">
              <Card className="overflow-hidden">
                <div className="aspect-square relative">
                  <img
                    src={imageUrl}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback for broken images
                      const target = e.target as HTMLImageElement;
                      target.src =
                        "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y3ZjdmNyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIxNHB4IiBmaWxsPSIjOTk5Ij5JbWFnZSBFcnJvcjwvdGV4dD48L3N2Zz4=";
                    }}
                  />

                  {/* Remove button */}
                  {!disabled && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(index);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}

                  {/* Primary image indicator */}
                  {index === 0 && (
                    <Badge className="absolute bottom-2 left-2 text-xs">
                      Featured
                    </Badge>
                  )}
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Helper text */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <AlertCircle className="h-4 w-4" />
        <span>
          {value.length === 0
            ? "Add images to showcase your business. The first image will be used as the featured image."
            : `${value.length} image(s) uploaded. The first image is your featured image.`}
        </span>
      </div>
    </div>
  );
}
