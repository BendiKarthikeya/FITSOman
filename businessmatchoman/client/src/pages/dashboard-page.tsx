import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Listing, MessageThread } from "@shared/schema";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import ListingCard from "@/components/listings/listing-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Plus,
  Mail,
  FilePlus,
  User,
  Bell,
  Settings,
  LogOut,
  MessageSquare,
  ArrowRight,
  Clock,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useRTL } from "@/hooks/use-rtl";
import { getProfileImageUrl, getUserInitials } from "@/lib/profile-utils";
import { EditableText } from "@/components/ui/editable-text";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const { user, logoutMutation } = useAuth();
  const [location, navigate] = useLocation();
  const { t } = useTranslation();
  const { isRtl, rtlClass } = useRTL();

  // Fetch user's listings
  const { data: userListings, isLoading: isLoadingListings } = useQuery<
    Listing[]
  >({
    queryKey: ["/api/listings", { userId: user?.id }],
    queryFn: async () => {
      const res = await fetch(`/api/listings?userId=${user?.id}&limit=50`);
      if (!res.ok) {
        throw new Error("Failed to fetch your listings");
      }
      const result = await res.json();
      // The API returns { data: [...], pagination: {...} }
      return result.data || [];
    },
    enabled: !!user,
  });

  // Fetch message threads
  const { data: messageThreads = [], isLoading: isLoadingThreads } = useQuery<MessageThread[]>({
    queryKey: ["/api/messages/threads"],
    enabled: !!user,
  });

  // Format time helper
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return t('common.justNow', 'Just now');
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        navigate("/");
      },
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 py-8 bg-neutral-100">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="md:col-span-1">
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                {/* User Profile Card */}
                <div className="p-6 text-center border-b">
                  <div className="w-20 h-20 rounded-full bg-neutral-200 mx-auto mb-4 flex items-center justify-center">
                    <span className="material-icons text-neutral-500 text-3xl">
                      person
                    </span>
                  </div>
                  <h2 className="text-xl font-bold">{user.fullName}</h2>
                  <p className="text-neutral-500 capitalize">{user.role}</p>
                </div>

                {/* Sidebar Navigation */}
                <nav className="p-2">
                  <ul className="space-y-1">
                    <li>
                      <button
                        onClick={() => setActiveTab("overview")}
                        className={`w-full flex items-center px-4 py-2 rounded-lg text-left text-sm ${
                          activeTab === "overview"
                            ? "bg-primary text-white"
                            : "hover:bg-neutral-100"
                        }`}
                      >
                        <span className="material-icons text-lg mr-3">
                          dashboard
                        </span>
                        {t('dashboard.sidebar.dashboard')}
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => setActiveTab("listings")}
                        className={`w-full flex items-center px-4 py-2 rounded-lg text-left text-sm ${
                          activeTab === "listings"
                            ? "bg-primary text-white"
                            : "hover:bg-neutral-100"
                        }`}
                      >
                        <span className="material-icons text-lg mr-3">
                          storefront
                        </span>
                        {t('dashboard.sidebar.myListings')}
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => setActiveTab("messages")}
                        className={`w-full flex items-center px-4 py-2 rounded-lg text-left text-sm ${
                          activeTab === "messages"
                            ? "bg-primary text-white"
                            : "hover:bg-neutral-100"
                        }`}
                      >
                        <span className="material-icons text-lg mr-3">
                          forum
                        </span>
                        {t('dashboard.sidebar.messages')}
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => setActiveTab("documents")}
                        className={`w-full flex items-center px-4 py-2 rounded-lg text-left text-sm ${
                          activeTab === "documents"
                            ? "bg-primary text-white"
                            : "hover:bg-neutral-100"
                        }`}
                      >
                        <span className="material-icons text-lg mr-3">
                          description
                        </span>
                        {t('dashboard.sidebar.documents')}
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => setActiveTab("profile")}
                        className={`w-full flex items-center px-4 py-2 rounded-lg text-left text-sm ${
                          activeTab === "profile"
                            ? "bg-primary text-white"
                            : "hover:bg-neutral-100"
                        }`}
                      >
                        <span className="material-icons text-lg mr-3">
                          person
                        </span>
                        {t('dashboard.sidebar.profile')}
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => setActiveTab("settings")}
                        className={`w-full flex items-center px-4 py-2 rounded-lg text-left text-sm ${
                          activeTab === "settings"
                            ? "bg-primary text-white"
                            : "hover:bg-neutral-100"
                        }`}
                      >
                        <span className="material-icons text-lg mr-3">
                          settings
                        </span>
                        {t('dashboard.sidebar.settings')}
                      </button>
                    </li>
                  </ul>

                  <Separator className="my-3" />

                  <Button
                    variant="ghost"
                    className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={handleLogout}
                    disabled={logoutMutation.isPending}
                  >
                    {logoutMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <LogOut className="h-4 w-4 mr-2" />
                    )}
                    {t('dashboard.sidebar.logout')}
                  </Button>
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="md:col-span-3">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                {/* Overview Tab */}
                <TabsContent value="overview">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          {t('dashboard.overview.activeListings')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {isLoadingListings ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            userListings?.length || 0
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t('dashboard.overview.businessesListed')}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          {t('dashboard.overview.unreadMessages')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">
                          {t('dashboard.overview.messagesFromBuyers')}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          {t('dashboard.overview.profileCompletion')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">75%</div>
                        <p className="text-xs text-muted-foreground">
                          {t('dashboard.overview.completeProfileVisibility')}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>
                        <EditableText
                          translationKey="dashboard.overview.quickActions"
                          section="dashboard"
                          keyName="overview.quickActions"
                          as="span"
                        />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Button
                          variant="outline"
                          className="h-auto py-4 flex flex-col items-center"
                          onClick={() => navigate("/create-listing")}
                        >
                          <Plus className="h-6 w-6 mb-2" />
                          <span>
                            <EditableText
                              translationKey="dashboard.overview.createListing"
                              section="dashboard"
                              keyName="overview.createListing"
                              as="span"
                            />
                          </span>
                        </Button>
                        <Button
                          variant="outline"
                          className="h-auto py-4 flex flex-col items-center"
                          onClick={() => setActiveTab("messages")}
                        >
                          <Mail className="h-6 w-6 mb-2" />
                          <span>
                            <EditableText
                              translationKey="dashboard.overview.checkMessages"
                              section="dashboard"
                              keyName="overview.checkMessages"
                              as="span"
                            />
                          </span>
                        </Button>
                        <Button
                          variant="outline"
                          className="h-auto py-4 flex flex-col items-center"
                          onClick={() => setActiveTab("documents")}
                        >
                          <FilePlus className="h-6 w-6 mb-2" />
                          <span>
                            <EditableText
                              translationKey="dashboard.overview.uploadDocuments"
                              section="dashboard"
                              keyName="overview.uploadDocuments"
                              as="span"
                            />
                          </span>
                        </Button>
                        <Button
                          variant="outline"
                          className="h-auto py-4 flex flex-col items-center"
                          onClick={() => setActiveTab("profile")}
                        >
                          <User className="h-6 w-6 mb-2" />
                          <span>
                            <EditableText
                              translationKey="dashboard.overview.editProfile"
                              section="dashboard"
                              keyName="overview.editProfile"
                              as="span"
                            />
                          </span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>
                        <EditableText
                          translationKey="dashboard.overview.recentListings"
                          section="dashboard"
                          keyName="overview.recentListings"
                          as="span"
                        />
                      </CardTitle>
                      <CardDescription>
                        <EditableText
                          translationKey="dashboard.overview.recentListingsDesc"
                          section="dashboard"
                          keyName="overview.recentListingsDesc"
                          as="span"
                          multiline
                        />
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isLoadingListings ? (
                        <div className="flex justify-center items-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      ) : userListings && userListings.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                          {userListings.slice(0, 3).map((listing) => (
                            <ListingCard key={listing.id} listing={listing} />
                          ))}
                          {userListings.length > 3 && (
                            <Button
                              variant="outline"
                              className="w-full mt-2"
                              onClick={() => setActiveTab("listings")}
                            >
                              <EditableText
                                translationKey="dashboard.overview.viewAllListings"
                                section="dashboard"
                                keyName="overview.viewAllListings"
                                as="span"
                              />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 mb-4">
                            <span className="material-icons text-neutral-500 text-3xl">
                              storefront
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold mb-2">
                            {t('dashboard.listings.noListingsYet')}
                          </h3>
                          <p className="text-neutral-500 mb-4">
                            {t('dashboard.listings.noListingsDesc')}
                          </p>
                          <Button onClick={() => navigate("/create-listing")}>
                            <EditableText
                              translationKey="dashboard.overview.createListing"
                              section="dashboard"
                              keyName="overview.createListing"
                              as="span"
                            />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Listings Tab */}
                <TabsContent value="listings">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>
                          <EditableText
                            translationKey="dashboard.listings.title"
                            section="dashboard"
                            keyName="listings.title"
                            as="span"
                          />
                        </CardTitle>
                        <CardDescription>
                          <EditableText
                            translationKey="dashboard.listings.description"
                            section="dashboard"
                            keyName="listings.description"
                            as="span"
                            multiline
                          />
                        </CardDescription>
                      </div>
                      <Button onClick={() => navigate("/create-listing")}>
                        <Plus className="h-4 w-4 mr-2" />
                        <EditableText
                          translationKey="dashboard.listings.newListing"
                          section="dashboard"
                          keyName="listings.newListing"
                          as="span"
                        />
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {isLoadingListings ? (
                        <div className="flex justify-center items-center py-12">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      ) : userListings && userListings.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {userListings.map((listing) => (
                            <ListingCard key={listing.id} listing={listing} />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 mb-4">
                            <span className="material-icons text-neutral-500 text-3xl">
                              storefront
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold mb-2">
                            {t('dashboard.listings.noListingsYet')}
                          </h3>
                          <p className="text-neutral-500 mb-4">
                            {t('dashboard.listings.noListingsDesc')}
                          </p>
                          <Button onClick={() => navigate("/create-listing")}>
                            <EditableText
                              translationKey="dashboard.overview.createListing"
                              section="dashboard"
                              keyName="overview.createListing"
                              as="span"
                            />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Messages Tab */}
                <TabsContent value="messages">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <MessageSquare className="h-5 w-5" />
                          {t('dashboard.messages.title', 'Messages')}
                        </CardTitle>
                        <CardDescription>
                          {t('dashboard.messages.description', 'Communicate with potential buyers or sellers')}
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate("/messages")}
                        className="flex items-center gap-2"
                      >
                        {t('dashboard.messages.viewAll', 'View All')}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {isLoadingThreads ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : messageThreads.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 mb-4">
                            <Mail className="h-8 w-8 text-neutral-500" />
                          </div>
                          <h3 className="text-lg font-semibold mb-2">
                            {t('dashboard.messages.noMessagesYet', 'No Messages Yet')}
                          </h3>
                          <p className="text-neutral-500 mb-4">
                            {t('dashboard.messages.noMessagesDesc', "You don't have any messages in your inbox")}
                          </p>
                          <Button
                            variant="outline"
                            onClick={() => navigate("/listings")}
                          >
                            {t('dashboard.messages.browseListings', 'Browse Listings')}
                          </Button>
                        </div>
                      ) : (
                        <ScrollArea className="h-[400px]">
                          <div className="space-y-4">
                            {messageThreads.slice(0, 5).map((thread) => (
                              <div
                                key={thread.otherUser.id}
                                className="flex items-start space-x-3 rtl:space-x-reverse p-3 rounded-lg hover:bg-neutral-50 cursor-pointer transition-colors"
                                onClick={() => navigate(`/messages?user=${thread.otherUser.id}`)}
                              >
                                <Avatar className="h-12 w-12">
                                  <AvatarImage 
                                    src={getProfileImageUrl(thread.otherUser.profileImageUrl)} 
                                    alt={thread.otherUser.fullName} 
                                  />
                                  <AvatarFallback className="bg-neutral-200 text-neutral-700 font-medium">
                                    {getUserInitials(thread.otherUser.fullName, thread.otherUser.username)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <h4 className="text-sm font-medium text-neutral-900 truncate">
                                      {thread.otherUser.fullName}
                                    </h4>
                                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                      {thread.unreadCount > 0 && (
                                        <div className="bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                          {thread.unreadCount > 9 ? '9+' : thread.unreadCount}
                                        </div>
                                      )}
                                      <span className="text-xs text-neutral-500 flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatTime(thread.lastMessage.createdAt!.toString())}
                                      </span>
                                    </div>
                                  </div>
                                  <p className="text-sm text-neutral-600 truncate mb-1">
                                    {thread.lastMessage.content}
                                  </p>
                                  {thread.listing && (
                                    <p className="text-xs text-primary font-medium truncate">
                                      {isRtl ? thread.listing.title_ar : thread.listing.title_en}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                            {messageThreads.length > 5 && (
                              <div className="pt-4 border-t">
                                <Button
                                  variant="ghost"
                                  className="w-full"
                                  onClick={() => navigate("/messages")}
                                >
                                  {t('dashboard.messages.viewAllMessages', `View all ${messageThreads.length} conversations`)}
                                </Button>
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Documents Tab */}
                <TabsContent value="documents">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>{t('dashboard.documents.title')}</CardTitle>
                        <CardDescription>
                          {t('dashboard.documents.description')}
                        </CardDescription>
                      </div>
                      <Button disabled>
                        <FilePlus className="h-4 w-4 mr-2" />
                        {t('dashboard.documents.uploadDocument')}
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-12">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 mb-4">
                          <span className="material-icons text-neutral-500 text-3xl">
                            description
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold mb-2">
                          {t('dashboard.documents.noDocuments')}
                        </h3>
                        <p className="text-neutral-500 mb-4">
                          {t('dashboard.documents.noDocumentsDesc')}
                        </p>
                        <Button variant="outline" disabled>
                          {t('dashboard.documents.uploadDocuments')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Profile Tab */}
                <TabsContent value="profile">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('dashboard.profile.title')}</CardTitle>
                      <CardDescription>
                        {t('dashboard.profile.description')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h3 className="text-lg font-semibold mb-4">
                            {t('dashboard.profile.personalInformation')}
                          </h3>
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm text-neutral-500">
                                {t('dashboard.profile.fullName')}
                              </p>
                              <p className="font-medium">{user.fullName}</p>
                            </div>
                            <div>
                              <p className="text-sm text-neutral-500">{t('dashboard.profile.email')}</p>
                              <p className="font-medium">{user.email}</p>
                            </div>
                            <div>
                              <p className="text-sm text-neutral-500">
                                {t('dashboard.profile.username')}
                              </p>
                              <p className="font-medium">{user.username}</p>
                            </div>
                            <div>
                              <p className="text-sm text-neutral-500">{t('dashboard.profile.role')}</p>
                              <p className="font-medium capitalize">
                                {user.role}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold mb-4">
                            {t('dashboard.profile.businessInformation')}
                          </h3>
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm text-neutral-500">
                                {t('dashboard.profile.company')}
                              </p>
                              <p className="font-medium">
                                {user.company || t('dashboard.profile.notProvided')}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-neutral-500">
                                {t('dashboard.profile.position')}
                              </p>
                              <p className="font-medium">
                                {user.position || t('dashboard.profile.notProvided')}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-neutral-500">
                                {t('dashboard.profile.location')}
                              </p>
                              <p className="font-medium">
                                {user.location || t('dashboard.profile.notProvided')}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-neutral-500">{t('dashboard.profile.phone')}</p>
                              <p className="font-medium">
                                {user.phone || t('dashboard.profile.notProvided')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 pt-6 border-t border-neutral-200">
                        <h3 className={`text-lg font-semibold mb-4 ${isRtl ? 'font-arabic' : ''}`}>{t('dashboard.profile.bio')}</h3>
                        <p className={`text-neutral-700 ${isRtl ? 'font-arabic text-right' : ''}`}>
                          {user.bio || t('dashboard.profile.notProvided')}
                        </p>
                      </div>

                      <div className="mt-6 flex justify-end">
                        <Button variant="outline" disabled className={isRtl ? 'font-arabic' : ''}>
                          {t('dashboard.profile.editProfile')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings">
                  <Card>
                    <CardHeader>
                      <CardTitle className={isRtl ? 'font-arabic' : ''}>{t('dashboard.settings.title')}</CardTitle>
                      <CardDescription className={isRtl ? 'font-arabic' : ''}>
                        {t('dashboard.settings.description')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div>
                          <h3 className={`text-lg font-semibold mb-4 ${isRtl ? 'font-arabic' : ''}`}>
                            {t('dashboard.settings.notificationPreferences')}
                          </h3>
                          <p className={`text-neutral-500 mb-4 ${isRtl ? 'font-arabic text-right' : ''}`}>
                            {t('dashboard.settings.notificationComingSoon')}
                          </p>
                        </div>

                        <div>
                          <h3 className={`text-lg font-semibold mb-4 ${isRtl ? 'font-arabic' : ''}`}>
                            {t('dashboard.settings.securitySettings')}
                          </h3>
                          <p className={`text-neutral-500 mb-4 ${isRtl ? 'font-arabic text-right' : ''}`}>
                            {t('dashboard.settings.securityComingSoon')}
                          </p>
                        </div>

                        <div>
                          <h3 className={`text-lg font-semibold mb-4 ${isRtl ? 'font-arabic' : ''}`}>
                            {t('dashboard.settings.accountManagement')}
                          </h3>
                          <div className="mt-4">
                            <Button variant="destructive" disabled className={isRtl ? 'font-arabic' : ''}>
                              {t('dashboard.settings.deleteAccount')}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
