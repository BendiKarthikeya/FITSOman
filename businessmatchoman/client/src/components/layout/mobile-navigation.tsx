import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";

export default function MobileNavigation() {
  const [location] = useLocation();
  const { t } = useTranslation();
  const { user } = useAuth();

  // Check if user is fully verified
  const isFullyVerified = user && user.isEmailVerified && user.isPhoneVerified && user.kycStatus === "approved";

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white shadow-lg z-40 bottom-nav">
      <div className="flex justify-around py-2">
        <Link
          href="/"
          className={`flex flex-col items-center ${location === "/" ? "text-primary" : "text-neutral-500"}`}
        >
          <span className="material-icons">home</span>
          <span className="text-xs mt-1">{t("nav.home")}</span>
        </Link>
        <Link
          href="/listings"
          className={`flex flex-col items-center ${location === "/listings" ? "text-primary" : "text-neutral-500"}`}
        >
          <span className="material-icons">search</span>
          <span className="text-xs mt-1">{t("nav.listings")}</span>
        </Link>
        <Link
          href="/create-listing"
          className={`flex flex-col items-center ${location === "/create-listing" ? "text-primary" : "text-neutral-500"}`}
        >
          <span className="material-icons">add_circle</span>
          <span className="text-xs mt-1">{t("nav.createListing")}</span>
        </Link>
        {user && (
          <Link
            href="/messages"
            className={`flex flex-col items-center ${location === "/messages" ? "text-primary" : "text-neutral-500"}`}
          >
            <span className="material-icons">forum</span>
            <span className="text-xs mt-1">{t("nav.messages")}</span>
          </Link>
        )}
        {user && isFullyVerified ? (
          <Link
            href="/dashboard"
            className={`flex flex-col items-center ${location === "/dashboard" ? "text-primary" : "text-neutral-500"}`}
          >
            <span className="material-icons">person</span>
            <span className="text-xs mt-1">{t("nav.dashboard")}</span>
          </Link>
        ) : (
          <Link
            href="/auth"
            className={`flex flex-col items-center ${location === "/auth" ? "text-primary" : "text-neutral-500"}`}
          >
            <span className="material-icons">person</span>
            <span className="text-xs mt-1">{user ? t("nav.verify") : t("nav.login")}</span>
          </Link>
        )}
      </div>
    </div>
  );
}
