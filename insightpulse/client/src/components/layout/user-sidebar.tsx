import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Menu, X, Bell, User, Settings, LogOut, BarChart3, ClipboardList, TrendingUp, Activity, FileText, Target, Users, AlertCircle, Layers, Database, Globe } from "lucide-react";
import { auth, type AuthUser } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from 'react-i18next';

export default function UserSidebar() {
  const { t } = useTranslation();
  const [location, navigate] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(auth.getUser());
  const { toast } = useToast();

  // Subscribe to auth changes
  useEffect(() => {
    return auth.subscribe(setUser);
  }, []);

  // Fetch notifications for authenticated users
  const { data: notifications } = useQuery({
    queryKey: ["/api/notifications", user?.id],
    enabled: !!user?.id,
  });

  const unreadCount = Array.isArray(notifications) ? notifications.filter((n: any) => !n.isRead).length : 0;

  const handleLogout = () => {
    auth.logout();
    toast({ title: t('auth.loggedOut') });
    if (typeof window !== 'undefined') window.location.reload();
  };

  // Navigation items for regular users
  const navItems = [
    { path: "/dashboard", label: t('nav.dashboard'), icon: BarChart3 },
    { path: "/surveys", label: t('nav.surveys'), icon: ClipboardList },
    { path: "/analytics", label: t('nav.analytics'), icon: BarChart3 },
    { path: "/analytics/action-plans", label: "Action Planning", icon: Target },
    { path: "/analytics/leadership", label: "Team Insights", icon: Users },
    { path: "/analytics/monitoring", label: t('nav.monitoring'), icon: AlertCircle },
  ];

  if (!user || user.role === 'admin') {
    return null;
  }

  return (
    <>
      {/* Top bar for mobile */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-background border-b border-border z-50 flex items-center justify-between px-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center">
            <div className="text-primary-foreground font-bold text-sm">IP</div>
          </div>
          <span className="text-xl font-semibold">InsightPulse</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen bg-background border-r border-border z-40 transition-all duration-300 ${isCollapsed ? '-translate-x-full lg:translate-x-0 lg:w-20' : 'translate-x-0 w-64'
          }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          {!isCollapsed && (
            <Link href="/">
              <div className="flex items-center space-x-2 cursor-pointer">
                <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center">
                  <div className="text-primary-foreground font-bold text-sm">IP</div>
                </div>
                <span className="text-xl font-semibold">InsightPulse</span>
              </div>
            </Link>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex"
          >
            {isCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
          </Button>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              return (
                <Link key={item.path} href={item.path}>
                  <div
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      } ${isCollapsed ? 'justify-center' : ''}`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
                  </div>
                </Link>
              );
            })}

          </div>
        </nav>

        {/* User section */}
        <div className="border-t border-border p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className={`flex items-center space-x-3 cursor-pointer hover:bg-accent rounded-lg p-2 ${isCollapsed ? 'justify-center' : ''}`}>
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user?.username}</p>
                    <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
                  </div>
                )}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="w-4 h-4 mr-2" />
                {t('nav.profile')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings/language')}>
                <Globe className="w-4 h-4 mr-2" />
                {t('settings.language.title')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings/crm')}>
                <Database className="w-4 h-4 mr-2" />
                {t('settings.crm.title')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                {t('nav.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          {!isCollapsed && unreadCount > 0 && (
            <div className="mt-2 flex items-center justify-between p-2 bg-accent rounded-lg">
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4" />
                <span className="text-sm">Notifications</span>
              </div>
              <Badge>{unreadCount}</Badge>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile overlay */}
      {!isCollapsed && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsCollapsed(true)}
        />
      )}
    </>
  );
}
