import React, { useState } from "react";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Document } from "@shared/schema";

interface DocumentUploadProps {
  listingId?: number;
  onDocumentUploaded?: (document: Document) => void;
  onDocumentDeleted?: (documentId: number) => void;
  documents?: Document[];
  showTitle?: boolean;
}

export function DocumentUpload({
  listingId,
  onDocumentUploaded,
  onDocumentDeleted,
  documents = [],
  showTitle = true,
}: DocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [documentName, setDocumentName] = useState("");
  const { toast } = useToast();
  const { t } = useTranslation();

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "image/jpeg",
      "image/png",
      "image/jpg",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: t('alerts.upload.invalidFileType'),
        description: t('alerts.upload.validImageTypes'),
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: t('alerts.upload.fileTooLarge'),
        description: t('alerts.upload.fileSizeLimit'),
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("document", file);
      formData.append("name", documentName || file.name);
      if (listingId) {
        formData.append("listingId", listingId.toString());
      }

      // Get the JWT token from localStorage
      const token = localStorage.getItem("authToken");
      const headers: Record<string, string> = {};

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upload document");
      }

      const result = await response.json();

      toast({
        title: t('alerts.upload.uploadSuccess'),
        description: t('alerts.upload.uploadSuccessDesc'),
      });

      // Reset form
      setDocumentName("");
      event.target.value = "";

      // Notify parent component
      if (onDocumentUploaded && result.document) {
        onDocumentUploaded(result.document);
      }
    } catch (error: any) {
      console.error("Document upload error:", error);
      toast({
        title: t('alerts.upload.uploadFailed'),
        description: error.message || t('alerts.upload.uploadFailedDesc'),
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId: number) => {
    try {
      // Get the JWT token from localStorage
      const token = localStorage.getItem("authToken");
      const headers: Record<string, string> = {};

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete document");
      }

      toast({
        title: t('alerts.upload.documentDeleted'),
        description: t('alerts.upload.documentDeletedDesc'),
      });

      // Notify parent component
      if (onDocumentDeleted) {
        onDocumentDeleted(documentId);
      }
    } catch (error: any) {
      console.error("Document deletion error:", error);
      toast({
        title: t('alerts.upload.deleteFailed'),
        description: error.message || t('alerts.upload.uploadFailedDesc'),
        variant: "destructive",
      });
    }
  };

  const downloadDocument = async (doc: Document) => {
    try {
      // Fetch the file as a blob to force download
      const response = await fetch(doc.fileUrl);
      const blob = await response.blob();

      // Create a blob URL and download link
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = doc.name || "document"; // This forces download

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
      toast({
        title: t('alerts.upload.downloadFailed'),
        description: t('alerts.upload.downloadFailedDesc'),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      {showTitle && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Documents & Resources</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Upload relevant business documents such as financial statements,
            business plans, certificates, etc.
          </p>
        </div>
      )}

      {/* Upload Form */}
      <div className="border rounded-lg p-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="document-name">Document Name (Optional)</Label>
          <Input
            id="document-name"
            placeholder="Enter a descriptive name for your document"
            value={documentName}
            onChange={(e) => setDocumentName(e.target.value)}
            disabled={isUploading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="document-file">Choose Document</Label>
          <div className="flex items-center justify-center w-full">
            <label
              htmlFor="document-file"
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {isUploading ? (
                  <>
                    <Loader2 className="w-8 h-8 mb-2 text-gray-500 animate-spin" />
                    <p className="text-sm text-gray-500">Uploading...</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 mb-2 text-gray-500" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or
                      drag and drop
                    </p>
                    <p className="text-xs text-gray-500">
                      PDF, DOC, DOCX, TXT, or image files (Max 10MB)
                    </p>
                  </>
                )}
              </div>
              <input
                id="document-file"
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isUploading}
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Documents List */}
      {documents && documents.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium">Uploaded Documents</h4>
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50"
            >
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">{doc.name}</p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(doc.fileSize)} •{" "}
                    {doc.uploadedAt
                      ? new Date(doc.uploadedAt).toLocaleDateString()
                      : "Recently uploaded"}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => downloadDocument(doc)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Download
                </Button>
                {onDocumentDeleted && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteDocument(doc.id)}
                    className="text-red-600 hover:text-red-800 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
