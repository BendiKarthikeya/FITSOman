import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Download, Loader2 } from "lucide-react";
import { Document } from "@shared/schema";
import { useTranslation } from "react-i18next";
import { useRTL } from "@/hooks/use-rtl";

interface DocumentsSectionProps {
  listingId: number;
}

export function DocumentsSection({ listingId }: DocumentsSectionProps) {
  const { t } = useTranslation();
  const { isRtl } = useRTL();
  
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: ["/api/listings", listingId, "documents"],
    queryFn: async () => {
      const response = await fetch(`/api/listings/${listingId}/documents`);
      if (!response.ok) {
        throw new Error("Failed to fetch documents");
      }
      return response.json();
    },
  });

  const downloadDocument = (doc: Document) => {
    window.open(doc.fileUrl, "_blank");
  };

  if (isLoading) {
    return (
      <div>
        <h2 className={`text-xl font-bold text-gray-900 mb-4 ${isRtl ? 'font-arabic text-right' : ''}`}>
          {t('listingDetails.documents.title')}
        </h2>
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className={`ml-2 text-gray-500 ${isRtl ? 'font-arabic' : ''}`}>
            {t('common.loading')}...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className={`text-xl font-bold text-gray-900 mb-4 ${isRtl ? 'font-arabic text-right' : ''}`}>
        {t('listingDetails.documents.title')}
      </h2>

      {documents && documents.length > 0 ? (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className={`flex items-center justify-between p-3 border border-gray-200 rounded-lg ${isRtl ? 'flex-row-reverse' : ''}`}
            >
              <div className={`flex items-center ${isRtl ? 'flex-row-reverse' : ''}`}>
                <FileText className={`h-5 w-5 text-gray-400 ${isRtl ? 'ml-3' : 'mr-3'}`} />
                <div className={isRtl ? 'text-right' : ''}>
                  <p className={`font-medium text-gray-900 ${isRtl ? 'font-arabic' : ''}`}>{doc.name}</p>
                  <p className={`text-sm text-gray-500 ${isRtl ? 'font-arabic' : ''}`}>
                    {formatFileSize(doc.fileSize)} • {t('common.uploaded')}{" "}
                    {doc.uploadedAt
                      ? new Date(doc.uploadedAt).toLocaleDateString()
                      : t('common.recently')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => downloadDocument(doc)}
                className={`text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center space-x-1 ${isRtl ? 'font-arabic flex-row-reverse' : ''}`}
              >
                <Download className="h-4 w-4" />
                <span>{t('common.download')}</span>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className={`text-center py-8 bg-gray-50 rounded-lg ${isRtl ? 'font-arabic' : ''}`}>
          <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">
            {t('listingDetails.documents.noDocuments')}
          </p>
          <p className="text-sm text-gray-400">
            {t('listingDetails.documents.contactForMore')}
          </p>
        </div>
      )}
    </div>
  );
}
