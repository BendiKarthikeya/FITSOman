import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Users,
  FileText,
  Clock,
  Shield,
  AlertTriangle,
  ArrowLeftCircle,
  ListFilter,
  FileCheck,
  Settings,
  CheckCircle,
  XCircle,
  Eye,
  Loader2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useRTL } from "@/hooks/use-rtl";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/layout/admin-layout";

interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  company?: string;
  verificationStatus: string;
  createdAt: string;
}

interface KYC {
  id: number;
  userId: number;
  status: string;
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

interface KYCDoc {
  id: number;
  userId: number;
  documentType: string;
  status: string;
  uploadedAt: string;
  rejectionReason?: string;
}

interface Listing {
  id: number;
  userId: number;
  title: string;
  status: string;
  category: string;
  createdAt: string;
  rejectionReason?: string;
}

interface Analytics {
  users: {
    total: number;
    active: number;
    blocked: number;
    admin: number;
    verified: number;
    newThisWeek: number;
    byRole: {
      entrepreneur: number;
      investor: number;
      broker: number;
    };
  };
  listings: {
    total: number;
    avgTimeToApproval: string;
    byStatus: {
      pending: number;
      approved: number;
      rejected: number;
      archived: number;
    };
  };
  kyc: {
    pending: number;
    approved: number;
    rejected: number;
  };

}

export default function AdminDashboardPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { isRtl, rtlClass } = useRTL();

  // State for dialogs
  const [rejectionReason, setRejectionReason] = useState("");
  const [kycDocRejectionReason, setKycDocRejectionReason] = useState("");
  const [listingRejectionReason, setListingRejectionReason] = useState("");
  const [blockReason, setBlockReason] = useState("");

  // Fetch analytics data
  const {
    data: analytics,
    isLoading: isLoadingAnalytics,
    error: analyticsError,
  } = useQuery<Analytics>({
    queryKey: ["/api/admin/analytics"],
  });

  // Fetch pending KYC applications
  const {
    data: pendingKycs = [],
    isLoading: isLoadingKycs,
    error: kycError,
  } = useQuery<KYC[]>({
    queryKey: ["/api/admin/kyc", "pending"],
  });

  // Fetch pending KYC documents
  const {
    data: pendingKycDocs = [],
    isLoading: isLoadingKycDocs,
    error: kycDocsError,
  } = useQuery<KYCDoc[]>({
    queryKey: ["/api/admin/kyc/docs", "pending"],
  });

  // Fetch pending listings
  const {
    data: pendingListings = [],
    isLoading: isLoadingListings,
    error: listingsError,
  } = useQuery<Listing[]>({
    queryKey: ["/api/admin/listings", "pending"],
  });

  // Fetch users data
  const {
    data: users = [],
    isLoading: isLoadingUsers,
    error: usersError,
  } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  // Helper functions
  const getUserById = (userId: number) =>
    Array.isArray(users) ? users.find((u: User) => u.id === userId) : undefined;
  const activeUsers = Array.isArray(users)
    ? users.filter((u: User) => u.role !== "blocked" && u.role !== "admin")
    : [];
  const blockedUsers = Array.isArray(users)
    ? users.filter((u: User) => u.role === "blocked")
    : [];

  const getRoleBadge = (role: string) => {
    const colors = {
      entrepreneur: "bg-blue-100 text-blue-800",
      investor: "bg-green-100 text-green-800",
      broker: "bg-purple-100 text-purple-800",
      admin: "bg-red-100 text-red-800",
      blocked: "bg-gray-100 text-gray-800",
    };
    return (
      <Badge
        className={
          colors[role as keyof typeof colors] || "bg-gray-100 text-gray-800"
        }
      >
        {t(`admin.roles.${role}`)}
      </Badge>
    );
  };

  const getVerificationStatus = (status: string) => {
    const colors = {
      verified: "text-green-600",
      pending: "text-yellow-600",
      rejected: "text-red-600",
      unverified: "text-gray-600",
    };
    return (
      <span
        className={colors[status as keyof typeof colors] || "text-gray-600"}
      >
        {t(`admin.verificationStatuses.${status}`)}
      </span>
    );
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels = {
      national_id: t('admin.documentTypes.nationalId'),
      passport: t('admin.documentTypes.passport'),
      business_license: t('admin.documentTypes.businessLicense'),
      tax_certificate: t('admin.documentTypes.taxCertificate'),
      bank_statement: t('admin.documentTypes.bankStatement'),
    };
    return labels[type as keyof typeof labels] || type;
  };

  // Mutation functions
  const approveMutation = useMutation({
    mutationFn: (kycId: number) =>
      fetch(`/api/admin/kyc/${kycId}/approve`, { method: "PATCH" }).then(
        (res) => res.json(),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/kyc"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics"] });
      toast({ title: t('admin.toasts.kycApproved') });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ kycId, reason }: { kycId: number; reason: string }) =>
      fetch(`/api/admin/kyc/${kycId}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionReason: reason }),
      }).then((res) => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/kyc"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics"] });
      toast({ title: t('admin.toasts.kycRejected') });
    },
  });

  const approveKycDocMutation = useMutation({
    mutationFn: (docId: number) =>
      fetch(`/api/admin/kyc/docs/${docId}/approve`, { method: "PATCH" }).then(
        (res) => res.json(),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/kyc/docs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics"] });
      toast({ title: t('admin.toasts.documentApproved') });
    },
  });

  const rejectKycDocMutation = useMutation({
    mutationFn: ({ docId, reason }: { docId: number; reason: string }) =>
      fetch(`/api/admin/kyc/docs/${docId}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionReason: reason }),
      }).then((res) => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/kyc/docs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics"] });
      toast({ title: t('admin.toasts.documentRejected') });
    },
  });

  const approveListingMutation = useMutation({
    mutationFn: (listingId: number) =>
      fetch(`/api/admin/listings/${listingId}/approve`, {
        method: "PATCH",
      }).then((res) => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/listings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics"] });
      toast({ title: t('admin.toasts.listingApproved') });
    },
  });

  const rejectListingMutation = useMutation({
    mutationFn: ({
      listingId,
      reason,
    }: {
      listingId: number;
      reason: string;
    }) =>
      fetch(`/api/admin/listings/${listingId}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionReason: reason }),
      }).then((res) => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/listings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics"] });
      toast({ title: t('admin.toasts.listingRejected') });
    },
  });

  const blockUserMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: number; reason: string }) =>
      fetch(`/api/admin/users/${userId}/block`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      }).then((res) => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics"] });
      toast({ title: t('admin.toasts.userBlocked') });
    },
  });

  const unblockUserMutation = useMutation({
    mutationFn: (userId: number) =>
      fetch(`/api/admin/users/${userId}/unblock`, { method: "PATCH" }).then(
        (res) => res.json(),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics"] });
      toast({ title: t('admin.toasts.userUnblocked') });
    },
  });

  // Handler functions
  const handleApprove = (kycId: number) => approveMutation.mutate(kycId);
  const handleReject = (kycId: number, reason: string) => {
    if (!reason.trim()) {
      toast({
        title: t('admin.toasts.provideRejectionReason'),
        variant: "destructive",
      });
      return;
    }
    rejectMutation.mutate({ kycId, reason });
    setRejectionReason("");
  };

  const handleApproveKycDoc = (docId: number) =>
    approveKycDocMutation.mutate(docId);
  const handleRejectKycDoc = (docId: number, reason: string) => {
    if (!reason.trim()) {
      toast({
        title: t('admin.toasts.provideRejectionReason'),
        variant: "destructive",
      });
      return;
    }
    rejectKycDocMutation.mutate({ docId, reason });
    setKycDocRejectionReason("");
  };

  const handleApproveListing = (listingId: number) =>
    approveListingMutation.mutate(listingId);
  const handleRejectListing = (listingId: number, reason: string) => {
    if (!reason.trim()) {
      toast({
        title: t('admin.toasts.provideRejectionReason'),
        variant: "destructive",
      });
      return;
    }
    rejectListingMutation.mutate({ listingId, reason });
    setListingRejectionReason("");
  };

  const handleBlockUser = (userId: number, reason: string) => {
    if (!reason.trim()) {
      toast({ title: t('admin.toasts.provideBlockReason'), variant: "destructive" });
      return;
    }
    blockUserMutation.mutate({ userId, reason });
    setBlockReason("");
  };

  const handleUnblockUser = (userId: number) =>
    unblockUserMutation.mutate(userId);

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold break-words">{t('admin.title')}</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            {t('admin.subtitle')}
          </p>
        </div>

        <Link href="/" className="flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="border-primary text-primary hover:bg-primary hover:text-white flex items-center gap-2 w-full sm:w-auto"
          >
            <ArrowLeftCircle className="h-4 w-4" />
            <span className="font-medium hidden sm:inline">{t('admin.returnToDashboard')}</span>
            <span className="font-medium sm:hidden">{t('admin.back')}</span>
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="analytics">
        <div className="mb-6 overflow-x-auto">
          <TabsList className="flex-nowrap">
            <TabsTrigger value="analytics" className="flex-shrink-0">
              <FileText className="mr-1 sm:mr-2 h-4 w-4" /> 
              <span className="hidden sm:inline">{t('admin.analytics')}</span>
              <span className="sm:hidden">{t('admin.stats')}</span>
            </TabsTrigger>
            <TabsTrigger value="kyc" className="flex-shrink-0">
              <Clock className="mr-1 sm:mr-2 h-4 w-4" /> 
              <span className="hidden sm:inline">{t('admin.kycApprovals')}</span>
              <span className="sm:hidden">{t('admin.dashboard.tabs.kyc')}</span>
            </TabsTrigger>
            <TabsTrigger value="kyc_docs" className="flex-shrink-0">
              <FileCheck className="mr-1 sm:mr-2 h-4 w-4" /> 
              <span className="hidden sm:inline">{t('admin.kycDocuments')}</span>
              <span className="sm:hidden">{t('admin.docs')}</span>
            </TabsTrigger>
            <TabsTrigger value="listings" className="flex-shrink-0">
              <ListFilter className="mr-1 sm:mr-2 h-4 w-4" /> 
              <span className="hidden sm:inline">{t('admin.listingModeration')}</span>
              <span className="sm:hidden">{t('admin.lists')}</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex-shrink-0">
              <Users className="mr-1 sm:mr-2 h-4 w-4" /> 
              <span className="hidden sm:inline">{t('admin.userManagement')}</span>
              <span className="sm:hidden">{t('admin.users')}</span>
            </TabsTrigger>
            <TabsTrigger value="blocked_users" className="flex-shrink-0">
              <Shield className="mr-1 sm:mr-2 h-4 w-4" /> 
              <span className="hidden sm:inline">{t('admin.blockedUsers')}</span>
              <span className="sm:hidden">{t('admin.blocked')}</span>
            </TabsTrigger>
            <Link href="/admin/settings">
              <Button variant="ghost" size="sm" className="ml-2 sm:ml-4 flex-shrink-0">
                <Settings className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">{t('admin.layout.settings')}</span>
              </Button>
            </Link>
          </TabsList>
        </div>

        <TabsContent value="analytics">
          {/* Key Metrics Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {/* Total Users */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('admin.totalUsers')}</p>
                    <p className="text-2xl font-bold">
                      {analytics?.users.total || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Listings */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t('admin.totalListings')}
                    </p>
                    <p className="text-2xl font-bold">
                      {analytics?.listings.total || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pending KYCs */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t('admin.pendingKycs')}
                    </p>
                    <p className="text-2xl font-bold">
                      {analytics?.kyc.pending || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* User Breakdown */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  {t('admin.userAnalytics')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoadingAnalytics ? (
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                ) : (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t('admin.activeUsers')}
                      </span>
                      <span className="font-medium">
                        {analytics?.users.active || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t('admin.entrepreneurs')}
                      </span>
                      <span className="font-medium">
                        {analytics?.users.byRole.entrepreneur || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className={`text-muted-foreground ${isRtl ? 'font-arabic' : ''}`}>{t('admin.investors')}</span>
                      <span className="font-medium">
                        {analytics?.users.byRole.investor || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className={`text-muted-foreground ${isRtl ? 'font-arabic' : ''}`}>{t('admin.brokers')}</span>
                      <span className="font-medium">
                        {analytics?.users.byRole.broker || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className={`text-muted-foreground ${isRtl ? 'font-arabic' : ''}`}>{t('admin.verified')}</span>
                      <span className="font-medium text-green-600">
                        {analytics?.users.verified || 0}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Listing Analytics */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className={`text-lg flex items-center ${isRtl ? 'font-arabic' : ''}`}>
                  <FileText className="h-4 w-4 mr-2" />
                  {t('admin.listingStatus')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoadingAnalytics ? (
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                ) : (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className={`text-muted-foreground ${isRtl ? 'font-arabic' : ''}`}>{t('admin.approved')}</span>
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700"
                      >
                        {analytics?.listings.byStatus.approved || 0}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className={`text-muted-foreground ${isRtl ? 'font-arabic' : ''}`}>{t('admin.pending')}</span>
                      <Badge
                        variant="outline"
                        className="bg-amber-50 text-amber-700"
                      >
                        {analytics?.listings.byStatus.pending || 0}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className={`text-muted-foreground ${isRtl ? 'font-arabic' : ''}`}>{t('admin.rejected')}</span>
                      <Badge
                        variant="outline"
                        className="bg-red-50 text-red-700"
                      >
                        {analytics?.listings.byStatus.rejected || 0}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className={`text-muted-foreground ${isRtl ? 'font-arabic' : ''}`}>
                        {t('admin.averageApproval')}
                      </span>
                      <span className="font-medium">
                        {analytics?.listings.avgTimeToApproval || t('admin.notAvailable')}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Platform Activity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className={`text-lg flex items-center ${isRtl ? 'font-arabic' : ''}`}>
                  <Shield className="h-4 w-4 mr-2" />
                  {t('admin.platformHealth')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoadingAnalytics ? (
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                ) : (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className={`text-muted-foreground ${isRtl ? 'font-arabic' : ''}`}>
                        {t('admin.kycApproved')}
                      </span>
                      <span className="font-medium text-green-600">
                        {analytics?.kyc.approved || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className={`text-muted-foreground ${isRtl ? 'font-arabic' : ''}`}>{t('admin.kycPending')}</span>
                      <span className="font-medium text-amber-600">
                        {analytics?.kyc.pending || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className={`text-muted-foreground ${isRtl ? 'font-arabic' : ''}`}>
                        {t('admin.newThisWeek')}
                      </span>
                      <span className="font-medium">
                        {analytics?.users.newThisWeek || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className={`text-muted-foreground ${isRtl ? 'font-arabic' : ''}`}>
                        {t('admin.blockedUsersCount')}
                      </span>
                      <span className="font-medium text-red-600">
                        {analytics?.users.blocked || 0}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Other tab contents would continue here... */}
        <TabsContent value="kyc">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className={`text-2xl font-bold ${isRtl ? 'font-arabic' : ''}`}>{t('admin.kycApplications')}</h2>
              <Badge variant="outline" className="text-amber-600">
                {pendingKycs.length} {t('admin.pending')}
              </Badge>
            </div>

            {isLoadingKycs ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : kycError ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <p className={`text-destructive ${isRtl ? 'font-arabic' : ''}`}>
                      {t('admin.errorLoadingKyc')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : !Array.isArray(pendingKycs) || pendingKycs.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className={`text-xl font-semibold mb-2 ${isRtl ? 'font-arabic' : ''}`}>{t('admin.allCaughtUp')}</p>
                    <p className={`text-muted-foreground ${isRtl ? 'font-arabic text-right' : ''}`}>
                      {t('admin.noPendingKycApplications')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {Array.isArray(pendingKycs) &&
                  pendingKycs.map((kyc: KYC) => {
                    const user = getUserById(kyc.userId);
                    return (
                      <Card key={kyc.id}>
                        <CardContent className="p-4 sm:p-6">
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="space-y-2 min-w-0 flex-1">
                              <h3 className="font-semibold text-lg break-words">
                                {user?.fullName ||
                                  user?.username ||
                                  t('admin.unknownUser')}
                              </h3>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                                <span className={`break-all ${isRtl ? 'font-arabic' : ''}`}>{t('admin.email')}: {user?.email}</span>
                                <span className={`break-words ${isRtl ? 'font-arabic' : ''}`}>
                                  {t('admin.company')}: {user?.company || t('admin.notSpecified')}
                                </span>
                                <span className={`whitespace-nowrap ${isRtl ? 'font-arabic' : ''}`}>
                                  {t('admin.submitted')}:{" "}
                                  {new Date(
                                    kyc.submittedAt,
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-row sm:items-center gap-2 flex-shrink-0">
                              <Button
                                onClick={() => handleApprove(kyc.id)}
                                disabled={approveMutation.isPending}
                                className={`bg-green-600 hover:bg-green-700 ${isRtl ? 'font-arabic' : ''}`}
                              >
                                {approveMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4" />
                                )}
                                {t('admin.approve')}
                              </Button>

                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="destructive" className={isRtl ? 'font-arabic' : ''}>
                                    <XCircle className="h-4 w-4 mr-2" />
                                    {t('admin.reject')}
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle className={isRtl ? 'font-arabic' : ''}>
                                      {t('admin.rejectKycApplication')}
                                    </DialogTitle>
                                    <DialogDescription className={isRtl ? 'font-arabic text-right' : ''}>
                                      {t('admin.provideRejectionReason')}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <Label htmlFor="rejection-reason" className={isRtl ? 'font-arabic' : ''}>
                                      {t('admin.rejectionReason')}
                                    </Label>
                                    <Textarea
                                      id="rejection-reason"
                                      value={rejectionReason}
                                      onChange={(e) =>
                                        setRejectionReason(e.target.value)
                                      }
                                      placeholder={t('admin.enterRejectionReason')}
                                      className={isRtl ? 'font-arabic text-right' : ''}
                                    />
                                  </div>
                                  <DialogFooter>
                                    <Button
                                      onClick={() =>
                                        handleReject(kyc.id, rejectionReason)
                                      }
                                      disabled={rejectMutation.isPending}
                                      variant="destructive"
                                    >
                                      {rejectMutation.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        t('admin.reject')
                                      )}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Continue with other tabs... */}
        <TabsContent value="kyc_docs">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className={`text-2xl font-bold ${isRtl ? 'font-arabic' : ''}`}>{t('admin.kycDocuments')}</h2>
              <Badge variant="outline" className="text-amber-600">
                {Array.isArray(pendingKycDocs) ? pendingKycDocs.length : 0}{" "}
                {t('admin.pending')}
              </Badge>
            </div>

            {isLoadingKycDocs ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : kycDocsError ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <p className={`text-destructive ${isRtl ? 'font-arabic' : ''}`}>
                      {t('admin.errorLoadingKycDocs')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : !Array.isArray(pendingKycDocs) ||
              pendingKycDocs.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className={`text-xl font-semibold mb-2 ${isRtl ? 'font-arabic' : ''}`}>{t('admin.allCaughtUp')}</p>
                    <p className={`text-muted-foreground ${isRtl ? 'font-arabic text-right' : ''}`}>
                      {t('admin.noPendingKycDocs')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {Array.isArray(pendingKycDocs) &&
                  pendingKycDocs.map((doc: KYCDoc) => {
                    const user = getUserById(doc.userId);
                    return (
                      <Card key={doc.id}>
                        <CardContent className="p-4 sm:p-6">
                          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                            <div className="space-y-3 flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                <h3 className="font-semibold text-lg break-words">
                                  {getDocumentTypeLabel(doc.documentType)}
                                </h3>
                                <Badge
                                  variant="outline"
                                  className="bg-purple-50 text-purple-700 flex-shrink-0"
                                >
                                  {doc.documentType}
                                </Badge>
                              </div>

                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-muted-foreground">
                                <span className={`break-words ${isRtl ? 'font-arabic' : ''}`}>
                                  {t('admin.user')}:{" "}
                                  {user?.fullName ||
                                    user?.username ||
                                    t('admin.unknownUser')}
                                </span>
                                <span className={`break-all ${isRtl ? 'font-arabic' : ''}`}>{t('admin.email')}: {user?.email || t('admin.noEmail')}</span>
                                <span className={`whitespace-nowrap ${isRtl ? 'font-arabic' : ''}`}>
                                  {t('admin.uploaded')}:{" "}
                                  {new Date(
                                    doc.uploadedAt,
                                  ).toLocaleDateString()}
                                </span>
                              </div>

                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                <Badge
                                  variant="outline"
                                  className={`bg-amber-50 text-amber-700 flex-shrink-0 ${isRtl ? 'font-arabic' : ''}`}
                                >
                                  {t('admin.status')}: {doc.status}
                                </Badge>
                                {doc.rejectionReason && (
                                  <span className={`text-sm text-red-600 break-words ${isRtl ? 'font-arabic' : ''}`}>
                                    {t('admin.reason')}: {doc.rejectionReason}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                className={`border-blue-200 text-blue-700 hover:bg-blue-50 ${isRtl ? 'font-arabic' : ''}`}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                {t('admin.viewDocument')}
                              </Button>

                              <Button
                                size="sm"
                                onClick={() => handleApproveKycDoc(doc.id)}
                                disabled={approveKycDocMutation.isPending}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                {approveKycDocMutation.isPending ? (
                                  <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4" />
                                )}
                                {t('admin.approve')}
                              </Button>

                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="destructive" className={isRtl ? 'font-arabic' : ''}>
                                    <XCircle className="h-4 w-4 mr-2" />
                                    {t('admin.reject')}
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle className={isRtl ? 'font-arabic' : ''}>
                                      {t('admin.rejectKycDocument')}
                                    </DialogTitle>
                                    <DialogDescription className={isRtl ? 'font-arabic text-right' : ''}>
                                      {t('admin.provideRejectionReasonForDoc')}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <Label htmlFor="kyc-doc-rejection-reason" className={isRtl ? 'font-arabic' : ''}>
                                      {t('admin.rejectionReason')}
                                    </Label>
                                    <Textarea
                                      id="kyc-doc-rejection-reason"
                                      value={kycDocRejectionReason}
                                      onChange={(e) =>
                                        setKycDocRejectionReason(e.target.value)
                                      }
                                      placeholder={t('admin.enterRejectionReason')}
                                      className={isRtl ? 'font-arabic text-right' : ''}
                                    />
                                  </div>
                                  <DialogFooter>
                                    <Button
                                      onClick={() =>
                                        handleRejectKycDoc(
                                          doc.id,
                                          kycDocRejectionReason,
                                        )
                                      }
                                      disabled={rejectKycDocMutation.isPending}
                                      variant="destructive"
                                    >
                                      {rejectKycDocMutation.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        t('admin.reject')
                                      )}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="listings">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className={`text-2xl font-bold ${isRtl ? 'font-arabic' : ''}`}>{t('admin.listingModeration')}</h2>
              <Badge variant="outline" className="text-amber-600">
                {Array.isArray(pendingListings) ? pendingListings.length : 0}{" "}
                {t('admin.pending')}
              </Badge>
            </div>

            {isLoadingListings ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : listingsError ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <p className={`text-destructive ${isRtl ? 'font-arabic' : ''}`}>{t('admin.errorLoadingListings')}</p>
                  </div>
                </CardContent>
              </Card>
            ) : !Array.isArray(pendingListings) ||
              pendingListings.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className={`text-xl font-semibold mb-2 ${isRtl ? 'font-arabic' : ''}`}>{t('admin.allCaughtUp')}</p>
                    <p className={`text-muted-foreground ${isRtl ? 'font-arabic text-right' : ''}`}>
                      {t('admin.noPendingListings')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {Array.isArray(pendingListings) &&
                  pendingListings.map((listing: Listing) => {
                    const user = getUserById(listing.userId);
                    return (
                      <Card key={listing.id}>
                        <CardContent className="p-4 sm:p-6">
                          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                            <div className="space-y-3 flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                <h3 className="font-semibold text-lg break-words">
                                  {listing.title}
                                </h3>
                                <Badge
                                  variant="outline"
                                  className="bg-blue-50 text-blue-700 flex-shrink-0"
                                >
                                  {listing.category || t('admin.uncategorized')}
                                </Badge>
                              </div>

                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-muted-foreground">
                                <span className={`break-words ${isRtl ? 'font-arabic' : ''}`}>
                                  {t('admin.owner')}:{" "}
                                  {user?.fullName ||
                                    user?.username ||
                                    t('admin.unknownUser')}
                                </span>
                                <span className={`break-all ${isRtl ? 'font-arabic' : ''}`}>{t('admin.email')}: {user?.email || t('admin.noEmail')}</span>
                                <span className={`whitespace-nowrap ${isRtl ? 'font-arabic' : ''}`}>
                                  {t('admin.submitted')}:{" "}
                                  {new Date(
                                    listing.createdAt,
                                  ).toLocaleDateString()}
                                </span>
                              </div>

                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                <Badge
                                  variant="outline"
                                  className={`bg-amber-50 text-amber-700 flex-shrink-0 ${isRtl ? 'font-arabic' : ''}`}
                                >
                                  {t('admin.status')}: {listing.status}
                                </Badge>
                                {listing.rejectionReason && (
                                  <span className={`text-sm text-red-600 break-words ${isRtl ? 'font-arabic' : ''}`}>
                                    {t('admin.reason')}: {listing.rejectionReason}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                className={`border-blue-200 text-blue-700 hover:bg-blue-50 ${isRtl ? 'font-arabic' : ''}`}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                {t('admin.viewDetails')}
                              </Button>

                              <Button
                                size="sm"
                                onClick={() => handleApproveListing(listing.id)}
                                disabled={approveListingMutation.isPending}
                                className={`bg-green-600 hover:bg-green-700 ${isRtl ? 'font-arabic' : ''}`}
                              >
                                {approveListingMutation.isPending ? (
                                  <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4" />
                                )}
                                {t('admin.approve')}
                              </Button>

                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="destructive" className={isRtl ? 'font-arabic' : ''}>
                                    <XCircle className="h-4 w-4 mr-2" />
                                    {t('admin.reject')}
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle className={isRtl ? 'font-arabic' : ''}>{t('admin.rejectListing')}</DialogTitle>
                                    <DialogDescription className={isRtl ? 'font-arabic text-right' : ''}>
                                      {t('admin.provideListingRejectionReason')} "
                                      {listing.title}".
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <Label htmlFor="listing-rejection-reason" className={isRtl ? 'font-arabic' : ''}>
                                      {t('admin.rejectionReason')}
                                    </Label>
                                    <Textarea
                                      id="listing-rejection-reason"
                                      value={listingRejectionReason}
                                      onChange={(e) =>
                                        setListingRejectionReason(
                                          e.target.value,
                                        )
                                      }
                                      placeholder={t('admin.enterRejectionReason')}
                                      className={isRtl ? 'font-arabic text-right' : ''}
                                    />
                                  </div>
                                  <DialogFooter>
                                    <Button
                                      onClick={() =>
                                        handleRejectListing(
                                          listing.id,
                                          listingRejectionReason,
                                        )
                                      }
                                      disabled={rejectListingMutation.isPending}
                                      variant="destructive"
                                    >
                                      {rejectListingMutation.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        t('admin.reject')
                                      )}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="users">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className={`text-2xl font-bold ${isRtl ? 'font-arabic' : ''}`}>{t('admin.userManagement')}</h2>
              <Badge variant="outline" className={`text-blue-600 ${isRtl ? 'font-arabic' : ''}`}>
                {activeUsers.length} {t('admin.activeUsers')}
              </Badge>
            </div>

            {/* User management content would go here */}
          </div>
        </TabsContent>

        <TabsContent value="blocked_users">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className={`text-2xl font-bold ${isRtl ? 'font-arabic' : ''}`}>{t('admin.blockedUsers')}</h2>
              <Badge variant="outline" className={`text-red-600 ${isRtl ? 'font-arabic' : ''}`}>
                {blockedUsers.length} {t('admin.blocked')}
              </Badge>
            </div>

            {/* Blocked users content would go here */}
          </div>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
