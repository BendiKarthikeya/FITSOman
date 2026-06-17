import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import MobileNavigation from "@/components/layout/mobile-navigation";
import { PageTransition } from "@/components/ui/page-transition";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "react-i18next";
import { useRTL } from "@/hooks/use-rtl";
import { getProfileImageUrl, getUserInitials } from "@/lib/profile-utils";
import { queryClient as globalQueryClient } from "@/lib/queryClient";
import { 
  MessageSquare, 
  Send, 
  Search, 
  Clock,
  CheckCheck,
  User,
  ArrowLeft
} from "lucide-react";
import type { Message, User as UserType, MessageThread } from "@shared/schema";

export default function MessagesPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { isRtl } = useRTL();
  const queryClient = useQueryClient();
  const searchParams = new URLSearchParams(useSearch());
  const [, setLocation] = useLocation();
  
  const [selectedConversation, setSelectedConversation] = useState<MessageThread | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [latestTs, setLatestTs] = useState<number>(0);

  // Get message threads for the user
  const { data: threads = [], isLoading: threadsLoading } = useQuery<MessageThread[]>({
    queryKey: ["/api/messages/threads"],
    enabled: !!user,
  });

  // Get conversation data
  const { data: conversationMessages = [], isLoading: conversationLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages/conversation", selectedConversation?.otherUser.id],
    queryFn: () => 
      apiRequest("GET", `/api/messages/conversation/${selectedConversation?.otherUser.id}`).then(res => res.json()),
    enabled: !!selectedConversation?.otherUser.id,
  });

  // Lightweight polling for updates (fallback to avoid SSE auth header issues)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const res = await apiRequest("GET", `/api/messages/poll?since=${latestTs}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          if (data.latest && data.latest > latestTs) {
            setLatestTs(data.latest);
            // Invalidate threads and active conversation
            globalQueryClient.invalidateQueries({ queryKey: ["/api/messages/threads"] });
            if (selectedConversation?.otherUser.id) {
              globalQueryClient.invalidateQueries({ queryKey: ["/api/messages/conversation", selectedConversation.otherUser.id] });
            }
          }
        }
      } catch {}
    }, 10000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [user, latestTs, selectedConversation?.otherUser.id]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (messageData: { receiverId: number; content: string; listingId?: number; contactId?: number }) =>
      apiRequest("POST", "/api/messages", messageData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/threads"] });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/messages/conversation", selectedConversation?.otherUser.id] 
      });
      setNewMessage("");
    },
  });

  // Mark thread as read mutation
  const markThreadReadMutation = useMutation({
    mutationFn: (otherUserId: number) =>
      apiRequest("PATCH", `/api/messages/threads/${otherUserId}/read`),
    onSuccess: (_, otherUserId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/threads"] });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/messages/conversation", otherUserId] 
      });
    },
  });

  // Use threads directly from API
  const conversations: MessageThread[] = threads as MessageThread[];

  // Auto-mark as read when conversation becomes active or new messages arrive
  useEffect(() => {
    if (selectedConversation && selectedConversation.unreadCount > 0) {
      markThreadReadMutation.mutate(selectedConversation.otherUser.id);
    }
  }, [selectedConversation?.otherUser.id, selectedConversation?.unreadCount]);

  // Auto-mark as read when new messages arrive in the active conversation
  useEffect(() => {
    if (selectedConversation && conversationMessages.length > 0) {
      const hasUnreadFromOther = conversationMessages.some(
        msg => msg.senderId === selectedConversation.otherUser.id && !msg.read
      );
      if (hasUnreadFromOther) {
        markThreadReadMutation.mutate(selectedConversation.otherUser.id);
      }
    }
  }, [conversationMessages, selectedConversation?.otherUser.id]);

  // Handle deep-linking from contact forms
  useEffect(() => {
    const sellerId = searchParams.get('seller');
    const listingId = searchParams.get('listing');
    
    if (sellerId && threads.length > 0) {
      // Find conversation with the specified seller
      const targetConversation = threads.find(
        (thread) => thread.otherUser.id === parseInt(sellerId)
      );
      
      if (targetConversation) {
        setSelectedConversation(targetConversation);
        setShowMobileChat(true); // Auto-open chat on mobile
        
        // Clear URL parameters after successful navigation
        setLocation('/messages');
      }
    }
  }, [threads, searchParams, setLocation]);

  // Filter conversations based on search
  const filteredConversations = conversations.filter(conv =>
    conv.otherUser.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.otherUser.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;
    
    sendMessageMutation.mutate({
      receiverId: selectedConversation.otherUser.id,
      content: newMessage.trim(),
      listingId: selectedConversation.listing?.id,
    });
  };

  const formatTime = (date: string | Date) => {
    return new Intl.DateTimeFormat(isRtl ? 'ar' : 'en', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const formatDate = (date: string | Date) => {
    return new Intl.DateTimeFormat(isRtl ? 'ar' : 'en', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date));
  };

  if (!user) {
    return <div>{t('auth.loginRequired')}</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <PageTransition>
        <main className="flex-1 bg-neutral-cream" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary-blue mb-2">
            {t('messages.title', 'Messages')}
          </h1>
          <p className="text-primary-blue/70">
            {t('messages.subtitle', 'Connect with buyers and sellers')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[500px] lg:h-[600px]">
          {/* Conversations List */}
          <Card className={`lg:col-span-1 ${showMobileChat ? 'hidden lg:block' : 'block'}`}>
            <CardHeader className="pb-3">
              <div className="relative">
                <Search className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-primary-blue/50 h-4 w-4`} />
                <Input
                  placeholder={t('messages.searchPlaceholder', 'Search conversations...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={isRtl ? 'pr-10 text-right' : 'pl-10 text-left'}
                  dir={isRtl ? 'rtl' : 'ltr'}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {threadsLoading ? (
                  <div className="p-4 text-center text-primary-blue/60">
                    {t('common.loading', 'Loading...')}
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-4 text-center text-primary-blue/60">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-primary-blue/40" />
                    <p>{t('messages.noConversations', 'No conversations yet')}</p>
                    <p className="text-sm mt-2">
                      {t('messages.startConversation', 'Contact a seller to start chatting')}
                    </p>
                  </div>
                ) : (
                  filteredConversations.map((conversation) => (
                    <div
                      key={conversation.otherUser.id}
                      className={`p-4 border-b cursor-pointer hover:bg-accent-gold/5 transition-colors ${
                        selectedConversation?.otherUser.id === conversation.otherUser.id 
                          ? 'bg-accent-gold/10 border-accent-gold/30' 
                          : ''
                      }`}
                      onClick={() => {
                        setSelectedConversation(conversation);
                        setShowMobileChat(true); // Show chat on mobile when conversation selected
                        // Auto-mark as read is handled by useEffect
                      }}
                    >
                      <div className="flex items-start space-x-3 rtl:space-x-reverse">
                        <Avatar className="h-10 w-10">
                          <AvatarImage 
                            src={getProfileImageUrl(conversation.otherUser.profileImageUrl)} 
                            alt={conversation.otherUser.fullName} 
                          />
                          <AvatarFallback className="bg-neutral-200 text-neutral-700 font-medium">
                            {getUserInitials(conversation.otherUser.fullName, conversation.otherUser.username)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-primary-blue truncate">
                              {conversation.otherUser.fullName}
                            </h3>
                            <div className="flex items-center space-x-2 rtl:space-x-reverse">
                              {conversation.unreadCount > 0 && (
                                <Badge variant="secondary" className="bg-accent-gold/20 text-accent-gold">
                                  {conversation.unreadCount}
                                </Badge>
                              )}
                              <span className="text-xs text-primary-blue/60">
                                {formatTime(conversation.lastMessage.createdAt!)}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-primary-blue/70 truncate mt-1">
                            {conversation.lastMessage.content}
                          </p>
                          {conversation.listing && (
                            <p className="text-xs text-accent-gold mt-1">
                              {isRtl ? conversation.listing.title_ar : conversation.listing.title_en}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className={`lg:col-span-2 ${!showMobileChat ? 'hidden lg:block' : 'block'}`}>
            {selectedConversation ? (
              <>
                <CardHeader className="border-b">
                  <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    {/* Mobile Back Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="lg:hidden"
                      onClick={() => setShowMobileChat(false)}
                      data-testid="button-back-mobile"
                    >
                      <ArrowLeft className={`h-5 w-5 ${isRtl ? 'rotate-180' : ''}`} />
                    </Button>
                    <Avatar className="h-10 w-10">
                      <AvatarImage 
                        src={getProfileImageUrl(selectedConversation.otherUser.profileImageUrl)} 
                        alt={selectedConversation.otherUser.fullName} 
                      />
                      <AvatarFallback className="bg-neutral-200 text-neutral-700 font-medium">
                        {getUserInitials(selectedConversation.otherUser.fullName, selectedConversation.otherUser.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="text-lg font-semibold text-primary-blue">
                        {selectedConversation.otherUser.fullName}
                      </h2>
                      {selectedConversation.listing && (
                        <p className="text-sm text-accent-gold">
                          {isRtl ? selectedConversation.listing.title_ar : selectedConversation.listing.title_en}
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-0">
                  <ScrollArea className="h-[400px] p-4">
                    {conversationLoading ? (
                      <div className="text-center text-primary-blue/60">
                        {t('common.loading', 'Loading...')}
                      </div>
                    ) : (conversationMessages as Message[]).length === 0 ? (
                      <div className="text-center text-primary-blue/60">
                        <p>{t('messages.noMessages', 'No messages yet')}</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {(conversationMessages as Message[]).map((message: Message) => {
                          const isOwnMessage = message.senderId === user.id;
                          return (
                            <div
                              key={message.id}
                              className={`flex ${
                                isOwnMessage 
                                  ? (isRtl ? 'justify-start' : 'justify-end')
                                  : (isRtl ? 'justify-end' : 'justify-start')
                              }`}
                            >
                              <div
                                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                  isOwnMessage
                                    ? 'bg-primary-blue text-white'
                                    : 'bg-accent-gold/10 text-primary-blue'
                                }`}
                                dir={isRtl ? 'rtl' : 'ltr'}
                              >
                                <p className="text-sm" dir="auto">{message.content}</p>
                                <div className={`flex items-center mt-1 ${
                                  isOwnMessage ? 'text-white/80' : 'text-primary-blue/60'
                                } ${isRtl ? 'flex-row-reverse justify-between' : 'justify-between'}`}>
                                  <span className="text-xs">
                                    {formatTime(message.createdAt!)}
                                  </span>
                                  {isOwnMessage && (
                                    <CheckCheck className={`h-3 w-3 ${
                                      message.read ? 'text-accent-gold' : 'text-primary-blue/30'
                                    } ${isRtl ? 'ml-2' : 'mr-0'}`} />
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                  
                  <Separator />
                  
                  <div className="p-4">
                    <div className="flex space-x-2 rtl:space-x-reverse">
                      <Input
                        placeholder={t('messages.typePlaceholder', 'Type a message...')}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        className={`flex-1 ${isRtl ? 'text-right' : 'text-left'}`}
                        dir={isRtl ? 'rtl' : 'ltr'}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || sendMessageMutation.isPending}
                        size="icon"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="h-full flex items-center justify-center">
                <div className="text-center text-primary-blue/60">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 text-primary-blue/40" />
                  <h3 className="text-lg font-medium mb-2">
                    {t('messages.selectConversation', 'Select a conversation')}
                  </h3>
                  <p className="text-sm">
                    {t('messages.selectConversationDesc', 'Choose a conversation from the list to start chatting')}
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
          </div>
        </main>
      </PageTransition>
      <Footer />
      <MobileNavigation />
    </div>
  );
}
