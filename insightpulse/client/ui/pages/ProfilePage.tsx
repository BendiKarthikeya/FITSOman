import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import {
  Home,
  FilePenLine,
  GitGraph,
  Users,
  Navigation,
  PieChart,
  Settings,
  Pencil,
  PanelLeft,
  ChevronRight,
} from 'lucide-react';
import { Sidebar } from '../layout/Sidebar';
import { useUserProfile } from '../hooks/api';
import { auth } from '@/lib/auth';

const sidebarItems = [
  { label: 'Dashboard',       icon: <Home className="h-4 w-4" />,       href: '/dashboard' },
  { label: 'Surveys',         icon: <FilePenLine className="h-4 w-4" />, href: '/surveys' },
  { label: 'Analytics',       icon: <GitGraph className="h-4 w-4" />,    href: '/analytics' },
  { label: 'Team Insights',   icon: <Users className="h-4 w-4" />,       href: '/teamInsights' },
  { label: 'Action Planning', icon: <Navigation className="h-4 w-4" />,  href: '/actionPlanningBoard' },
  { label: 'Reports',         icon: <PieChart className="h-4 w-4" />,    href: '/reports' },
  { label: 'Settings',        icon: <Settings className="h-4 w-4" />,    href: '/settings' },
];

// ─── Form Field ───────────────────────────────────────────────────────────────
interface FormFieldProps {
  label: string;
  value: string;
  hint?: string;
}

const FormField: React.FC<FormFieldProps> = ({ label, value, hint }) => (
  <div className="flex flex-col gap-3">
    <p className="font-['IBM_Plex_Sans'] text-[14px] font-medium leading-5 text-[#0a0a0a]">{label}</p>
    <div className="flex h-9 items-center rounded-[8px] border border-[#e5e5e5] bg-white px-3 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)]">
      <p className="flex-1 truncate font-['IBM_Plex_Sans'] text-[14px] font-normal leading-5 text-[#737373]">
        {value}
      </p>
    </div>
    {hint && (
      <p className="font-['IBM_Plex_Sans'] text-[14px] font-normal leading-5 text-[#737373]">{hint}</p>
    )}
  </div>
);

// ─── Stat Card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string;
  sub: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, sub }) => (
  <div className="flex flex-1 flex-col gap-[9px] rounded-[6px] border border-[#e2e8f0] bg-[#f8fafc] p-[17px]">
    <p className="text-center font-['IBM_Plex_Sans'] text-[14px] font-medium leading-[1.5] text-[#64748b]">{label}</p>
    <p className="text-center font-['IBM_Plex_Sans'] text-[24px] font-semibold leading-[1.3] text-[#0f172a]">{value}</p>
    <p className="text-center font-['IBM_Plex_Sans'] text-[12px] font-medium leading-[1.4] tracking-[0.0288px] text-[#64748b]">{sub}</p>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
export const ProfilePage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const authUser = auth.getUser();
  const { data: profile } = useUserProfile(authUser?.id);

  const displayName = profile?.username ?? authUser?.username ?? '—';
  const displayEmail = profile?.email ?? authUser?.email ?? '—';
  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';
  const orgId = authUser?.organizationId ?? '—';

  return (
    <div className="flex h-full bg-[#f1f5f9]">
      <Sidebar items={sidebarItems} compact={!sidebarOpen} onNavigate={(href) => setLocation(href)} onLogout={() => setLocation("/login")} />

      {/* Main content column */}
      <div className="flex flex-1 flex-col overflow-hidden pr-2 py-2">
        {/* White card wrapping navbar + content */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-xl bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]">

          {/* ── Top bar / breadcrumb ── */}
          <div className="flex h-16 shrink-0 items-center px-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="flex h-7 w-7 items-center justify-center rounded"
              >
                <PanelLeft className="h-4 w-4 text-slate-600" />
              </button>
              {/* separator */}
              <span className="h-4 w-px bg-slate-200" />
              <div className="flex items-center gap-1.5">
                <span className="font-['IBM_Plex_Sans'] text-[14px] font-normal leading-5 text-[#737373]">
                  {t('nav.profile', { defaultValue: 'Profile' })}
                </span>
              </div>
            </div>
          </div>

          {/* ── Scrollable content ── */}
          <div className="flex-1 overflow-auto py-6">
            <div className="flex flex-col gap-4 px-6">

              {/* Page title row */}
              <div className="flex items-center justify-between">
                <h1 className="font-['IBM_Plex_Sans'] text-[24px] font-semibold leading-[1.3] text-[#0f172a]">
                  {t('profile.title', { defaultValue: 'Profile' })}
                </h1>
                <button className="flex items-center gap-2 rounded-[8px] border border-[#e5e5e5] bg-white px-3 py-[8px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] hover:bg-slate-50">
                  <Pencil className="h-4 w-4 text-[#0f172a]" />
                  <span className="font-['IBM_Plex_Sans'] text-[14px] font-medium leading-5 text-[#0f172a]">
                    {t('profile.editProfile', { defaultValue: 'Edit Profile' })}
                  </span>
                </button>
              </div>

              {/* ── Account Information ── */}
              <div className="flex flex-col gap-2">
                <p className="font-['IBM_Plex_Sans'] text-[16px] font-semibold leading-6 text-[#0a0a0a]">
                  {t('profile.accountInformation', { defaultValue: 'Account Information' })}
                </p>
                <p className="font-['IBM_Plex_Sans'] text-[14px] font-normal leading-5 text-[#737373]">
                  {t('profile.accountInformationDesc', { defaultValue: 'Enter your information below to edit your account.' })}
                </p>
              </div>

              {/* Form fields — single column */}
              <div className="flex flex-col gap-7">
                <FormField label={t('profile.fullName', { defaultValue: 'Full Name' })} value={displayName} />
                <FormField label={t('profile.email', { defaultValue: 'Email' })} value={displayEmail} hint={t('profile.verified', { defaultValue: 'Verified' })} />
                <FormField label={t('profile.organization', { defaultValue: 'Organisation' })} value={orgId} />
                <FormField label={t('profile.memberSince', { defaultValue: 'Member Since' })} value={memberSince} />
              </div>

              {/* Spacer */}
              <div className="h-[65px]" />

              {/* ── Account Activity ── */}
              <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-1">
                  <p className="font-['IBM_Plex_Sans'] text-[20px] font-semibold leading-[1.4] text-[#0f172a]">
                    {t('profile.accountActivity', { defaultValue: 'Account Activity' })}
                  </p>
                  <p className="font-['IBM_Plex_Sans'] text-[14px] font-normal leading-[1.5] text-[#64748b]">
                    {t('profile.accountActivityDesc', { defaultValue: 'Usage statistics and access information' })}
                  </p>
                </div>

                {/* 4 stat cards in one row */}
                <div className="flex flex-wrap gap-0">
                  <StatCard label={t('profile.accountType', { defaultValue: 'Account Type' })} value={t('profile.userType', { defaultValue: 'User' })} sub={t('profile.standardLicense', { defaultValue: 'Standard user license' })} />
                  <StatCard label={t('profile.lastLogin', { defaultValue: 'Last Login' })} value={t('profile.today', { defaultValue: 'Today' })} sub="2:45 PM UTC+0" />
                  <StatCard label={t('profile.activeSessions', { defaultValue: 'Active Sessions' })} value="1" sub={t('profile.currentDevice', { defaultValue: 'Current device only' })} />
                  <StatCard label={t('profile.totalLogins', { defaultValue: 'Total Logins' })} value="127" sub={t('profile.last12Months', { defaultValue: 'In the last 12 months' })} />
                </div>

                {/* ── Account Deletion ── */}
                <div className="flex flex-col gap-2">
                  <p className="font-['IBM_Plex_Sans'] text-[20px] font-semibold leading-[1.4] text-[#0f172a]">
                    {t('profile.accountDeletion', { defaultValue: 'Account Deletion' })}
                  </p>
                  <div className="flex items-start gap-2">
                    <p className="flex-1 font-['IBM_Plex_Sans'] text-[14px] font-normal leading-[1.5] text-[#334155]">
                      {t('profile.accountDeletionDesc', { defaultValue: 'Permanently remove your account and all associated data from InsightPulse. This action cannot be undone.' })}
                    </p>
                    <button className="shrink-0 font-['IBM_Plex_Sans'] text-[14px] font-medium leading-5 text-[#e11d48] underline decoration-solid">
                      {t('profile.deleteMyAccount', { defaultValue: 'Delete my account' })}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
