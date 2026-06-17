import { Switch, Route, useLocation } from "wouter";

import { useEffect, useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import "./i18n/config"; // Import i18n configuration
import { LanguageProvider } from "@/lib/language-context";
import AdminDashboardV2 from "@/pages/admin/admin-dashboard-v2";
import OrganizationManagement from "@/pages/admin/organization-management";
import DepartmentManagement from "@/pages/admin/department-management";
import RBACPermissions from "@/pages/admin/rbac-permissions";
import AuditLogs from "@/pages/admin/audit-logs";
import SubscriptionManagement from "@/pages/admin/subscription-management";
import SessionManagement from "@/pages/admin/session-management";
import DataTransfer from "@/pages/admin/data-transfer";
import AssessmentPeriods from "@/pages/admin/assessment-periods";
import Onboarding from "@/pages/admin/onboarding";
import { AdminLayout } from "@ui/layout/AdminLayout";

import SurveyPublic from "@/pages/survey/survey-public";
import SurveyShare from "@/pages/survey/survey-share";
import CRMOAuthCallback from "@/pages/settings/crm-oauth-callback";
import { auth } from "@/lib/auth";
import VapiWidget from "@/components/vapi/vapi-widget";
import UIPreview from "@/pages/ui-preview";
import { SurveyBuilderPage, SurveySharePage, LoginPage } from "@ui/pages";
import { ViewAnalyticsPage } from "@ui/pages/ViewAnalyticsPage";
import { LandingPageV2 } from "@ui/landing";
import AnalyticsFigma from "@/pages/analytics/analytics-figma";

function Redirect({ to }: { to: string }) {
  const [, navigate] = useLocation();
  useEffect(() => {
    navigate(to);
  }, [to, navigate]);
  return null;
}

function Router() {
  const [user, setUser] = useState(() => auth.getUser());
  useEffect(() => auth.subscribe((u) => setUser(u)), []);
  const isAdmin = user && (user.role === 'admin' || user.role === 'superuser' || user.role === 'culture_admin');
  const isStrictAdmin = user && (user.role === 'admin' || user.role === 'superuser');
  return (
    <Switch>
      {/* Root: show new landing page for all users */}
      <Route path="/" component={LandingPageV2} />
      {/* Landing and special routes */}
      <Route path="/login" component={() => !user ? <LoginPage /> : <Redirect to={isAdmin ? "/admin/dashboard" : "/dashboard"} />} />
      <Route path="/landing-v2" component={LandingPageV2} />
      <Route path="/analytics-figma" component={AnalyticsFigma} />
      <Route path="/crm-oauth-callback" component={CRMOAuthCallback} />
      <Route path="/onboarding" component={user ? Onboarding : (() => <Redirect to="/" />)} />
      
      {/* Short link redirect and public survey page */}
      <Route path="/s/:id" component={({ params }: any) => <Redirect to={`/survey/${params.id}`} />} />
      <Route path="/survey/:id/share" component={user && !isAdmin ? SurveyShare : (() => <Redirect to={isAdmin ? "/admin/dashboard" : "/"} />)} />
      <Route path="/survey/:id" component={SurveyPublic} />
      
      {/* Admin pages - sidebar layout, only accessible to admins */}
      <Route path="/admin/dashboard" component={isAdmin ? () => <AdminLayout><AdminDashboardV2 /></AdminLayout> : (() => <Redirect to="/dashboard" />)} />
      <Route path="/admin/organizations" component={isAdmin ? () => <AdminLayout><OrganizationManagement /></AdminLayout> : (() => <Redirect to="/dashboard" />)} />
      <Route path="/admin/departments" component={isAdmin ? () => <AdminLayout><DepartmentManagement /></AdminLayout> : (() => <Redirect to="/dashboard" />)} />
      <Route path="/admin/permissions" component={isStrictAdmin ? () => <AdminLayout><RBACPermissions /></AdminLayout> : (() => <Redirect to="/admin/dashboard" />)} />
      {/* Temporarily disabled - needs fixes */}
      {/* <Route path="/admin/advanced-permissions" component={isAdmin ? AdvancedPermissions : (() => <Redirect to="/dashboard" />)} /> */}
      <Route path="/admin/sessions" component={isAdmin ? () => <AdminLayout><SessionManagement /></AdminLayout> : (() => <Redirect to="/dashboard" />)} />
      <Route path="/admin/audit" component={isAdmin ? () => <AdminLayout><AuditLogs /></AdminLayout> : (() => <Redirect to="/dashboard" />)} />
      <Route path="/admin/audit-logs" component={isAdmin ? () => <AdminLayout><AuditLogs /></AdminLayout> : (() => <Redirect to="/dashboard" />)} />
      <Route path="/admin/onboarding" component={isAdmin ? () => <AdminLayout><Onboarding /></AdminLayout> : (() => <Redirect to="/dashboard" />)} />
      <Route path="/admin/subscriptions" component={isAdmin ? () => <AdminLayout><SubscriptionManagement /></AdminLayout> : (() => <Redirect to="/dashboard" />)} />
      <Route path="/admin/data-transfer" component={isAdmin ? () => <AdminLayout><DataTransfer /></AdminLayout> : (() => <Redirect to="/dashboard" />)} />
      <Route path="/admin/assessment-periods" component={isAdmin ? () => <AdminLayout><AssessmentPeriods /></AdminLayout> : (() => <Redirect to="/dashboard" />)} />
      
      {/* New UI routes - now at root paths */}
      <Route path="/surveyBuilder/:id" component={({ params }: any) => <SurveyBuilderPage surveyId={params.id} />} />
      <Route path="/surveyShare/:id" component={({ params }: any) => <SurveySharePage surveyId={params.id} />} />
      <Route path="/viewAnalytics/:id" component={({ params }: any) => <ViewAnalyticsPage surveyId={params.id} />} />
      <Route path="/dashboard" component={() => <UIPreview params={{ page: "dashboard" }} />} />
      <Route path="/:page" component={({ params }: any) => <UIPreview params={{ page: params.page }} />} />
      
      {/* Temporarily unlink feedback analyzer */}
      {/* <Route path="/feedback-analyzer" component={FeedbackAnalyzer} /> */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <div className="min-h-screen bg-background">
            <Router />
            {/* {auth.getUser() && <SurveyModal />} */}
            {/* Temporary: mount Vapi test widget globally */}
            <VapiWidget />
          </div>
          <Toaster />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
