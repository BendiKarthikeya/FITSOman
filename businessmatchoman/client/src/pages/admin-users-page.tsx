import { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import {
  ChevronLeft,
  Users,
  Eye,
  Search,
  Filter,
  UserCheck,
  UserX,
  Upload,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AdminLayout from "@/components/layout/admin-layout";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { useRTL } from "@/hooks/use-rtl";

interface UserDetails {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  company?: string;
  position?: string;
  location?: string;
  phone?: string;
  bio?: string;
  profileImageUrl?: string;
  verified: boolean;
  createdAt: string;
  kycApplication?: any;
  kycDocuments?: any[];
  listings?: any[];
}

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const { isRtl, rtlClass } = useRTL();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch all users
  const {
    data: users,
    error,
    isLoading,
  } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    retry: false,
  });

  // Fetch user details
  const { data: userDetails, refetch: refetchUserDetails } =
    useQuery<UserDetails>({
      queryKey: ["/api/admin/users", selectedUser?.id],
      enabled: !!selectedUser,
      retry: false,
    });

  // Profile image upload mutation
  const uploadProfileImageMutation = useMutation({
    mutationFn: async (file: File) => {
      // Create form data for the upload
      const formData = new FormData();
      formData.append("profileImage", file);

      // Get the user ID
      if (!selectedUser) {
        throw new Error("No user selected");
      }

      // Send the form data to the server
      const response = await fetch(
        `/api/admin/users/${selectedUser.id}/update-profile-image`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error("Failed to upload profile image");
      }

      return await response.json();
    },
    onSuccess: (data) => {
      // Update the local user data
      setSelectedUser((prev) =>
        prev ? { ...prev, profileImageUrl: data.profileImageUrl } : null,
      );

      // Invalidate the relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/users", selectedUser?.id],
      });

      toast({
        title: t('admin.users.profileImageUpdated'),
        description: t('admin.users.profileImageUpdatedDesc'),
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('admin.users.uploadFailed'),
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  // Handle file selection for profile image upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    uploadProfileImageMutation.mutate(file);
  };

  // Trigger file input click
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleBack = () => {
    setLocation("/admin");
  };

  const handleViewUser = (user: any) => {
    setSelectedUser(user);
    refetchUserDetails();
    setUserDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setUserDetailsOpen(false);
  };

  // Filter users based on search query and role filter
  const filteredUsers = users?.filter((user) => {
    const matchesSearch =
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = selectedRole === "all" || user.role === selectedRole;

    return matchesSearch && matchesRole;
  });

  // Get role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-500";
      case "entrepreneur":
        return "bg-blue-500";
      case "investor":
        return "bg-green-500";
      case "broker":
        return "bg-amber-500";
      case "blocked":
        return "bg-red-500";
      default:
        return "bg-gray-500";
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
                className={`border-primary text-primary hover:bg-primary hover:text-white ${isRtl ? 'font-arabic' : ''}`}
                onClick={handleBack}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                {t('admin.users.backToDashboard')}
              </Button>
            </div>
            <h1 className={`text-3xl font-bold text-foreground ${isRtl ? 'font-arabic' : ''}`}>
              {t('admin.users.title')}
            </h1>
            <p className={`text-muted-foreground mt-1 ${isRtl ? 'font-arabic text-right' : ''}`}>
              {t('admin.users.subtitle')}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className={`flex items-center ${isRtl ? 'font-arabic' : ''}`}>
              <Users className="w-5 h-5 mr-2" />
              {t('admin.users.users')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className={`mt-2 text-gray-500 ${isRtl ? 'font-arabic' : ''}`}>{t('admin.users.loadingUsers')}</p>
              </div>
            ) : error ? (
              <div className="py-8 text-center">
                <p className={`text-red-500 ${isRtl ? 'font-arabic' : ''}`}>{t('admin.users.errorLoadingUsers')}</p>
                <p className={`mt-2 text-sm text-gray-500 ${isRtl ? 'font-arabic text-right' : ''}`}>
                  {t('admin.users.tryAgainLater')}
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      className={`pl-10 ${isRtl ? 'font-arabic text-right' : ''}`}
                      placeholder={t('admin.users.searchUsers')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="role-filter" className={`whitespace-nowrap ${isRtl ? 'font-arabic' : ''}`}>
                      <Filter className="h-4 w-4 inline mr-1" />
                      {t('admin.users.filterByRole')}
                    </Label>
                    <Select
                      value={selectedRole}
                      onValueChange={setSelectedRole}
                    >
                      <SelectTrigger id="role-filter" className="w-[180px]">
                        <SelectValue placeholder={t('admin.users.allRoles')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('admin.users.allRoles')}</SelectItem>
                        <SelectItem value="admin">{t('admin.users.admins')}</SelectItem>
                        <SelectItem value="entrepreneur">
                          {t('admin.users.entrepreneurs')}
                        </SelectItem>
                        <SelectItem value="investor">{t('admin.users.investors')}</SelectItem>
                        <SelectItem value="broker">{t('admin.users.brokers')}</SelectItem>
                        <SelectItem value="blocked">{t('admin.users.blockedUsers')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {filteredUsers && filteredUsers.length > 0 ? (
                  <div className="overflow-x-auto border rounded-md">
                    <Table className="min-w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className={`whitespace-nowrap min-w-[200px] ${isRtl ? 'font-arabic text-right' : ''}`}>{t('admin.users.userDetails')}</TableHead>
                          <TableHead className={`whitespace-nowrap ${isRtl ? 'font-arabic text-right' : ''}`}>{t('admin.users.role')}</TableHead>
                          <TableHead className={`whitespace-nowrap ${isRtl ? 'font-arabic text-right' : ''}`}>{t('admin.users.verification')}</TableHead>
                          <TableHead className={`whitespace-nowrap ${isRtl ? 'font-arabic text-right' : ''}`}>{t('admin.users.registeredOn')}</TableHead>
                          <TableHead className={`text-right whitespace-nowrap min-w-[120px] ${isRtl ? 'font-arabic' : ''}`}>{t('admin.users.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="min-w-[200px]">
                              <div className="font-medium break-words">{user.fullName}</div>
                              <div className="text-sm text-gray-500 break-all">
                                {user.email}
                              </div>
                              <div className="text-xs text-gray-400 break-words">
                                @{user.username}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getRoleBadgeColor(user.role)}>
                                {user.role.charAt(0).toUpperCase() +
                                  user.role.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {user.verified ? (
                                <div className="flex items-center">
                                  <UserCheck className="h-4 w-4 text-green-500 mr-1" />
                                  <span className={`text-sm ${isRtl ? 'font-arabic' : ''}`}>{t('admin.users.verified')}</span>
                                </div>
                              ) : (
                                <div className="flex items-center">
                                  <UserX className="h-4 w-4 text-amber-500 mr-1" />
                                  <span className={`text-sm ${isRtl ? 'font-arabic' : ''}`}>{t('admin.users.notVerified')}</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {new Date(user.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right min-w-[120px]">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewUser(user)}
                                className="whitespace-nowrap"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                <span className={`hidden sm:inline ${isRtl ? 'font-arabic' : ''}`}>{t('admin.users.view')}</span>
                                <span className={`sm:hidden ${isRtl ? 'font-arabic' : ''}`}>{t('admin.users.view')}</span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <p className={`text-gray-500 ${isRtl ? 'font-arabic' : ''}`}>
                      {t('admin.users.noUsersFound')}
                    </p>
                    <p className={`mt-2 text-sm text-gray-500 ${isRtl ? 'font-arabic text-right' : ''}`}>
                      {t('admin.users.adjustSearchCriteria')}
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* User Details Dialog */}
        <Dialog open={userDetailsOpen} onOpenChange={setUserDetailsOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className={`text-xl font-semibold ${isRtl ? 'font-arabic' : ''}`}>{t('admin.users.userProfile')}</DialogTitle>
              <DialogDescription className={isRtl ? 'font-arabic text-right' : ''}>
                {t('admin.users.userInfoActivity')}
              </DialogDescription>
            </DialogHeader>

            {selectedUser && (
              <div className="space-y-6 mt-4">
                {/* User Profile Card */}
                <Card className="shadow-lg bg-gradient-to-br from-white to-gray-50">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="md:w-1/3">
                        <div className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden relative group max-w-[200px] mx-auto">
                          {selectedUser.profileImageUrl ? (
                            <img
                              src={selectedUser.profileImageUrl}
                              alt={selectedUser.fullName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-primary text-2xl font-semibold">
                              {selectedUser.fullName?.charAt(0) || selectedUser.username?.charAt(0)}
                            </div>
                          )}

                      {/* Upload overlay */}
                      <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex items-center gap-1"
                          onClick={handleUploadClick}
                          disabled={isUploading}
                        >
                          {isUploading ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              {t('admin.users.uploading')}
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4" />
                              {t('admin.users.uploadPhoto')}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Hidden file input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileChange}
                    />

                    <div className="mt-4">
                      <h3 className="font-bold text-lg">
                        {selectedUser.fullName}
                      </h3>
                      <p className="text-gray-500">@{selectedUser.username}</p>
                      <div className="mt-2">
                        <Badge className={getRoleBadgeColor(selectedUser.role)}>
                          {t(`admin.roles.${selectedUser.role}`)}
                        </Badge>
                        {selectedUser.verified && (
                          <Badge className={`ml-2 bg-green-500 ${isRtl ? 'font-arabic' : ''}`}>{t('admin.users.verified')}</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="md:w-2/3">
                    <h3 className={`font-bold mb-2 ${isRtl ? 'font-arabic' : ''}`}>{t('admin.users.contactInformation')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className={isRtl ? 'font-arabic' : ''}>{t('admin.users.email')}</Label>
                        <p className="text-gray-700 break-words overflow-hidden text-ellipsis max-w-full">
                          {selectedUser.email}
                        </p>
                      </div>
                      <div>
                        <Label className={isRtl ? 'font-arabic' : ''}>{t('admin.users.phone')}</Label>
                        <p className="text-gray-700 break-words overflow-hidden text-ellipsis">
                          {selectedUser.phone || t('admin.users.notProvided')}
                        </p>
                      </div>
                      <div>
                        <Label className={isRtl ? 'font-arabic' : ''}>{t('admin.users.company')}</Label>
                        <p className="text-gray-700 break-words overflow-hidden text-ellipsis">
                          {selectedUser.company || t('admin.users.notProvided')}
                        </p>
                      </div>
                      <div>
                        <Label className={isRtl ? 'font-arabic' : ''}>{t('admin.users.position')}</Label>
                        <p className="text-gray-700 break-words overflow-hidden text-ellipsis">
                          {selectedUser.position || t('admin.users.notProvided')}
                        </p>
                      </div>
                      <div>
                        <Label className={isRtl ? 'font-arabic' : ''}>{t('admin.users.location')}</Label>
                        <p className="text-gray-700 break-words overflow-hidden text-ellipsis">
                          {selectedUser.location || t('admin.users.notProvided')}
                        </p>
                      </div>
                      <div>
                        <Label className={isRtl ? 'font-arabic' : ''}>{t('admin.users.registeredOn')}</Label>
                        <p className="text-gray-700">
                          {new Date(
                            selectedUser.createdAt,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {selectedUser.bio && (
                      <div className="mt-4">
                        <Label className={isRtl ? 'font-arabic' : ''}>{t('admin.users.bio')}</Label>
                        <p className="text-gray-700 mt-1 break-words overflow-hidden">
                          {selectedUser.bio}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                  </CardContent>
                </Card>

                {/* Tabs Section */}
                <Card className="shadow-lg">
                  <CardContent className="p-6">
                    <Tabs defaultValue="kyc">
                    <TabsList className="w-full border-b">
                      <TabsTrigger value="kyc" className={isRtl ? 'font-arabic' : ''}>{t('admin.users.kycStatus')}</TabsTrigger>
                      <TabsTrigger value="listings" className={isRtl ? 'font-arabic' : ''}>{t('admin.users.listings')}</TabsTrigger>
                    </TabsList>
                    <TabsContent value="kyc" className="py-4">
                      {selectedUser.kycApplication || (selectedUser.kycDocuments && selectedUser.kycDocuments.length > 0) ? (
                        <div className="space-y-6">
                          {selectedUser.kycApplication && (
                            <div>
                              <div className="flex items-center mb-4">
                                <h3 className={`font-bold ${isRtl ? 'font-arabic' : ''}`}>{t('admin.users.kycApplication')}</h3>
                                <Badge
                                  className={`ml-2 ${
                                    selectedUser.kycApplication.status ===
                                    "approved"
                                      ? "bg-green-500"
                                      : selectedUser.kycApplication.status ===
                                          "rejected"
                                        ? "bg-red-500"
                                        : "bg-amber-500"
                                  }`}
                                >
                                  {selectedUser.kycApplication.status
                                    .charAt(0)
                                    .toUpperCase() +
                                    selectedUser.kycApplication.status.slice(1)}
                                </Badge>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label className={isRtl ? 'font-arabic' : ''}>{t('admin.users.submissionDate')}</Label>
                                  <p className="text-gray-700">
                                    {new Date(
                                      selectedUser.kycApplication.createdAt,
                                    ).toLocaleDateString()}
                                  </p>
                                </div>
                                <div>
                                  <Label className={isRtl ? 'font-arabic' : ''}>{t('admin.users.idType')}</Label>
                                  <p className="text-gray-700">
                                    {selectedUser.kycApplication.idType}
                                  </p>
                                </div>
                                {selectedUser.kycApplication.status ===
                                  "rejected" && (
                                  <div className="col-span-2">
                                    <Label className={isRtl ? 'font-arabic' : ''}>{t('admin.users.rejectionReason')}</Label>
                                    <p className="text-red-600 break-words overflow-hidden">
                                      {selectedUser.kycApplication.rejectionReason}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Show uploaded documents from KYC application */}
                              {(selectedUser.kycApplication.idDocumentUrl || 
                                selectedUser.kycApplication.addressProofUrl || 
                                selectedUser.kycApplication.businessLicenseUrl) && (
                                <div className="mt-4">
                                  <h4 className={`font-semibold mb-3 ${isRtl ? 'font-arabic' : ''}`}>{t('admin.users.applicationDocuments')}</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {selectedUser.kycApplication.idDocumentUrl && (
                                      <div className="border rounded-lg p-3">
                                        <div className="flex items-center justify-between">
                                          <div>
                                            <p className={`font-medium text-sm ${isRtl ? 'font-arabic' : ''}`}>{t('admin.users.idDocument')}</p>
                                            <p className="text-xs text-gray-500">{selectedUser.kycApplication.idType}</p>
                                          </div>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => window.open(selectedUser.kycApplication.idDocumentUrl, '_blank')}
                                            className={isRtl ? 'font-arabic' : ''}
                                          >
                                            <Eye className="h-3 w-3 mr-1" />
                                            {t('admin.users.view')}
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                    {selectedUser.kycApplication.addressProofUrl && (
                                      <div className="border rounded-lg p-3">
                                        <div className="flex items-center justify-between">
                                          <div>
                                            <p className={`font-medium text-sm ${isRtl ? 'font-arabic' : ''}`}>{t('admin.users.addressProof')}</p>
                                            <p className={`text-xs text-gray-500 ${isRtl ? 'font-arabic text-right' : ''}`}>{t('admin.users.verificationDocument')}</p>
                                          </div>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => window.open(selectedUser.kycApplication.addressProofUrl, '_blank')}
                                          >
                                            <Eye className="h-3 w-3 mr-1" />
                                            View
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                    {selectedUser.kycApplication.businessLicenseUrl && (
                                      <div className="border rounded-lg p-3">
                                        <div className="flex items-center justify-between">
                                          <div>
                                            <p className={`font-medium text-sm ${isRtl ? 'font-arabic' : ''}`}>{t('admin.users.businessLicense')}</p>
                                            <p className={`text-xs text-gray-500 ${isRtl ? 'font-arabic text-right' : ''}`}>{t('admin.users.companyDocument')}</p>
                                          </div>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => window.open(selectedUser.kycApplication.businessLicenseUrl, '_blank')}
                                          >
                                            <Eye className="h-3 w-3 mr-1" />
                                            View
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              <div className="mt-4">
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setLocation(
                                      `/admin/kyc/${selectedUser.kycApplication.id}`,
                                    );
                                  }}
                                >
                                  {t('admin.users.viewKycApplicationDetails')}
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Show additional KYC documents */}
                          {selectedUser.kycDocuments && selectedUser.kycDocuments.length > 0 && (
                            <div>
                              <h3 className={`font-bold mb-4 ${isRtl ? 'font-arabic' : ''}`}>{t('admin.users.additionalKycDocuments')}</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {selectedUser.kycDocuments.map((doc: any) => (
                                  <div key={doc.id} className="border rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <div>
                                        <p className="font-medium text-sm capitalize">
                                          {doc.documentType.replace(/_/g, ' ')}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          {new Date(doc.createdAt).toLocaleDateString()}
                                        </p>
                                      </div>
                                      <Badge
                                        className={`text-xs ${
                                          doc.status === "approved"
                                            ? "bg-green-500"
                                            : doc.status === "rejected"
                                              ? "bg-red-500"
                                              : "bg-amber-500"
                                        }`}
                                      >
                                        {doc.status}
                                      </Badge>
                                    </div>
                                    {doc.description && (
                                      <p className="text-xs text-gray-600 mb-2">
                                        {doc.description}
                                      </p>
                                    )}
                                    {doc.rejectionReason && (
                                      <p className="text-xs text-red-600 mb-2">
                                        {doc.rejectionReason}
                                      </p>
                                    )}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => window.open(doc.fileUrl, '_blank')}
                                      className="w-full"
                                    >
                                      <Eye className="h-3 w-3 mr-1" />
                                      {t('admin.users.viewDocument')}
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <p className={`text-gray-500 ${isRtl ? 'font-arabic' : ''}`}>
                            {t('admin.users.noKycApplication')}
                          </p>
                        </div>
                      )}
                    </TabsContent>
                    <TabsContent value="listings" className="py-4">
                      {selectedUser.listings &&
                      selectedUser.listings.length > 0 ? (
                        <div>
                          <h3 className={`font-bold mb-4 ${isRtl ? 'font-arabic' : ''}`}>{t('admin.users.userListings')}</h3>
                          <div className="space-y-4">
                            {selectedUser.listings.map((listing: any) => (
                              <div
                                key={listing.id}
                                className="border rounded p-4"
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex-1 mr-2">
                                    <h4 className="font-medium break-words overflow-hidden text-ellipsis">
                                      {listing.title}
                                    </h4>
                                    <p className="text-sm text-gray-500 mt-1 break-words overflow-hidden text-ellipsis">
                                      {listing.industry}
                                    </p>
                                  </div>
                                  <Badge
                                    className={`shrink-0 ${
                                      listing.status === "approved"
                                        ? "bg-green-500"
                                        : listing.status === "rejected"
                                          ? "bg-red-500"
                                          : listing.status === "archived"
                                            ? "bg-gray-500"
                                            : "bg-amber-500"
                                    }`}
                                  >
                                    {listing.status.charAt(0).toUpperCase() +
                                      listing.status.slice(1)}
                                  </Badge>
                                </div>
                                <div className="mt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setLocation(
                                        `/admin/listings/${listing.id}`,
                                      );
                                    }}
                                  >
                                    {t('admin.users.viewListing')}
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <p className={`text-gray-500 ${isRtl ? 'font-arabic' : ''}`}>
                            {t('admin.users.noListingsFound')}
                          </p>
                        </div>
                      )}
                    </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={handleCloseDetails} className={isRtl ? 'font-arabic' : ''}>
                    {t('admin.users.close')}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
