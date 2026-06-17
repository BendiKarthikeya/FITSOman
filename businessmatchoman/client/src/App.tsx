import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/error/error-boundary";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import ListingsPage from "@/pages/listings-page";
import ListingDetailsPage from "@/pages/listing-details-page";
import CreateListingPage from "@/pages/create-listing-page";
import EditListingPage from "@/pages/edit-listing-page";
import DashboardPage from "@/pages/dashboard-page";
import KycPage from "@/pages/kyc-page";
import VerificationEmailPage from "@/pages/verification-email-page";
import VerificationPhonePage from "@/pages/verification-phone-page";
import VerificationKycDocsPage from "@/pages/verification-kyc-docs-page";
import VerificationKycUploadPage from "@/pages/verification-kyc-upload-page";
import VerificationWaitingPage from "@/pages/verification-waiting-page";
import FAQPage from "@/pages/faq";
import BusinessShowcasePage from "@/pages/business-showcase-page";
import TermsAndConditionsPage from "@/pages/terms-and-conditions";
import AdminDashboardPage from "@/pages/admin-dashboard-page";
import AdminSettingsPage from "@/pages/admin-settings-page";
import AdminLoginPage from "@/pages/admin-login-page";
import AdminImageSettings from "@/pages/admin-image-settings";
import AdminUsersPage from "@/pages/admin-users-page";
import AdminKycPage from "@/pages/admin-kyc-page";
import AdminListingsPage from "@/pages/admin-listings-page";

import AboutPage from "@/pages/about-page";
import ContactPage from "@/pages/contact-page";

import SavedListingsPage from "@/pages/saved-listings-page";
import MessagesPage from "@/pages/messages-page";
import PrivacyPage from "@/pages/privacy";
import HelpPage from "@/pages/help";
import SitemapPage from "@/pages/sitemap";
import AccessibilityPage from "@/pages/accessibility";
import CookiesPage from "@/pages/cookies";

import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";
import { EditModeProvider } from "./hooks/use-edit-mode";
import { LanguageProvider } from "./components/providers/language-provider";
import { AnimationProvider } from "./components/providers/animation-provider";
import { useLoadTranslations } from "./hooks/use-load-translations";
import { FullPageLoader } from "./components/ui/logo-loader";
import { useEffect, useState } from "react";
import { useScrollToTop } from "./hooks/use-scroll-to-top";

// Component to handle redirect to admin login
function AdminLoginRedirect() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirect to the actual admin login page
    setLocation("/admin/login");
  }, [setLocation]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Redirecting to admin login...</p>
    </div>
  );
}

function Router(): JSX.Element {
  // Enable scroll-to-top on route changes
  useScrollToTop();
  // Load translations from database
  useLoadTranslations();
  
  return (
    <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/listings" component={ListingsPage} />
        <Route path="/listings/:id" component={ListingDetailsPage} />
        <Route path="/listing/:id" component={ListingDetailsPage} />
        <ProtectedRoute path="/listings/:id/edit" component={EditListingPage} />
        <Route path="/showcase" component={BusinessShowcasePage} />
        <Route path="/faq" component={FAQPage} />

        <Route path="/about" component={AboutPage} />
        <Route path="/contact" component={ContactPage} />
        <Route path="/terms" component={TermsAndConditionsPage} />
        <Route path="/privacy" component={PrivacyPage} />
        <Route path="/help" component={HelpPage} />
        <Route path="/sitemap" component={SitemapPage} />
        <Route path="/accessibility" component={AccessibilityPage} />
        <Route path="/cookies" component={CookiesPage} />
        <Route path="/admin/login" component={AdminLoginPage} />
        {/* Alias route for convenience */}
        <Route path="/admin-login">
          <AdminLoginRedirect />
        </Route>
        <ProtectedRoute path="/create-listing" component={CreateListingPage} />
        
        {/* Verification Flow Routes */}
        <ProtectedRoute path="/verification/email" component={VerificationEmailPage} />
        <ProtectedRoute path="/verification/phone" component={VerificationPhonePage} />
        <ProtectedRoute path="/verification/kyc-docs" component={VerificationKycDocsPage} />
        <ProtectedRoute path="/verification/kyc-upload" component={VerificationKycUploadPage} />
        <ProtectedRoute path="/verification/waiting" component={VerificationWaitingPage} />
        <ProtectedRoute path="/saved-listings" component={SavedListingsPage} />
        <ProtectedRoute path="/messages" component={MessagesPage} />
        <ProtectedRoute path="/dashboard" component={DashboardPage} />
        <ProtectedRoute path="/kyc" component={KycPage} />
        <ProtectedRoute
          path="/admin"
          component={AdminDashboardPage}
          adminOnly={true}
        />
        <ProtectedRoute
          path="/admin/settings"
          component={AdminSettingsPage}
          adminOnly={true}
        />
        <ProtectedRoute
          path="/admin/image-settings"
          component={AdminImageSettings}
          adminOnly={true}
        />
        <ProtectedRoute
          path="/admin/users"
          component={AdminUsersPage}
          adminOnly={true}
        />
        <ProtectedRoute
          path="/admin/kyc"
          component={AdminKycPage}
          adminOnly={true}
        />
        <ProtectedRoute
          path="/admin/listings"
          component={AdminListingsPage}
          adminOnly={true}
        />

        <Route component={NotFound} />
      </Switch>
  );
}

function App() {
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    // Simulate initial app loading (settings, auth check, etc.)
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 2000); // 2 seconds minimum loading time

    return () => clearTimeout(timer);
  }, []);

  if (isInitialLoading) {
    return <FullPageLoader />;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <EditModeProvider>
            <LanguageProvider>
              <AnimationProvider>
                <ErrorBoundary>
                  <Router />
                </ErrorBoundary>
              </AnimationProvider>
              <Toaster />
              {/* <PerformanceMonitor /> */}
            </LanguageProvider>
          </EditModeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
