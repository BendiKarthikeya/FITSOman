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
  PanelLeft,
  ChevronRight,
} from 'lucide-react';
import { Sidebar } from '../layout/Sidebar';

const sidebarItems = [
  { label: 'Dashboard',       icon: <Home className="h-4 w-4" />,       href: '/dashboard' },
  { label: 'Surveys',         icon: <FilePenLine className="h-4 w-4" />, href: '/surveys' },
  { label: 'Analytics',       icon: <GitGraph className="h-4 w-4" />,    href: '/analytics' },
  { label: 'Team Insights',   icon: <Users className="h-4 w-4" />,       href: '/teamInsights' },
  { label: 'Action Planning', icon: <Navigation className="h-4 w-4" />,  href: '/actionPlanningBoard' },
  { label: 'Reports',         icon: <PieChart className="h-4 w-4" />,    href: '/reports' },
  { label: 'Settings',        icon: <Settings className="h-4 w-4" />,    href: '/settings' },
];

// ─── Editable Form Field ──────────────────────────────────────────────────────
interface EditFieldProps {
  label: string;
  value: string;
  hint?: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
}

const EditField: React.FC<EditFieldProps> = ({ label, value, hint, onChange, readOnly }) => (
  <div className="flex flex-col gap-3">
    <p className="font-['IBM_Plex_Sans'] text-[14px] font-medium leading-5 text-[#0a0a0a]">{label}</p>
    <div className="flex h-9 items-center rounded-[8px] border border-[#e5e5e5] bg-white shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)]">
      <input
        type="text"
        defaultValue={value}
        readOnly={readOnly}
        onChange={e => onChange?.(e.target.value)}
        className="h-full w-full rounded-[8px] bg-transparent px-3 font-['IBM_Plex_Sans'] text-[14px] font-normal leading-5 text-[#737373] outline-none placeholder:text-[#737373]"
      />
    </div>
    {hint && (
      <p className="font-['IBM_Plex_Sans'] text-[14px] font-normal leading-5 text-[#737373]">{hint}</p>
    )}
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
export const EditProfilePage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
              {/* breadcrumb: Profile > Edit Profile */}
              <div className="flex items-center gap-1.5">
                <span className="font-['IBM_Plex_Sans'] text-[14px] font-normal leading-5 text-[#737373]">
                  {t('nav.profile', { defaultValue: 'Profile' })}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-[#737373]" />
                <span className="font-['IBM_Plex_Sans'] text-[14px] font-normal leading-5 text-[#0f172a]">
                  {t('profile.editProfile', { defaultValue: 'Edit Profile' })}
                </span>
              </div>
            </div>
          </div>

          {/* ── Scrollable content ── */}
          <div className="flex-1 overflow-auto py-6">
            <div className="flex flex-col gap-4 px-6">

              {/* Page title */}
              <h1 className="font-['IBM_Plex_Sans'] text-[24px] font-semibold leading-[1.3] text-[#0f172a]">
                {t('profile.editProfile', { defaultValue: 'Edit Profile' })}
              </h1>

              {/* ── Account Information heading ── */}
              <div className="flex flex-col gap-2">
                <p className="font-['IBM_Plex_Sans'] text-[16px] font-semibold leading-6 text-[#0a0a0a]">
                  {t('profile.accountInformation', { defaultValue: 'Account Information' })}
                </p>
                <p className="font-['IBM_Plex_Sans'] text-[14px] font-normal leading-5 text-[#737373]">
                  {t('profile.accountInformationDesc', { defaultValue: 'Enter your information below to edit your account.' })}
                </p>
              </div>

              {/* ── Form fields ── */}
              <div className="flex flex-col gap-7">
                <EditField label={t('profile.fullName', { defaultValue: 'Full Name' })} value="John Doe" />
                <EditField label={t('profile.email', { defaultValue: 'Email' })} value="m@example.com" hint={t('profile.verified', { defaultValue: 'Verified' })} readOnly />
                <EditField label={t('profile.organization', { defaultValue: 'Organisation' })} value="ASFSD Group" readOnly />
                <EditField label={t('profile.memberSince', { defaultValue: 'Member Since' })} value="January 15, 2024" readOnly />

                {/* Save Changes button */}
                <button className="flex h-8 w-fit items-center justify-center rounded-[6px] bg-[#171717] px-3 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] hover:bg-[#333]">
                  <span className="font-['IBM_Plex_Sans'] text-[14px] font-medium leading-5 tracking-normal text-[#fafafa]">
                    {t('profile.saveChanges', { defaultValue: 'Save Changes' })}
                  </span>
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
