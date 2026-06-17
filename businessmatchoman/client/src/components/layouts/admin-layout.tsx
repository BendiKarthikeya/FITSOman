import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { AdminBackButton } from "@/components/admin/back-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BarChart,
  Settings,
  Users,
  FileCheck,
  ClipboardList,
  LogOut,
  User,
  ChevronDown,
  Shield,
  ArrowLeft,
  Home,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

type NavItemProps = {
  href: string;
  label: string;
  icon: ReactNode;
  isActive?: boolean;
};

const NavItem = ({ href, label, icon, isActive }: NavItemProps) => {
  return (
    <Link href={href}>
      <Button
        variant={isActive ? "default" : "ghost"}
        className="w-full justify-start mb-1"
      >
        {icon}
        <span className="ml-2">{label}</span>
      </Button>
    </Link>
  );
};

type AdminLayoutProps = {
  children: ReactNode;
};

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        toast({
          title: "Logged out successfully",
          description: "You have been logged out of your account.",
        });
      },
    });
  };

  // Get user initials for avatar fallback
  const getInitials = () => {
    if (!user?.fullName) return "??";
    return user.fullName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="flex h-screen bg-muted/20">
      {/* Sidebar */}
      <div className="w-64 border-r bg-card">
        <div className="p-6">
          <Link href="/admin">
            <div className="flex items-center space-x-2">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Admin Only</h1>
            </div>
          </Link>
        </div>

        <Separator />

        <ScrollArea className="h-[calc(100vh-64px)] py-4">
          <div className="px-4 py-2">
            <h3 className="mb-2 pl-4 text-xs font-semibold uppercase tracking-tight text-muted-foreground">
              Dashboard
            </h3>
            <NavItem
              href="/admin"
              icon={<BarChart className="h-4 w-4" />}
              label="Analytics"
              isActive={location === "/admin"}
            />
            <NavItem
              href="/admin/kyc"
              icon={<FileCheck className="h-4 w-4" />}
              label="KYC Management"
              isActive={location.startsWith("/admin/kyc")}
            />
            <NavItem
              href="/admin/listings"
              icon={<ClipboardList className="h-4 w-4" />}
              label="Listings"
              isActive={location.startsWith("/admin/listings")}
            />
            <NavItem
              href="/admin/users"
              icon={<Users className="h-4 w-4" />}
              label="User Management"
              isActive={location.startsWith("/admin/users")}
            />
            <NavItem
              href="/admin/settings"
              icon={<Settings className="h-4 w-4" />}
              label="Settings"
              isActive={location.startsWith("/admin/settings")}
            />
          </div>

          <Separator className="my-4" />

          <div className="px-4 py-2">
            <h3 className="mb-2 pl-4 text-xs font-semibold uppercase tracking-tight text-muted-foreground">
              Platform
            </h3>
            <Link href="/">
              <Button
                variant="ghost"
                className="w-full justify-start mb-1 bg-yellow-100 hover:bg-yellow-200 border border-yellow-300 text-yellow-800"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                <span className="ml-1 font-medium">Exit Admin Mode</span>
              </Button>
            </Link>
          </div>
        </ScrollArea>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b bg-background flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Badge
              variant="secondary"
              className="bg-primary/10 hover:bg-primary/20 transition-colors"
            >
              <Shield className="h-3 w-3 mr-1" />
              Admin Only Mode
            </Badge>

            <Link href="/">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2 bg-yellow-100 hover:bg-yellow-200 border-yellow-300"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="font-medium">Exit Admin Mode</span>
              </Button>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={user?.profileImageUrl || ""}
                      alt={user?.fullName || "User"}
                    />
                    <AvatarFallback>{getInitials()}</AvatarFallback>
                  </Avatar>
                  <div className="flex items-center">
                    <span className="mr-2">
                      {user?.fullName || "Admin User"}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">
                    <User className="h-4 w-4 mr-2" />
                    User Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-auto p-6 bg-background/95">
          {/* Big Warning Banner with Back Button */}
          <div className="mb-6 bg-yellow-100 p-4 rounded-lg border-2 border-yellow-400 shadow-lg">
            <div className="flex flex-col items-center justify-center">
              <Link href="/">
                <Button
                  variant="default"
                  size="lg"
                  className="w-full mb-2 bg-primary hover:bg-primary/80 text-white px-8 py-4 rounded-md flex items-center justify-center gap-3 shadow-lg text-lg"
                >
                  <ArrowLeft className="h-6 w-6" />
                  <span className="font-bold">Return to Main Site</span>
                </Button>
              </Link>
              <p className="text-yellow-800 text-center font-medium">
                You are currently in Admin Mode. Click the button above to exit.
              </p>
            </div>
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
