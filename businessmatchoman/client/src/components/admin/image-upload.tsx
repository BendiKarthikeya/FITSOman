import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ImageIcon, Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { refreshSettings } from "@/hooks/use-settings";
import { apiRequest, queryClient } from "@/lib/queryClient";
import imageCompression from "browser-image-compression";

interface ImageUploadProps {
  settingKey: string;
  currentValue?: string;
  onImageChange: (key: string, value: string) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  settingKey,
  currentValue,
  onImageChange,
  label,
  description,
  disabled = false,
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentValue || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate file type
    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
      "image/x-icon",
    ];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please select a JPEG, PNG, GIF, WebP, SVG, or ICO image",
        variant: "destructive",
      });
      return;
    }

    // Check file size (10MB max)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    console.log(`[DEBUG] Starting upload process for ${settingKey}`);

    try {
      // Alternative approach: Use apiRequest from queryClient
      const formData = new FormData();
      formData.append("image", file);
      formData.append("settingKey", settingKey);

      // Log upload attempt details
      console.log(
        `[DEBUG] Uploading ${settingKey} image, size: ${file.size} bytes, type: ${file.type}, name: ${file.name}`,
      );

      // Get the auth token from localStorage
      const authToken = localStorage.getItem("authToken");
      if (!authToken) {
        throw new Error("Authentication token not found. Please log in again.");
      }

      // Log form data for debugging
      console.log("[DEBUG] FormData contains:");
      formData.forEach((value, key) => {
        console.log(
          `- ${key}: ${typeof value === "object" ? `File (${(value as File).name})` : value}`,
        );
      });

      // Try a different approach - create a debug test image first to verify server is working
      try {
        console.log(
          "[DEBUG] Creating test image first to verify server upload functionality",
        );
        const testResponse = await fetch("/api/admin/create-test-image", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
        });

        if (testResponse.ok) {
          const testResult = await testResponse.json();
          console.log("[DEBUG] Test image created successfully:", testResult);
        } else {
          console.warn(
            "[WARN] Test image creation failed:",
            await testResponse.text(),
          );
        }
      } catch (testError) {
        console.error("[ERROR] Error creating test image:", testError);
      }

      // Now try the actual upload with improved headers
      const uploadResponse = await fetch("/api/admin/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          // Skip content-type header for multipart/form-data
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        console.error(
          `[ERROR] Upload failed with status ${uploadResponse.status}`,
        );
        let errorText = await uploadResponse.text();
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.message || "Upload failed");
        } catch (e) {
          throw new Error(
            `Upload failed with status ${uploadResponse.status}: ${errorText}`,
          );
        }
      }

      // Parse the response
      const result = await uploadResponse.json();
      console.log("[DEBUG] Server upload response:", result);

      if (result.url) {
        // Generate a stronger cache-busting URL with both timestamp and random value
        const timestamp = Date.now();
        const randomVal = Math.random().toString(36).substring(2, 15);
        const cacheBuster = `${timestamp}-${randomVal}`;
        const cacheUrl = `${result.url}?nocache=${cacheBuster}`;
        console.log(
          `[DEBUG] Image uploaded successfully for ${settingKey}, URL: ${cacheUrl}`,
        );

        // Create an actual Image object to preload and verify the image loads
        const preloadImage = new Image();
        preloadImage.onload = () => {
          console.log(`[DEBUG] Image successfully preloaded for ${settingKey}`);
        };
        preloadImage.onerror = (err) => {
          console.error(
            `[ERROR] Failed to preload image for ${settingKey}:`,
            err,
          );
          // Try with a direct URL as fallback
          const directUrl = `/uploads/${result.url.split("/").pop()}?direct=true&t=${timestamp}`;
          console.log(`[DEBUG] Attempting with direct URL: ${directUrl}`);
          preloadImage.src = directUrl;
        };
        preloadImage.src = cacheUrl;

        // Update the preview with the cache-busting URL
        setPreview(cacheUrl);

        // Use the result directly from the server, which should already have updated the setting
        console.log(`[DEBUG] Setting ${settingKey} updated during upload`);

        // Force client cache invalidation - more aggressive approach
        queryClient.removeQueries({ queryKey: ["/api/admin/settings"] });
        queryClient.removeQueries({ queryKey: ["/api/settings"] });
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
          queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
        }, 100);

        // Also call the parent's handler with the cache-busting URL to ensure it's used everywhere
        onImageChange(settingKey, cacheUrl);

        toast({
          title: "Image uploaded successfully",
          description: "The image has been uploaded and saved",
        });

        // Force a full refresh of all settings
        setTimeout(() => {
          console.log(
            `[DEBUG] Force refreshing all settings for ${settingKey}`,
          );
          refreshSettings();

          // Invalidate queries to refresh settings data without page reload
          queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
          queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
        }, 500);
      } else {
        throw new Error("Server did not return a valid image URL");
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Error uploading image",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-medium">{label}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      {preview ? (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="relative">
              <img
                src={preview}
                alt={label}
                className="w-full h-48 object-contain bg-accent/10"
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center h-48 bg-accent/10">
            <div className="text-center text-muted-foreground">
              <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No image uploaded</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled || uploading}
        />

        <Button
          type="button"
          variant="outline"
          onClick={handleButtonClick}
          disabled={disabled || uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              {preview ? "Change Image" : "{t('admin.uploadImage')}"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ImageUpload;
