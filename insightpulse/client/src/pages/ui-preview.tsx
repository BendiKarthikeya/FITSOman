import { useMemo } from "react";
import { Link } from "wouter";
import {
  ActionPlanningBoardPage,
  AnalyticsOverviewPage,
  SurveySharePage,
  AnalyticsPage,
  AnalyticsTrendsPage,
  InsightsPage,
  ComponentShowcase,
  CustomerJourneyPage,
  DashboardPage,
  KpiCardsPage,
  LandingPage,
  LandingPageV2,
  LoginPage,
  EditProfilePage,
  ProfilePage,
  SettingsCrmIntegrationsPage,
  ReportsPage,
  SettingsCrmPage,
  SettingsPage,
  SettingsSecurityPage,
  SurveyBuilderPage,
  SurveyDesktopViewPage,
  SurveysPage,
  SurveysTemplatesPage,
  TeamInsightsPage,
  ViewAnalyticsPage,
} from "@ui/pages";

const pageRegistry = {
  login: { label: "Login", component: LoginPage },
  dashboard: { label: "Dashboard", component: DashboardPage },
  analytics: { label: "Analytics", component: AnalyticsPage },
  surveys: { label: "Surveys", component: SurveysPage },
  surveyBuilder: { label: "Survey Builder", component: SurveyBuilderPage },
  kpiCards: { label: "KPI Cards", component: KpiCardsPage },
  actionPlanningBoard: { label: "Action Planning Board", component: ActionPlanningBoardPage },
  analyticsOverview: { label: "Analytics Overview", component: AnalyticsOverviewPage },
  analyticsTrends: { label: 'Analytics Trends (Figma)', component: AnalyticsTrendsPage },
  customerJourney: { label: 'Customer Journey', component: CustomerJourneyPage },
  insights: { label: 'Insights', component: InsightsPage },
  reports: { label: "Reports", component: ReportsPage },
  teamInsights: { label: "Team Insights", component: TeamInsightsPage },
  surveyDesktop: { label: "Survey Desktop View", component: SurveyDesktopViewPage },
  settings: { label: "Settings", component: SettingsPage },
  settingsCrm: { label: "Settings CRM", component: SettingsCrmPage },
  settingsSecurity: { label: "Settings Security", component: SettingsSecurityPage },
  profile: { label: "Profile", component: ProfilePage },
  editProfile: { label: "Edit Profile", component: EditProfilePage },
  settingsCrmIntegrations: { label: "Settings CRM Integrations", component: SettingsCrmIntegrationsPage },
  landing: { label: "Landing", component: LandingPage },
  landingV2: { label: "Landing V2 (Figma)", component: LandingPageV2 },
  viewAnalytics: { label: "View Analytics (Figma)", component: ViewAnalyticsPage },
  surveysTemplates: { label: "Surveys Templates (Figma)", component: SurveysTemplatesPage },
  surveyShare: { label: "Survey Share (Figma)", component: SurveySharePage },
  showcase: { label: "Component Showcase", component: ComponentShowcase },
} as const;

type PageKey = keyof typeof pageRegistry;

const pageGroups: { label: string; keys: PageKey[] }[] = [
  {
    label: "Surveys",
    keys: ["surveys", "surveyBuilder", "surveyDesktop", "surveysTemplates", "surveyShare"],
  },
  {
    label: "Analytics",
    keys: ["analytics", "analyticsOverview", "analyticsTrends", "customerJourney", "viewAnalytics", "insights"],
  },
  {
    label: "Dashboard",
    keys: ["dashboard", "kpiCards", "teamInsights", "actionPlanningBoard", "reports"],
  },
  {
    label: "Settings & Profile",
    keys: ["settings", "settingsCrm", "settingsSecurity", "settingsCrmIntegrations", "profile", "editProfile"],
  },
  {
    label: "Other",
    keys: ["login", "landing", "landingV2", "showcase"],
  },
];

export default function UIPreview({ params }: { params?: { page?: string; surveyId?: string } }) {
  const selected = (params?.page as PageKey) || "showcase";
  const surveyId = params?.surveyId;

  const safeKey: PageKey = useMemo(() => {
    return selected in pageRegistry ? (selected as PageKey) : "showcase";
  }, [selected]);

  const SelectedComponent = pageRegistry[safeKey].component;

  return (
    <div className="h-screen flex flex-col bg-slate-100 overflow-hidden">
      <div className="flex-1 min-h-0 overflow-auto">
        {safeKey === "viewAnalytics" ? (
          <SelectedComponent surveyId={surveyId} />
        ) : (
          <SelectedComponent />
        )}
      </div>
    </div>
  );
}
