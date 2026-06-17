import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Menu, X, Bell, User, Settings, LogOut, BarChart3, ClipboardList, Home, Heart, TrendingUp, Brain, Shield, Building2, Layers, Lock, FileText, CreditCard, Clock, Database, Sparkles, AlertCircle, Target, Users, Activity } from "lucide-react";
import { auth, type AuthUser } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export default function Navigation() {
  const [location, navigate] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(auth.getUser());
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const { toast } = useToast();
  const { t } = useTranslation();

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

  const { data: organizationsData } = useQuery<{ total: number; items: Array<{ id: string; name: string }> }>({
    queryKey: ["/api/public/organizations"],
    queryFn: async () => {
      const res = await fetch("/api/public/organizations");
      if (!res.ok) return { total: 0, items: [] };
      return res.json();
    }
  });
  const organizations = organizationsData?.items || [];

  const handleAuth = async (formData: FormData) => {
    try {
      const username = formData.get("username") as string;
      const password = formData.get("password") as string;
      const email = formData.get("email") as string;

      if (isLogin) {
        // Sign in only requires username/password
        await auth.login(username, password);
        toast({ title: "Welcome back!" });
      } else {
        // Sign up requires organization selection
        const organizationId = (formData.get("organizationId") as string) || selectedOrganizationId;
        if (!organizationId) {
          throw new Error("Please select an organization");
        }
        await auth.register(username, email, password, organizationId);
        toast({ title: "Account created successfully!" });
      }
      setShowLoginDialog(false);
      // Ensure the UI reflects the new auth state everywhere
      if (typeof window !== 'undefined') window.location.reload();
    } catch (error: any) {
      
      toast({
        title: "Authentication failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    auth.logout();
    toast({ title: "Logged out successfully" });
    if (typeof window !== 'undefined') window.location.reload();
  };

  const handleSSOLogin = (provider: "google" | "microsoft") => {
    // During signup, organization is required
    if (!isLogin && !selectedOrganizationId) {
      toast({
        title: "Organization required",
        description: "Please select an organization before continuing.",
        variant: "destructive",
      });
      return;
    }
    
    // Build SSO URL - include organization if provided (signup), optional for signin
    const ssoUrl = `/api/auth/sso/${provider}${
      selectedOrganizationId ? `?organizationId=${encodeURIComponent(selectedOrganizationId)}` : ''
    }`;
    window.location.href = ssoUrl;
  };

  // Navigation items by role
  const navItems = user
    ? user.role === 'admin'
      ? [
        { path: "/admin/dashboard", label: t('admin.userManagement.title'), icon: Shield },
        { path: "/admin/organizations", label: t('admin.organizations.title'), icon: Building2 },
        { path: "/admin/departments", label: t('admin.departments.title'), icon: Layers },
        { path: "/admin/permissions", label: t('admin.permissions.title'), icon: Lock },
        { path: "/admin/advanced-permissions", label: t('admin.advancedPermissions.title'), icon: Shield },
        { path: "/admin/sessions", label: t('admin.sessionManagement.title'), icon: Clock },
        { path: "/admin/audit", label: t('admin.auditLog.title'), icon: FileText },
        { path: "/admin/subscriptions", label: t('admin.subscriptions.title'), icon: CreditCard },
        { path: "/admin/data-transfer", label: t('admin.dataTransfer.title'), icon: Database },
      ]
      : [
        { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
        { path: "/surveys", label: "Surveys", icon: ClipboardList },
        { path: "/analytics", label: "Analytics", icon: BarChart3 },
        { path: "/analytics/action-plans", label: "Action Planning", icon: Target },
        { path: "/analytics/leadership", label: "Team Insights", icon: Users },
        { path: "/analytics/hr-interventions", label: "HR Interventions", icon: Activity },
        { path: "/analytics/monitoring", label: "Monitoring", icon: AlertCircle },
      ]

    : [];

  return (
    <nav className="bg-background shadow-sm border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0">
              <div className="flex items-center space-x-2">
                {/* Minimal Logo Icon */}
                <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center">
                  <div className="text-primary-foreground font-bold text-sm">IP</div>
                </div>
                {/* Corporate Logo Text */}
                <div className="text-xl font-semibold text-foreground tracking-wide">
                  InsightPulse
                </div>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:block ml-12">
              <div className="flex items-center space-x-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.path} href={item.path}>
                      <Button
                        variant={location === item.path ? "default" : "ghost"}
                        size="sm"
                        className={`flex items-center space-x-2 ${location === item.path
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </Button>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center space-x-4">
            {user ? (
              <>
                {/* Notifications */}
                <Button variant="ghost" size="sm" className="relative">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 w-5 h-5 text-xs flex items-center justify-center p-0">
                      {unreadCount}
                    </Badge>
                  )}
                </Button>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {user.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuItem className="flex-col items-start">
                      <div className="font-medium">{user.username}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => navigate('/settings/crm')}>
                      <Database className="mr-2 h-4 w-4" />
                      CRM Settings
                    </DropdownMenuItem>

                    {user.role === 'superuser' && (
                      <DropdownMenuItem onClick={() => navigate('/platform-dashboard')}>
                        <Shield className="mr-2 h-4 w-4" />
                        Admin Dashboard
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" onClick={() => setIsLogin(true)}>
                      Log In
                    </Button>
                  </DialogTrigger>
                  <DialogTrigger asChild>
                    <Button variant="secondary" onClick={() => setIsLogin(false)}>
                      Book a Demo
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>{isLogin ? "Sign In" : "Create Account"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); handleAuth(new FormData(e.currentTarget)); }} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input id="username" name="username" required />
                      </div>
                      {!isLogin && (
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input id="email" name="email" type="email" required />
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" name="password" type="password" required />
                      </div>
                      {!isLogin && (
                        <div className="space-y-2">
                          <Label htmlFor="organizationId">Organization</Label>
                          <select
                            id="organizationId"
                            name="organizationId"
                            required
                            value={selectedOrganizationId}
                            onChange={(e) => setSelectedOrganizationId(e.target.value)}
                            className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                          >
                            <option value="">Select an organization</option>
                            {organizations.map(org => (
                              <option key={org.id} value={org.id}>{org.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div className="flex flex-col space-y-2">
                        <Button type="submit" className="w-full">
                          {isLogin ? "Sign In" : "Create Account"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleSSOLogin("google")}
                        >
                          Continue with Google
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleSSOLogin("microsoft")}
                        >
                          Continue with Microsoft
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setIsLogin(!isLogin)}
                        >
                          {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
                        </Button>
                      </div>
                      {isLogin && (
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>Demo credentials:</p>
                          <p>Admin: admin / admin123</p>
                          <p>User: demo / demo123</p>
                        </div>
                      )}
                    </form>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden py-4 border-t border-border">
            <div className="flex flex-col space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.path} href={item.path}>
                    <div
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${location === item.path
                          ? "bg-primary text-primary-foreground"
                          : "text-gray-700 hover:bg-gray-100"
                        }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                  </Link>
                );
              })}
              {!user && (
                <Button
                  className="mx-3 mt-4"
                  onClick={() => {
                    setShowLoginDialog(true);
                    setIsMenuOpen(false);
                  }}
                >
                  Sign In
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
