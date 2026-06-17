import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { getAuthToken } from "@/lib/authUtils";

interface SaveButtonProps {
  listingId: number;
  listingUserId?: number; // Optional: listing owner ID to check ownership
  className?: string;
  showText?: boolean;
}

export default function SaveButton({
  listingId,
  listingUserId,
  className,
  showText = false,
}: SaveButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Check if listing is saved
  const { data: savedData, isLoading } = useQuery({
    queryKey: ["/api/listings", listingId, "saved"],
    queryFn: async () => {
      const token = getAuthToken();
      const res = await fetch(`/api/listings/${listingId}/saved`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch saved status");
      }
      return res.json();
    },
    enabled:
      !!user && !!listingId && (!listingUserId || user.id !== listingUserId),
  });

  const isSaved = savedData?.saved || false;

  // Save/unsave mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isSaved) {
        return apiRequest("DELETE", `/api/listings/${listingId}/save`);
      } else {
        return apiRequest("POST", `/api/listings/${listingId}/save`);
      }
    },
    onSuccess: () => {
      // Invalidate queries to refresh state
      queryClient.invalidateQueries({
        queryKey: ["/api/listings", listingId, "saved"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/saved-listings"] });

      toast({
        title: isSaved ? t('alerts.listing.listingUnsaved') : t('alerts.listing.listingSaved'),
        description: isSaved
          ? "Listing removed from your saved items"
          : "Listing added to your saved items",
      });
    },
    onError: (error: any) => {
      console.error("Save listing error:", error);
      let errorMessage = "Failed to update saved status";

      // Extract specific error message from the response
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Don't show save button for unauthenticated users or own listings
  if (!user || (listingUserId && user.id === listingUserId)) {
    return null;
  }

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled className={className}>
        <Heart className="h-4 w-4" />
        {showText && <span className="ml-2">Save</span>}
      </Button>
    );
  }

  return (
    <Button
      variant={isSaved ? "default" : "outline"}
      size="sm"
      onClick={() => saveMutation.mutate()}
      disabled={saveMutation.isPending}
      className={className}
    >
      <Heart className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
      {showText && (
        <span className="ml-2">
          {saveMutation.isPending
            ? isSaved
              ? "Unsaving..."
              : "Saving..."
            : isSaved
              ? "Saved"
              : "Save"}
        </span>
      )}
    </Button>
  );
}
