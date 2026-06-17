import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useSettings, refreshSettings } from "@/hooks/use-settings";
import { useRTL } from "@/hooks/use-rtl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, User, Heart, Edit, X } from "lucide-react";
import LanguageToggle from "./language-toggle";
import { useTranslation } from "react-i18next";
import { useEditMode } from "@/hooks/use-edit-mode";
import arabicLogoPath from "@assets/2-removebg-cropped_1754121936801.png";

// NavLink component with underline animation
interface NavLinkProps {
  href: string;
  isActive: boolean;
  children: React.ReactNode;
}

function NavLink({ href, isActive, children }: NavLinkProps) {
  return (
    <Link href={href} className="relative group flex items-center h-full py-2">
      <span
        className={`font-medium transition-colors duration-300 text-base ${
          isActive
            ? "text-accent-gold"
            : "text-neutral-cream hover:text-accent-gold"
        }`}
      >
        {children}
      </span>
      {/* Animated underline */}
      <span
        className={`absolute bottom-0 left-0 h-0.5 bg-accent-gold transition-all duration-300 ease-out ${
          isActive ? "w-full" : "w-0 group-hover:w-full"
        }`}
      />
    </Link>
  );
}

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location, navigate] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { getSetting } = useSettings();
  const { t } = useTranslation();
  const { isRtl, rtlClass } = useRTL();
  const { isEditMode, toggleEditMode } = useEditMode();
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const hamburgerButtonRef = useRef<HTMLButtonElement>(null);
  
  // Show edit button for admins on all pages
  const showEditButton = user?.role === "admin";

  // Settings will be fetched automatically by the useSettings hook with proper caching

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        mobileMenuOpen &&
        mobileMenuRef.current &&
        hamburgerButtonRef.current &&
        !mobileMenuRef.current.contains(event.target as Node) &&
        !hamburgerButtonRef.current.contains(event.target as Node)
      ) {
        closeMobileMenu();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [mobileMenuOpen]);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        navigate("/");
      },
    });
  };

  return (
    <>
      <header className="bg-primary-blue/95 backdrop-blur-md border-b border-secondary-blue sticky top-0 z-50">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo section */}
            <Link href="/" className="flex items-center gap-3">
              {isRtl ? (
                // Arabic logo using the provided complete image
                <img
                  src={arabicLogoPath}
                  alt="تيجارتي"
                  className="h-10 w-auto object-contain brightness-110 contrast-125"
                />
              ) : (
                // English logo
                getSetting("site_logo") ? (
                  <img
                    src={`${getSetting("site_logo")}?nocache=${Date.now()}-${Math.random().toString(36).substring(2, 15)}`}
                    alt="TEEJARTI"
                    className="h-8 w-auto object-contain brightness-110 contrast-125"
                    onError={(e) => {
                      console.log(
                        "[DEBUG] Logo image failed to load, refreshing settings",
                      );
                      e.currentTarget.onerror = null;
                      refreshSettings();
                    }}
                  />
                ) : (
                  <span className="text-neutral-cream text-xl font-bold font-heading">
                    TEEJARTI
                  </span>
                )
              )}
            </Link>

            {/* Desktop Navigation */}
            <nav className={`hidden md:flex items-center ${isRtl ? 'space-x-reverse space-x-6' : 'space-x-6'}`}>
              <NavLink href="/" isActive={location === "/"}>
                {t('nav.home')}
              </NavLink>
              <NavLink href="/listings" isActive={location === "/listings"}>
                {t('nav.listings')}
              </NavLink>

              <NavLink href="/about" isActive={location === "/about"}>
                {t('nav.about')}
              </NavLink>
              <NavLink href="/contact" isActive={location === "/contact"}>
                {t('nav.contact')}
              </NavLink>
              <NavLink href="/faq" isActive={location === "/faq"}>
                {t('nav.faq')}
              </NavLink>
              {user && user.role === "admin" && (
                <NavLink href="/admin" isActive={location.startsWith("/admin")}>
                  {t('nav.admin')}
                </NavLink>
              )}
            </nav>

            {/* User Actions */}
            <div className={`flex items-center ${isRtl ? 'space-x-reverse space-x-3' : 'space-x-3'}`}>
              {/* Edit Mode Toggle - Only for admins on home page */}
              {showEditButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleEditMode}
                  className={`hidden md:flex items-center gap-2 text-neutral-cream hover:text-accent-gold hover:bg-secondary-blue ${
                    isEditMode ? "bg-accent-gold/20 text-accent-gold" : ""
                  }`}
                  title={isEditMode ? t('common.exitEdit') : t('common.editHomePage')}
                >
                  {isEditMode ? (
                    <>
                      <X className="h-4 w-4" />
                      <span className="text-sm font-medium">{t('common.exitEdit')}</span>
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4" />
                      <span className="text-sm font-medium">{t('common.edit')}</span>
                    </>
                  )}
                </Button>
              )}
              
              <div className="hidden md:flex">
                <LanguageToggle />
              </div>

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-10 w-10 rounded-full bg-secondary-blue hover:bg-accent-gold"
                    >
                      <div className="flex items-center justify-center w-full h-full rounded-full text-neutral-cream">
                        {user.fullName.charAt(0).toUpperCase()}
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-56 bg-primary-blue border-secondary-blue text-neutral-cream"
                    align="end"
                  >
                    <DropdownMenuItem className="hover:bg-secondary-blue">
                      <User className={`${isRtl ? 'ml-2' : 'mr-2'} h-4 w-4`} />
                      <span>{user.fullName}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-secondary-blue" />
                    {user.isEmailVerified && user.isPhoneVerified && user.kycStatus === "approved" ? (
                      <DropdownMenuItem
                        className="hover:bg-secondary-blue cursor-pointer"
                        onClick={() => navigate("/dashboard")}
                      >
                        <Settings className={`${isRtl ? 'ml-2' : 'mr-2'} h-4 w-4`} />
                        <span>{t("nav.dashboard")}</span>
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        className="hover:bg-secondary-blue cursor-pointer"
                        onClick={() => {
                          // Redirect to appropriate verification step
                          if (!user.isEmailVerified) {
                            navigate("/verification/email");
                          } else if (!user.isPhoneVerified) {
                            navigate("/verification/phone");
                          } else if (user.kycStatus === "rejected" || user.kycStatus === "none") {
                            navigate("/verification/kyc-docs");
                          } else if (user.kycStatus === "pending") {
                            navigate("/verification/waiting");
                          }
                        }}
                      >
                        <Settings className={`${isRtl ? 'ml-2' : 'mr-2'} h-4 w-4`} />
                        <span>{t("nav.completeVerification")}</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="hover:bg-secondary-blue cursor-pointer"
                      onClick={() => navigate("/saved-listings")}
                    >
                      <Heart className={`${isRtl ? 'ml-2' : 'mr-2'} h-4 w-4`} />
                      <span>{t('nav.savedListings')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="hover:bg-secondary-blue cursor-pointer text-red-400 hover:text-red-300"
                      onClick={handleLogout}
                    >
                      <LogOut className={`${isRtl ? 'ml-2' : 'mr-2'} h-4 w-4`} />
                      <span>{t("nav.logout")}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className={`flex items-center ${isRtl ? 'space-x-reverse space-x-3' : 'space-x-3'}`}>
                  <Link href="/auth">
                    <Button
                      variant="ghost"
                      className="text-neutral-cream/80 hover:text-accent-gold hover:bg-secondary-blue"
                    >
                      {t("nav.login")}
                    </Button>
                  </Link>
                  <Link href="/auth">
                    <Button className="bg-accent-gold hover:bg-accent-gold/90 text-deep-contrast">
                      {t("nav.getStarted")}
                    </Button>
                  </Link>
                </div>
              )}

              {/* Mobile menu button */}
              <Button
                ref={hamburgerButtonRef}
                variant="ghost"
                className="md:hidden text-neutral-cream hover:bg-secondary-blue min-h-[44px] min-w-[44px] z-50"
                onClick={toggleMobileMenu}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-menu"
                aria-label={t("nav.toggleMenu", "Toggle navigation menu")}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  {mobileMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          id="mobile-menu"
          className="md:hidden bg-primary-blue border-b border-secondary-blue fixed top-20 left-0 right-0 z-40 max-h-[calc(100vh-5rem)] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`container mx-auto px-6 py-4 space-y-4 ${isRtl ? 'text-right' : 'text-left'}`}>
            {/* Language Toggle in Mobile */}
            <div className="flex justify-center pb-4 border-b border-secondary-blue/50">
              <LanguageToggle />
            </div>

            <Link
              href="/"
              onClick={closeMobileMenu}
              className="block text-neutral-cream/80 hover:text-accent-gold py-2"
            >
              {t('nav.home')}
            </Link>
            <Link
              href="/listings"
              onClick={closeMobileMenu}
              className="block text-neutral-cream/80 hover:text-accent-gold py-2"
            >
              {t('nav.listings')}
            </Link>

            <Link
              href="/about"
              onClick={closeMobileMenu}
              className="block text-neutral-cream/80 hover:text-accent-gold py-2"
            >
              {t('nav.about')}
            </Link>
            <Link
              href="/contact"
              onClick={closeMobileMenu}
              className="block text-neutral-cream/80 hover:text-accent-gold py-2"
            >
              {t('nav.contact')}
            </Link>
            <Link
              href="/faq"
              onClick={closeMobileMenu}
              className="block text-neutral-cream/80 hover:text-accent-gold py-2"
            >
              {t('nav.faq')}
            </Link>
            {user && user.role === "admin" && (
              <Link
                href="/admin"
                onClick={closeMobileMenu}
                className="block text-accent-gold hover:text-accent-gold/80 py-2"
              >
                {t('nav.admin')}
              </Link>
            )}
            
            {/* Edit Mode Toggle for Mobile - Only for admins on home page */}
            {showEditButton && (
              <button
                onClick={() => {
                  toggleEditMode();
                  closeMobileMenu();
                }}
                className={`block w-full text-left py-2 ${
                  isEditMode 
                    ? "text-accent-gold bg-accent-gold/20" 
                    : "text-neutral-cream/80 hover:text-accent-gold"
                }`}
              >
                <div className="flex items-center gap-2">
                  {isEditMode ? (
                    <>
                      <X className="h-4 w-4" />
                      <span>Exit Edit Mode</span>
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4" />
                      <span>Edit Home Page</span>
                    </>
                  )}
                </div>
              </button>
            )}
            
            {/* User Menu for Mobile - Only show dashboard/saved/logout for logged in users */}
            {user && (
              <div className="space-y-3 pt-4 border-t border-secondary-blue/50">
                <div className="text-neutral-cream font-medium py-2">
                  {user.fullName}
                </div>
                {user.verified ? (
                  <Link
                    href="/dashboard"
                    onClick={closeMobileMenu}
                    className="block text-neutral-cream/80 hover:text-accent-gold py-2"
                  >
                    {t("nav.dashboard")}
                  </Link>
                ) : (
                  <Link
                    href="/verification/email"
                    onClick={closeMobileMenu}
                    className="block text-amber-400 hover:text-amber-300 py-2"
                  >
                    {t("nav.completeVerification")}
                  </Link>
                )}
                <Link
                  href="/saved-listings"
                  onClick={closeMobileMenu}
                  className="block text-neutral-cream/80 hover:text-accent-gold py-2"
                >
                  {t('nav.savedListings')}
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    closeMobileMenu();
                  }}
                  className="block w-full text-left text-red-400 hover:text-red-300 py-2"
                >
                  {t("nav.logout")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
