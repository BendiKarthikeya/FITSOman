import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useRTL } from "@/hooks/use-rtl";
import {
  ChevronLeft,
  Store,
  CheckCircle,
  XCircle,
  Info,
  Filter,
  ExternalLink,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AdminLayout from "@/components/layout/admin-layout";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";


// Type for listings data
interface Listing {
  id: number;
  userId: number;
  title_en: string;
  title_ar: string;
  industry: string;
  location: string;
  askingPrice: number;
  currency: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
  imageUrl?: string;
}

interface ListingDialogProps {
  listing: Listing | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
}

const ListingDetailsDialog = ({
  listing,
  isOpen,
  onClose,
  onApprove,
  onReject,
}: ListingDialogProps) => {
  const { t } = useTranslation();
  const { isRtl, rtlClass } = useRTL();
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  if (!listing) return null;

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
          <DialogTitle className={isRtl ? 'font-arabic text-right' : ''}>{t('admin.listings.listingDetails')}</DialogTitle>
          <DialogDescription className={isRtl ? 'font-arabic text-right' : ''}>
            {t('admin.listings.reviewListing')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div>
            <h3 className={`font-semibold mb-2 ${isRtl ? 'font-arabic text-right' : ''}`}>{t('admin.listings.englishTitle')}</h3>
            <p className="text-sm mb-4">{listing.title_en}</p>

            <h3 className={`font-semibold mb-2 ${isRtl ? 'font-arabic text-right' : ''}`}>{t('admin.listings.arabicTitle')}</h3>
            <p className="text-sm mb-4 font-arabic">{listing.title_ar}</p>

            <h3 className={`font-semibold mb-2 ${isRtl ? 'font-arabic text-right' : ''}`}>{t('admin.listings.industry')}</h3>
            <p className="text-sm mb-4">{listing.industry}</p>

            <h3 className={`font-semibold mb-2 ${isRtl ? 'font-arabic text-right' : ''}`}>{t('admin.listings.location')}</h3>
            <p className="text-sm mb-4">{listing.location}</p>
          </div>

          <div>
            <h3 className={`font-semibold mb-2 ${isRtl ? 'font-arabic text-right' : ''}`}>{t('admin.listings.price')}</h3>
            <p className="text-sm mb-4">
              {listing.askingPrice.toLocaleString()} {listing.currency}
            </p>

            <h3 className={`font-semibold mb-2 ${isRtl ? 'font-arabic text-right' : ''}`}>{t('admin.listings.currentStatus')}</h3>
            <div className="mb-4">
              {listing.status === "pending" && (
                <Badge
                  variant="outline"
                  className="bg-yellow-100 text-yellow-800"
                >
                  {t('admin.listings.pending')}
                </Badge>
              )}
              {listing.status === "approved" && (
                <Badge
                  variant="outline"
                  className="bg-green-100 text-green-800"
                >
                  {t('admin.listings.approved')}
                </Badge>
              )}
              {listing.status === "rejected" && (
                <Badge variant="outline" className="bg-red-100 text-red-800">
                  {t('admin.listings.rejected')}
                </Badge>
              )}
            </div>

            <h3 className={`font-semibold mb-2 ${isRtl ? 'font-arabic text-right' : ''}`}>{t('admin.listings.created')}</h3>
            <p className="text-sm mb-4">
              {formatDistanceToNow(new Date(listing.createdAt), {
                addSuffix: true,
              })}
            </p>

            {listing.imageUrl && (
              <div>
                <h3 className={`font-semibold mb-2 ${isRtl ? 'font-arabic text-right' : ''}`}>{t('admin.listings.listingImage')}</h3>
                <div className="relative h-32 w-full bg-muted rounded-md overflow-hidden">
                  <img
                    src={listing.imageUrl}
                    alt={listing.title_en}
                    className="object-cover h-full w-full"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/assets/placeholder-image.png";
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {showRejectForm ? (
          <div className="space-y-4">
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t('admin.listings.rejectionPlaceholder')}
              className="min-h-[100px]"
            />

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowRejectForm(false)}
              >
                {t('admin.listings.cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (rejectReason.trim()) {
                    onReject(rejectReason);
                  }
                }}
                disabled={!rejectReason.trim()}
              >
                {t('admin.listings.confirmRejection')}
              </Button>
            </div>
          </div>
        ) : (
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button variant="outline" onClick={onClose}>
              {t('admin.listings.close')}
            </Button>
            <div className="flex space-x-2">
              <Button
                variant="destructive"
                onClick={() => setShowRejectForm(true)}
                disabled={listing.status === "rejected"}
              >
                <XCircle className="mr-1 h-4 w-4" />
                {t('admin.listings.reject')}
              </Button>
              <Button
                variant="default"
                onClick={onApprove}
                disabled={listing.status === "approved"}
              >
                <CheckCircle className="mr-1 h-4 w-4" />
                {t('admin.listings.approve')}
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default function AdminListingsPage() {
  const { t } = useTranslation();
  const { isRtl, rtlClass } = useRTL();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch listings filtered by status
  const {
    data: listings,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["/api/admin/listings", activeTab],
    queryFn: async () => {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `/api/admin/listings${activeTab !== "all" ? `?status=${activeTab}` : ""}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        },
      );
      if (!response.ok) {
        throw new Error(t('admin.listings.fetchFailed'));
      }
      return response.json();
    },
  });

  // Approve listing mutation
  const approveMutation = useMutation({
    mutationFn: async (listingId: number) => {
      const res = await apiRequest(
        "PATCH",
        `/api/admin/listings/${listingId}/approve`,
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/listings"] });
      toast({
        title: t('admin.listings.listingApproved'),
        description: t('admin.listings.approvedSuccessfully'),
        variant: "default",
      });
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: t('admin.listings.approvalFailed'),
        description:
          error.message || t('admin.listings.approvalFailedMessage'),
        variant: "destructive",
      });
    },
  });

  // Reject listing mutation
  const rejectMutation = useMutation({
    mutationFn: async ({
      listingId,
      reason,
    }: {
      listingId: number;
      reason: string;
    }) => {
      const res = await apiRequest(
        "PATCH",
        `/api/admin/listings/${listingId}/reject`,
        { reason },
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/listings"] });
      toast({
        title: t('admin.listings.listingRejected'),
        description: t('admin.listings.rejectedSuccessfully'),
        variant: "default",
      });
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: t('admin.listings.rejectionFailed'),
        description:
          error.message || t('admin.listings.rejectionFailedMessage'),
        variant: "destructive",
      });
    },
  });

  const handleViewDetails = (listing: Listing) => {
    setSelectedListing(listing);
    setIsDialogOpen(true);
  };

  const handleApprove = () => {
    if (selectedListing) {
      approveMutation.mutate(selectedListing.id);
    }
  };

  const handleReject = (reason: string) => {
    if (selectedListing) {
      rejectMutation.mutate({ listingId: selectedListing.id, reason });
    }
  };

  const handleBack = () => {
    setLocation("/admin");
  };

  // Render status badge based on listing status
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className={`bg-yellow-100 text-yellow-800 ${isRtl ? 'font-arabic' : ''}`}>
            {t('admin.listings.pending')}
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className={`bg-green-100 text-green-800 ${isRtl ? 'font-arabic' : ''}`}>
            {t('admin.listings.approved')}
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className={`bg-red-100 text-red-800 ${isRtl ? 'font-arabic' : ''}`}>
            {t('admin.listings.rejected')}
          </Badge>
        );
      default:
        return <Badge variant="outline" className={isRtl ? 'font-arabic' : ''}>{t('admin.listings.unknown')}</Badge>;
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
                {t('admin.listings.backToDashboard')}
              </Button>
            </div>
            <h1 className={`text-3xl font-bold text-foreground ${isRtl ? 'font-arabic text-right' : ''}`}>
              {t('admin.listings.title')}
            </h1>
            <p className={`text-muted-foreground mt-1 ${isRtl ? 'font-arabic text-right' : ''}`}>
              {t('admin.listings.subtitle')}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className={`flex items-center ${isRtl ? 'font-arabic' : ''}`}>
                <Store className={`w-5 h-5 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                {t('admin.listings.businessListings')}
              </CardTitle>
              <Tabs
                defaultValue="pending"
                value={activeTab}
                onValueChange={setActiveTab}
              >
                <TabsList>
                  <TabsTrigger value="pending" className={isRtl ? 'font-arabic' : ''}>{t('admin.listings.pending')}</TabsTrigger>
                  <TabsTrigger value="approved" className={isRtl ? 'font-arabic' : ''}>{t('admin.listings.approved')}</TabsTrigger>
                  <TabsTrigger value="rejected" className={isRtl ? 'font-arabic' : ''}>{t('admin.listings.rejected')}</TabsTrigger>
                  <TabsTrigger value="all" className={isRtl ? 'font-arabic' : ''}>{t('admin.listings.all')}</TabsTrigger>
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
                        <div className="flex-1">
                          <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse mb-2" />
                          <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse mb-2" />
                          <div className="h-4 w-1/3 bg-gray-200 rounded animate-pulse" />
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
                <p className={`text-red-500 ${isRtl ? 'font-arabic text-right' : ''}`}>{t('admin.listings.errorLoading')}</p>
                <p className={`mt-2 text-sm text-gray-500 ${isRtl ? 'font-arabic text-right' : ''}`}>
                  {t('admin.listings.pleaseRetry')}
                </p>
              </div>
            ) : listings && listings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className={`py-3 px-2 ${isRtl ? 'text-right' : 'text-left'} font-medium text-sm ${isRtl ? 'font-arabic' : ''}`}>
                        {t('admin.listings.title')}
                      </th>
                      <th className={`py-3 px-2 ${isRtl ? 'text-right' : 'text-left'} font-medium text-sm ${isRtl ? 'font-arabic' : ''}`}>
                        {t('admin.listings.industry')}
                      </th>
                      <th className={`py-3 px-2 ${isRtl ? 'text-right' : 'text-left'} font-medium text-sm ${isRtl ? 'font-arabic' : ''}`}>
                        {t('admin.listings.location')}
                      </th>
                      <th className={`py-3 px-2 ${isRtl ? 'text-right' : 'text-left'} font-medium text-sm ${isRtl ? 'font-arabic' : ''}`}>
                        {t('admin.listings.askingPrice')}
                      </th>
                      <th className={`py-3 px-2 ${isRtl ? 'text-right' : 'text-left'} font-medium text-sm ${isRtl ? 'font-arabic' : ''}`}>
                        {t('admin.listings.status')}
                      </th>
                      <th className={`py-3 px-2 ${isRtl ? 'text-right' : 'text-left'} font-medium text-sm ${isRtl ? 'font-arabic' : ''}`}>
                        {t('admin.listings.created')}
                      </th>
                      <th className={`py-3 px-2 ${isRtl ? 'text-left' : 'text-right'} font-medium text-sm ${isRtl ? 'font-arabic' : ''}`}>
                        {t('admin.listings.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {listings.map((listing: Listing) => (
                      <tr
                        key={listing.id}
                        className="border-b hover:bg-muted/50"
                      >
                        <td className="py-3 px-2 text-sm">
                          {listing.title_en}
                        </td>
                        <td className="py-3 px-2 text-sm">
                          {listing.industry}
                        </td>
                        <td className="py-3 px-2 text-sm">
                          {listing.location}
                        </td>
                        <td className="py-3 px-2 text-sm">
                          {listing.askingPrice.toLocaleString()}{" "}
                          {listing.currency}
                        </td>
                        <td className="py-3 px-2 text-sm">
                          {renderStatusBadge(listing.status)}
                        </td>
                        <td className="py-3 px-2 text-sm">
                          {formatDistanceToNow(new Date(listing.createdAt), {
                            addSuffix: true,
                          })}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(listing)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {t('admin.listings.details')}
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
                  {t('admin.listings.noListingsFound', { status: activeTab !== "all" ? t(`admin.listings.${activeTab}`) : "" })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ListingDetailsDialog
        listing={selectedListing}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </AdminLayout>
  );
}
