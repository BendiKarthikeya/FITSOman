import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AdminLayout } from "@/components/layouts/admin-layout";
import { Redirect } from "wouter";
import { AdminAnalytics } from "@shared/types";
import { AdminBackButton } from "@/components/admin/back-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Clock,
  FileText,
  Users,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  Shield,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export default function AdminPage() {
  const { user, isLoading: isLoadingAuth } = useAuth();
  const { t } = useTranslation();

  // Redirect if not admin
  if (isLoadingAuth) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return <Redirect to="/auth" />;
  }

  // Query for analytics data
  const {
    data: analytics,
    isLoading: isLoadingAnalytics,
    error: analyticsError,
  } = useQuery<AdminAnalytics>({
    queryKey: ["/api/admin/analytics"],
  });

  // Function to handle back button click
  const handleBackClick = () => {
    window.location.href = "/";
  };

  return (
    <AdminLayout>
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {t("admin.dashboardPage.title")}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t("admin.dashboardPage.subtitle")}
            </p>
          </div>
          <Button
            variant="outline"
            size="lg"
            className="border-primary text-primary hover:bg-primary hover:text-white flex items-center gap-2"
            onClick={handleBackClick}
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">{t("admin.dashboardPage.exitButton")}</span>
          </Button>
        </div>

        {/* Professional Admin Notice */}
        <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg mb-8 shadow-sm">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center mr-3">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="font-semibold text-primary">
                  {t("admin.dashboardPage.alert.title")}
                </span>
                <p className="text-sm text-muted-foreground">
                  {t("admin.dashboardPage.alert.description")}
                </p>
              </div>
            </div>
            <Button
              variant="default"
              size="default"
              className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2"
              onClick={handleBackClick}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="font-medium">{t("admin.dashboardPage.alert.return")}</span>
            </Button>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {/* Users Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {t("admin.dashboardPage.cards.users.title")}
              </CardTitle>
              <CardDescription>{t("admin.dashboardPage.cards.users.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAnalytics ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : analyticsError ? (
                <div className="bg-destructive/10 p-3 rounded-lg text-center">
                  <AlertTriangle className="h-6 w-6 text-destructive mx-auto mb-2" />
                  <p className="text-sm text-destructive">
                    {t("admin.dashboardPage.error")}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {t("admin.dashboardPage.cards.users.total")}
                    </span>
                    <span className="text-2xl font-bold">
                      {analytics?.users.total || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {t("admin.dashboardPage.cards.users.active")}
                    </span>
                    <span className="text-lg font-medium">
                      {analytics?.users.active || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {t("admin.dashboardPage.cards.users.blocked")}
                    </span>
                    <span className="text-lg font-medium text-red-600">
                      {analytics?.users.blocked || 0}
                    </span>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">{t("admin.dashboardPage.cards.users.rolesTitle")}</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          {t("admin.dashboardPage.cards.users.entrepreneurs")}
                        </span>
                        <span>{analytics?.users.byRole.entrepreneur || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("admin.dashboardPage.cards.users.investors")}</span>
                        <span>{analytics?.users.byRole.investor || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("admin.dashboardPage.cards.users.brokers")}</span>
                        <span>{analytics?.users.byRole.broker || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("admin.dashboardPage.cards.users.admins")}</span>
                        <span>{analytics?.users.admin || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Listings Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {t("admin.dashboardPage.cards.listings.title")}
              </CardTitle>
              <CardDescription>{t("admin.dashboardPage.cards.listings.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAnalytics ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : analyticsError ? (
                <div className="bg-destructive/10 p-3 rounded-lg text-center">
                  <AlertTriangle className="h-6 w-6 text-destructive mx-auto mb-2" />
                  <p className="text-sm text-destructive">
                    {t("admin.dashboardPage.error")}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {t("admin.dashboardPage.cards.listings.total")}
                    </span>
                    <span className="text-2xl font-bold">
                      {analytics?.listings.total || 0}
                    </span>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">{t("admin.dashboardPage.cards.listings.byStatus")}</h4>
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("admin.dashboardPage.cards.listings.pending")}</span>
                        <Badge variant="outline" className="bg-yellow-50">
                          {analytics?.listings.byStatus.pending || 0}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("admin.dashboardPage.cards.listings.approved")}</span>
                        <Badge variant="outline" className="bg-green-50">
                          {analytics?.listings.byStatus.approved || 0}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("admin.dashboardPage.cards.listings.rejected")}</span>
                        <Badge variant="outline" className="bg-red-50">
                          {analytics?.listings.byStatus.rejected || 0}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("admin.dashboardPage.cards.listings.archived")}</span>
                        <Badge variant="outline" className="bg-gray-50">
                          {analytics?.listings.byStatus.archived || 0}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Tasks */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                {t("admin.dashboardPage.cards.tasks.title")}
              </CardTitle>
              <CardDescription>{t("admin.dashboardPage.cards.tasks.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAnalytics ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : analyticsError ? (
                <div className="bg-destructive/10 p-3 rounded-lg text-center">
                  <AlertTriangle className="h-6 w-6 text-destructive mx-auto mb-2" />
                  <p className="text-sm text-destructive">
                    {t("admin.dashboardPage.error")}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between bg-amber-50 p-3 rounded-lg">
                      <div className="flex items-center">
                        <Clock className="h-5 w-5 text-amber-500 mr-2" />
                        <div>
                          <h4 className="text-sm font-medium">{t("admin.dashboardPage.cards.tasks.pendingKycTitle")}</h4>
                          <p className="text-xs text-muted-foreground">
                            {t("admin.dashboardPage.cards.tasks.pendingKycDescription")}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-amber-500 border-amber-200 bg-amber-50"
                      >
                        {analytics?.kyc.pending || 0}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-blue-500 mr-2" />
                        <div>
                          <h4 className="text-sm font-medium">
                            {t("admin.dashboardPage.cards.tasks.pendingListingsTitle")}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {t("admin.dashboardPage.cards.tasks.pendingListingsDescription")}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-blue-500 border-blue-200 bg-blue-50"
                      >
                        {analytics?.listings.byStatus.pending || 0}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5 text-primary" />
                {t("admin.dashboardPage.cards.stats.title")}
              </CardTitle>
              <CardDescription>{t("admin.dashboardPage.cards.stats.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAnalytics ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : analyticsError ? (
                <div className="bg-destructive/10 p-3 rounded-lg text-center">
                  <AlertTriangle className="h-6 w-6 text-destructive mx-auto mb-2" />
                  <p className="text-sm text-destructive">
                    {t("admin.dashboardPage.error")}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">{t("admin.dashboardPage.cards.stats.userActivity")}</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{t("admin.dashboardPage.cards.stats.newUsers")}</span>
                        <span className="font-semibold">
                          {analytics?.users.newThisWeek || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">
                          {t("admin.dashboardPage.cards.stats.activeUsers")}
                        </span>
                        <span className="font-semibold">
                          {analytics?.users.activeLastMonth || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{t("admin.dashboardPage.cards.stats.verifiedUsers")}</span>
                        <span className="font-semibold">
                          {analytics?.users.verified || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{t("admin.dashboardPage.cards.stats.kycRate")}</span>
                        <span className="font-semibold">
                          {analytics?.users.total
                            ? Math.round(
                                (analytics.users.verified /
                                  analytics.users.total) *
                                  100,
                              ) + "%"
                            : "0%"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">{t("admin.dashboardPage.cards.stats.listingActivity")}</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">
                          {t("admin.dashboardPage.cards.stats.newListings")}
                        </span>
                        <span className="font-semibold">
                          {analytics?.listings.newThisWeek || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{t("admin.dashboardPage.cards.stats.approvalRate")}</span>
                        <span className="font-semibold">
                          {analytics?.listings.total
                            ? Math.round(
                                (analytics.listings.byStatus.approved /
                                  analytics.listings.total) *
                                  100,
                              ) + "%"
                            : "0%"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{t("admin.dashboardPage.cards.stats.avgApprovalTime")}</span>
                        <span className="font-semibold">
                          {analytics?.listings.avgTimeToApproval || t("admin.dashboardPage.cards.stats.notAvailable")}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{t("admin.dashboardPage.cards.stats.activeListings")}</span>
                        <span className="font-semibold">
                          {analytics?.listings.byStatus.approved || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

