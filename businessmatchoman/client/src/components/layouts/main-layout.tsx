import React, { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Home,
  LogIn,
  Search,
  User,
  Menu,
  X,
  Settings,
  ListChecks,
  LayoutList,
  FileCheck2,
  BookOpen,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { LanguageSwitcher } from "@/components/language-switcher";

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const { toast } = useToast();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const logout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        toast({
          title: t("Logged out successfully"),
        });
      },
    });
  };

  const navItems = [
    { href: "/", label: t("Home"), icon: <Home className="h-5 w-5" /> },
    {
      href: "/listings",
      label: t("Listings"),
      icon: <LayoutList className="h-5 w-5" />,
    },
    { href: "/faq", label: t("FAQ"), icon: <BookOpen className="h-5 w-5" /> },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation bar */}
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-900 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/">
                <a className="flex items-center">
                  <img
                    src="/logo.png"
                    alt="TEEJARTI Logo"
                    className="h-10 w-auto object-contain"
                  />
                  <span className="ml-2 font-bold text-lg hidden md:block text-orange-600">
                    TEEJARTI
                  </span>
                </a>
              </Link>
            </div>

            {/* Desktop navigation */}
            <nav className="hidden md:flex space-x-4">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <a
                    className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1 ${
                      location === item.href
                        ? "bg-orange-100 text-orange-600"
                        : "text-gray-600 hover:bg-orange-50 hover:text-orange-600"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </a>
                </Link>
              ))}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2">
              <LanguageSwitcher />

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="relative h-9 w-9 rounded-full"
                    >
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{user.username}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard">
                        <a className="w-full flex items-center cursor-pointer">
                          <User className="mr-2 h-4 w-4" />
                          {t("Dashboard")}
                        </a>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/create-listing">
                        <a className="w-full flex items-center cursor-pointer">
                          <ListChecks className="mr-2 h-4 w-4" />
                          {t("Create Listing")}
                        </a>
                      </Link>
                    </DropdownMenuItem>
                    {user.role === "admin" && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin">
                          <a className="w-full flex items-center cursor-pointer">
                            <Settings className="mr-2 h-4 w-4" />
                            {t("Admin Panel")}
                          </a>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout}>
                      <LogIn className="mr-2 h-4 w-4 rotate-180" />
                      {t("Logout")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  asChild
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <Link href="/auth">
                    <a className="flex items-center">
                      <LogIn className="mr-2 h-4 w-4" />
                      {t("Login")}
                    </a>
                  </Link>
                </Button>
              )}

              {/* Mobile menu button */}
              <div className="md:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="relative h-9 w-9 p-0 rounded-full"
                >
                  {isMenuOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile navigation */}
          {isMenuOpen && (
            <div className="md:hidden py-2">
              <div className="space-y-1 pb-3 pt-2">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <a
                      className={`block px-3 py-2 rounded-md text-base font-medium flex items-center gap-2 ${
                        location === item.href
                          ? "bg-orange-100 text-orange-600"
                          : "text-gray-600 hover:bg-orange-50 hover:text-orange-600"
                      }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.icon}
                      {item.label}
                    </a>
                  </Link>
                ))}
                {user && (
                  <>
                    <Link href="/dashboard">
                      <a
                        className="block px-3 py-2 rounded-md text-base font-medium flex items-center gap-2 text-gray-600 hover:bg-orange-50 hover:text-orange-600"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <User className="h-5 w-5" />
                        {t("Dashboard")}
                      </a>
                    </Link>
                    <Link href="/create-listing">
                      <a
                        className="block px-3 py-2 rounded-md text-base font-medium flex items-center gap-2 text-gray-600 hover:bg-orange-50 hover:text-orange-600"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <ListChecks className="h-5 w-5" />
                        {t("Create Listing")}
                      </a>
                    </Link>
                    {user.role === "admin" && (
                      <Link href="/admin">
                        <a
                          className="block px-3 py-2 rounded-md text-base font-medium flex items-center gap-2 text-gray-600 hover:bg-orange-50 hover:text-orange-600"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <Settings className="h-5 w-5" />
                          {t("Admin Panel")}
                        </a>
                      </Link>
                    )}
                    <button
                      className="w-full px-3 py-2 rounded-md text-base font-medium flex items-center gap-2 text-gray-600 hover:bg-orange-50 hover:text-orange-600"
                      onClick={() => {
                        logout();
                        setIsMenuOpen(false);
                      }}
                    >
                      <LogIn className="h-5 w-5 rotate-180" />
                      {t("Logout")}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow">{children}</main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white mt-auto">
        <div className="container mx-auto py-6 px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <p className="text-sm">
                © {new Date().getFullYear()} TEEJARTI.{" "}
                {t("All rights reserved.")}
              </p>
            </div>
            <div className="flex gap-4">
              <Link href="/">
                <a className="text-sm text-gray-300 hover:text-white">
                  {t("Home")}
                </a>
              </Link>
              <Link href="/listings">
                <a className="text-sm text-gray-300 hover:text-white">
                  {t("Listings")}
                </a>
              </Link>
              <Link href="/success-stories">
                <a className="text-sm text-gray-300 hover:text-white">
                  {t("Success Stories")}
                </a>
              </Link>
              {!user && (
                <Link href="/auth">
                  <a className="text-sm text-gray-300 hover:text-white">
                    {t("Login")}
                  </a>
                </Link>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
