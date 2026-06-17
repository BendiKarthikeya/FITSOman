import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useRTL } from "@/hooks/use-rtl";
import {
  ChevronLeft,
  ShieldCheck,
  Info,
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import AdminLayout from "@/components/layout/admin-layout";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";


// Type for KYC application data
interface KycDoc {
  id: number;
  userId: number;
  type: string;
  fileUrl: string;
  fileName?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

interface Kyc {
  id: number;
  userId: number;
  status: "pending" | "approved" | "rejected";
  idType: string;
  idNumber: string;
  nationality: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  idProofUrl?: string;
  addressProofUrl?: string;
  businessLicenseUrl?: string;
  rejectionReason?: string;
  reviewedBy?: number;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: number;
    username: string;
    email: string;
    fullName: string;
  };
}

interface KycDetailsDialogProps {
  kyc: Kyc | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  isApproving?: boolean;
  isRejecting?: boolean;
}

const KycDetailsDialog = ({
  kyc,
  isOpen,
  onClose,
  onApprove,
  onReject,
  isApproving = false,
  isRejecting = false,
}: KycDetailsDialogProps) => {
  const { t } = useTranslation();
  const { isRtl, rtlClass } = useRTL();
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  if (!kyc) return null;

  const renderDocumentLink = (url?: string, label = t('admin.kyc.viewDocument')) => {
    if (!url)
      return <p className={`text-sm text-gray-500 ${isRtl ? 'font-arabic' : ''}`}>{t('admin.kyc.noDocumentProvided')}</p>;

    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
      >
        <FileText className="w-4 h-4 mr-1" />
        {label}
        <ExternalLink className="w-3 h-3 ml-1" />
      </a>
    );
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
          setShowRejectForm(false);
          setRejectReason("");
        }
      }}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className={isRtl ? 'font-arabic text-right' : ''}>{t('admin.kyc.applicationDetails')}</DialogTitle>
          <DialogDescription className={isRtl ? 'font-arabic text-right' : ''}>
            {t('admin.kyc.reviewInformation')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div>
            <h3 className={`font-semibold mb-2 ${isRtl ? 'font-arabic text-right' : ''}`}>{t('admin.kyc.personalInformation')}</h3>
            <div className="space-y-2">
              <p className="text-sm">
                <span className={`font-medium ${isRtl ? 'font-arabic' : ''}`}>{t('admin.kyc.fullName')}:</span>{" "}
                <span className={isRtl ? 'font-arabic' : ''}>{kyc.user?.fullName}</span>
              </p>
              <p className="text-sm">
                <span className={`font-medium ${isRtl ? 'font-arabic' : ''}`}>{t('admin.kyc.email')}:</span> <span className={isRtl ? 'font-arabic' : ''}>{kyc.user?.email}</span>
              </p>
              <p className="text-sm">
                <span className={`font-medium ${isRtl ? 'font-arabic' : ''}`}>{t('admin.kyc.username')}:</span>{" "}
                <span className={isRtl ? 'font-arabic' : ''}>{kyc.user?.username}</span>
              </p>
              <p className="text-sm">
                <span className={`font-medium ${isRtl ? 'font-arabic' : ''}`}>{t('admin.kyc.idType')}:</span> <span className={isRtl ? 'font-arabic' : ''}>{kyc.idType}</span>
              </p>
              <p className="text-sm">
                <span className={`font-medium ${isRtl ? 'font-arabic' : ''}`}>{t('admin.kyc.idNumber')}:</span> <span className={isRtl ? 'font-arabic' : ''}>{kyc.idNumber}</span>
              </p>
              <p className="text-sm">
                <span className={`font-medium ${isRtl ? 'font-arabic' : ''}`}>{t('admin.kyc.nationality')}:</span>{" "}
                <span className={isRtl ? 'font-arabic' : ''}>{kyc.nationality}</span>
              </p>
            </div>

            <h3 className={`font-semibold mt-4 mb-2 ${isRtl ? 'font-arabic text-right' : ''}`}>{t('admin.kyc.addressInformation')}</h3>
            <div className="space-y-2">
              <p className="text-sm">
                <span className={`font-medium ${isRtl ? 'font-arabic' : ''}`}>{t('admin.kyc.address')}:</span> <span className={isRtl ? 'font-arabic' : ''}>{kyc.addressLine1}</span>
              </p>
              {kyc.addressLine2 && (
                <p className="text-sm">{kyc.addressLine2}</p>
              )}
              <p className="text-sm">
                {kyc.city}, {kyc.region} {kyc.postalCode}
              </p>
              <p className="text-sm">{kyc.country}</p>
            </div>
          </div>

          <div>
            <h3 className={`font-semibold mb-2 ${isRtl ? 'font-arabic text-right' : ''}`}>{t('admin.kyc.currentStatus')}</h3>
            <div className="mb-4">
              {kyc.status === "pending" && (
                <Badge
                  variant="outline"
                  className="bg-yellow-100 text-yellow-800"
                >
                  {t('admin.kyc.pending')}
                </Badge>
              )}
              {kyc.status === "approved" && (
                <Badge
                  variant="outline"
                  className="bg-green-100 text-green-800"
                >
                  {t('admin.kyc.approved')}
                </Badge>
              )}
              {kyc.status === "rejected" && (
                <Badge variant="outline" className="bg-red-100 text-red-800">
                  {t('admin.kyc.rejected')}
                </Badge>
              )}
            </div>

            <h3 className={`font-semibold mb-2 ${isRtl ? 'font-arabic text-right' : ''}`}>{t('admin.kyc.submitted')}</h3>
            <p className="text-sm mb-4">
              {formatDistanceToNow(new Date(kyc.createdAt), {
                addSuffix: true,
              })}
            </p>

            {kyc.status === "rejected" && kyc.rejectionReason && (
              <div className="mb-4">
                <h3 className={`font-semibold mb-2 ${isRtl ? 'font-arabic text-right' : ''}`}>{t('admin.kyc.rejectionReason')}</h3>
                <p className="text-sm bg-red-50 text-red-800 p-2 rounded">
                  {kyc.rejectionReason}
                </p>
              </div>
            )}

            <h3 className={`font-semibold mb-2 ${isRtl ? 'font-arabic text-right' : ''}`}>{t('admin.kyc.verificationDocuments')}</h3>
            <div className="space-y-2">
              <div>
                {renderDocumentLink(kyc.idDocumentUrl, t('admin.kyc.idProofDocument'))}
              </div>
              <div>
                {renderDocumentLink(
                  kyc.addressProofUrl,
                  t('admin.kyc.addressProofDocument'),
                )}
              </div>
              <div>
                {renderDocumentLink(kyc.businessLicenseUrl, t('admin.kyc.businessLicense'))}
              </div>
            </div>
          </div>
        </div>

        {showRejectForm ? (
          <div className="space-y-4">
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t('admin.kyc.rejectionPlaceholder')}
              className="min-h-[100px]"
            />

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowRejectForm(false)}
              >
                {t('admin.kyc.cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (rejectReason.trim()) {
                    onReject(rejectReason);
                  }
                }}
                disabled={!rejectReason.trim() || isApproving || isRejecting}
                className={isRejecting ? "opacity-60" : ""}
              >
                {isRejecting ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : null}
                {isRejecting ? t('admin.kyc.rejecting') : t('admin.kyc.confirmRejection')}
              </Button>
            </div>
          </div>
        ) : (
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button variant="outline" onClick={onClose}>
              {t('admin.kyc.close')}
            </Button>
            <div className="flex space-x-2">
              <Button
                variant="destructive"
                onClick={() => setShowRejectForm(true)}
                disabled={kyc.status === "rejected"}
              >
                <XCircle className="mr-1 h-4 w-4" />
                {t('admin.kyc.reject')}
              </Button>
              <Button
                variant="default"
                onClick={onApprove}
                disabled={kyc.status === "approved" || isApproving || isRejecting}
                className={isApproving ? "opacity-60" : ""}
              >
                {isApproving ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-1 h-4 w-4" />
                )}
                {isApproving ? t('admin.kyc.approving') : t('admin.kyc.approve')}
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default function AdminKycPage() {
  const { t } = useTranslation();
  const { isRtl, rtlClass } = useRTL();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedKyc, setSelectedKyc] = useState<Kyc | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch KYC applications filtered by status
  const {
    data: kycRequests,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["/api/admin/kyc", activeTab],
    queryFn: async () => {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `/api/admin/kyc${activeTab !== "all" ? `?status=${activeTab}` : ""}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        },
      );
      if (!response.ok) {
        throw new Error(t('admin.kyc.fetchFailed'));
      }
      return response.json();
    },
  });

  // Approve KYC mutation
  const approveMutation = useMutation({
    mutationFn: async (kycId: number) => {
      const res = await apiRequest("PATCH", `/api/admin/kyc/${kycId}/approve`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/kyc"] });
      toast({
        title: t('admin.kyc.kycApproved'),
        description: t('admin.kyc.approvedSuccessfully'),
        variant: "default",
      });
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: t('admin.kyc.approvalFailed'),
        description:
          error.message || t('admin.kyc.approvalFailedMessage'),
        variant: "destructive",
      });
    },
  });

  // Reject KYC mutation
  const rejectMutation = useMutation({
    mutationFn: async ({
      kycId,
      reason,
    }: {
      kycId: number;
      reason: string;
    }) => {
      const res = await apiRequest("PATCH", `/api/admin/kyc/${kycId}/reject`, {
        reason,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/kyc"] });
      toast({
        title: t('admin.kyc.kycRejected'),
        description: t('admin.kyc.rejectedSuccessfully'),
        variant: "default",
      });
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: t('admin.kyc.rejectionFailed'),
        description: error.message || t('admin.kyc.rejectionFailedMessage'),
        variant: "destructive",
      });
    },
  });

  const handleViewDetails = (kyc: Kyc) => {
    setSelectedKyc(kyc);
    setIsDialogOpen(true);
  };

  const handleApprove = () => {
    if (selectedKyc) {
      approveMutation.mutate(selectedKyc.id);
    }
  };

  const handleReject = (reason: string) => {
    if (selectedKyc) {
      rejectMutation.mutate({ kycId: selectedKyc.id, reason });
    }
  };

  const handleBack = () => {
    setLocation("/admin");
  };

  // Render status badge based on KYC status
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className={`bg-yellow-100 text-yellow-800 ${isRtl ? 'font-arabic' : ''}`}>
            {t('admin.kyc.pending')}
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className={`bg-green-100 text-green-800 ${isRtl ? 'font-arabic' : ''}`}>
            {t('admin.kyc.approved')}
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className={`bg-red-100 text-red-800 ${isRtl ? 'font-arabic' : ''}`}>
            {t('admin.kyc.rejected')}
          </Badge>
        );
      default:
        return <Badge variant="outline" className={isRtl ? 'font-arabic' : ''}>{t('admin.kyc.unknown')}</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <Button
                variant="outline"
                size="sm"
                className="border-primary text-primary hover:bg-primary hover:text-white"
                onClick={handleBack}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                {t('admin.kyc.backToDashboard')}
              </Button>
            </div>
            <h1 className={`text-3xl font-bold text-foreground ${isRtl ? 'font-arabic text-right' : ''}`}>
              {t('admin.kyc.title')}
            </h1>
            <p className={`text-muted-foreground mt-1 ${isRtl ? 'font-arabic text-right' : ''}`}>
              {t('admin.kyc.subtitle')}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className={`flex items-center ${isRtl ? 'font-arabic' : ''}`}>
                <ShieldCheck className={`w-5 h-5 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                {t('admin.kyc.kycRequests')}
              </CardTitle>
              <Tabs
                defaultValue="pending"
                value={activeTab}
                onValueChange={setActiveTab}
              >
                <TabsList>
                  <TabsTrigger value="pending" className={isRtl ? 'font-arabic' : ''}>{t('admin.kyc.pending')}</TabsTrigger>
                  <TabsTrigger value="approved" className={isRtl ? 'font-arabic' : ''}>{t('admin.kyc.approved')}</TabsTrigger>
                  <TabsTrigger value="rejected" className={isRtl ? 'font-arabic' : ''}>{t('admin.kyc.rejected')}</TabsTrigger>
                  <TabsTrigger value="all" className={isRtl ? 'font-arabic' : ''}>{t('admin.kyc.all')}</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ||
            approveMutation.isPending ||
            rejectMutation.isPending ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
                          <div className="space-y-2">
                            <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
                          <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                          <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : error ? (
              <div className="py-8 text-center">
                <p className={`text-red-500 ${isRtl ? 'font-arabic text-right' : ''}`}>{t('admin.kyc.errorLoading')}</p>
                <p className={`mt-2 text-sm text-gray-500 ${isRtl ? 'font-arabic text-right' : ''}`}>
                  {t('admin.kyc.pleaseRetry')}
                </p>
              </div>
            ) : kycRequests && kycRequests.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className={`py-3 px-2 ${isRtl ? 'text-right' : 'text-left'} font-medium text-sm ${isRtl ? 'font-arabic' : ''}`}>
                        {t('admin.kyc.user')}
                      </th>
                      <th className={`py-3 px-2 ${isRtl ? 'text-right' : 'text-left'} font-medium text-sm ${isRtl ? 'font-arabic' : ''}`}>
                        {t('admin.kyc.idType')}
                      </th>
                      <th className={`py-3 px-2 ${isRtl ? 'text-right' : 'text-left'} font-medium text-sm ${isRtl ? 'font-arabic' : ''}`}>
                        {t('admin.kyc.country')}
                      </th>
                      <th className={`py-3 px-2 ${isRtl ? 'text-right' : 'text-left'} font-medium text-sm ${isRtl ? 'font-arabic' : ''}`}>
                        {t('admin.kyc.status')}
                      </th>
                      <th className={`py-3 px-2 ${isRtl ? 'text-right' : 'text-left'} font-medium text-sm ${isRtl ? 'font-arabic' : ''}`}>
                        {t('admin.kyc.submitted')}
                      </th>
                      <th className={`py-3 px-2 ${isRtl ? 'text-left' : 'text-right'} font-medium text-sm ${isRtl ? 'font-arabic' : ''}`}>
                        {t('admin.kyc.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {kycRequests.map((kyc: Kyc) => (
                      <tr key={kyc.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2 text-sm">
                          <span className={isRtl ? 'font-arabic' : ''}>{kyc.user?.fullName || t('admin.kyc.unknownUser')}</span>
                          {kyc.user?.email && (
                            <div className="text-xs text-gray-500">
                              {kyc.user.email}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-2 text-sm">{kyc.idType}</td>
                        <td className="py-3 px-2 text-sm">{kyc.country}</td>
                        <td className="py-3 px-2 text-sm">
                          {renderStatusBadge(kyc.status)}
                        </td>
                        <td className="py-3 px-2 text-sm">
                          {formatDistanceToNow(new Date(kyc.createdAt), {
                            addSuffix: true,
                          })}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(kyc)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {t('admin.kyc.details')}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-10 text-center">
                <Info className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className={`text-muted-foreground ${isRtl ? 'font-arabic text-right' : ''}`}>
                  {t('admin.kyc.noApplicationsFound', { status: activeTab !== "all" ? t(`admin.kyc.${activeTab}`) : "" })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <KycDetailsDialog
        kyc={selectedKyc}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onApprove={handleApprove}
        onReject={handleReject}
        isApproving={approveMutation.isPending}
        isRejecting={rejectMutation.isPending}
      />
    </AdminLayout>
  );
}
