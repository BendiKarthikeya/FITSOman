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
  LockKeyhole,
  Airplay,
  Shield,
  X,
  Loader,
} from 'lucide-react';
import { Sidebar } from '../layout/Sidebar';
import { Navbar } from '../layout/Navbar';
import { auth } from '@/lib/auth';

const sidebarItems = [
  { label: 'Dashboard', icon: <Home className="h-4 w-4" />, href: '/dashboard' },
  { label: 'Surveys', icon: <FilePenLine className="h-4 w-4" />, href: '/surveys' },
  { label: 'Analytics', icon: <GitGraph className="h-4 w-4" />, href: '/analytics' },
  { label: 'Team Insights', icon: <Users className="h-4 w-4" />, href: '/teamInsights' },
  { label: 'Action Planning', icon: <Navigation className="h-4 w-4" />, href: '/actionPlanningBoard' },
  { label: 'Reports', icon: <PieChart className="h-4 w-4" />, href: '/reports' },
  { label: 'Settings', icon: <Settings className="h-4 w-4" />, href: '/settings' },
];

interface IconBoxProps { children: React.ReactNode }
const IconBox: React.FC<IconBoxProps> = ({ children }) => (
  <div className="flex shrink-0 items-center justify-center rounded-[8px] border border-[rgba(0,0,0,0.1)] bg-[#f8fafc] size-[42px]">
    {children}
  </div>
);

interface SecurityRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: React.ReactNode;
  borderBottom?: boolean;
}
const SecurityRow: React.FC<SecurityRowProps> = ({ icon, title, description, action, borderBottom }) => (
  <div className={`flex items-center gap-4 px-6 h-[77px] ${borderBottom ? 'border-b border-[rgba(0,0,0,0.1)]' : ''}`}>
    <IconBox>{icon}</IconBox>
    <div className="flex flex-1 min-w-0 flex-col gap-[4px]">
      <p className="font-['IBM_Plex_Sans'] text-[14px] font-medium leading-[1.5] text-[#0f172a]">{title}</p>
      <p className="font-['IBM_Plex_Sans'] text-[12px] font-medium leading-[1.4] tracking-[0.0288px] text-[#64748b]">{description}</p>
    </div>
    {action}
  </div>
);

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="text-[16px] font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) return setError('New password must be at least 8 characters');
    if (newPassword !== confirmPassword) return setError('Passwords do not match');
    setLoading(true);
    try {
      const token = auth.getToken?.();
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Change Password" onClose={onClose}>
      {success ? (
        <p className="text-[14px] text-emerald-600">Password updated successfully.</p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-[13px] text-slate-700">
            Current Password
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="rounded-md border border-slate-300 px-3 py-2 text-[14px]" />
          </label>
          <label className="flex flex-col gap-1 text-[13px] text-slate-700">
            New Password (min 8 chars)
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="rounded-md border border-slate-300 px-3 py-2 text-[14px]" />
          </label>
          <label className="flex flex-col gap-1 text-[13px] text-slate-700">
            Confirm New Password
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="rounded-md border border-slate-300 px-3 py-2 text-[14px]" />
          </label>
          {error && <p className="text-[13px] text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[14px] border border-slate-200 rounded-md hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-[14px] bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2">
              {loading && <Loader className="h-4 w-4 animate-spin" />}
              Update Password
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

interface SessionRow {
  id: string;
  device?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  lastActivity?: string | null;
  isActive?: boolean;
}

function SessionsModal({ onClose }: { onClose: () => void }) {
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    const token = auth.getToken?.();
    fetch('/api/auth/my-sessions', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Failed to load sessions');
        setSessions(data.data || []);
      })
      .catch((e) => setError(e.message || 'Failed to load sessions'));
  }, []);

  return (
    <Modal title="Active Sessions" onClose={onClose}>
      {error && <p className="text-[13px] text-red-600">{error}</p>}
      {!sessions && !error && <div className="flex items-center gap-2 text-slate-500 text-[14px]"><Loader className="h-4 w-4 animate-spin" /> Loading…</div>}
      {sessions && sessions.length === 0 && <p className="text-[14px] text-slate-500">No active sessions found.</p>}
      {sessions && sessions.length > 0 && (
        <ul className="flex flex-col gap-2 max-h-[400px] overflow-auto">
          {sessions.map((s) => (
            <li key={s.id} className="rounded-md border border-slate-200 p-3 text-[13px]">
              <p className="font-medium text-slate-900">{s.device || s.userAgent?.slice(0, 60) || 'Unknown device'}</p>
              <p className="text-slate-500">IP: {s.ipAddress || 'n/a'}</p>
              <p className="text-slate-500">Last active: {s.lastActivity ? new Date(s.lastActivity).toLocaleString() : 'n/a'}</p>
              {s.isActive && <span className="inline-block mt-1 text-emerald-600 text-[12px]">● Active</span>}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

export const SettingsSecurityPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'general' | 'integrations' | 'security'>('security');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);

  const tabs = [
    { key: 'general', label: t('settings.general', { defaultValue: 'General' }) },
    { key: 'integrations', label: t('settings.channels', { defaultValue: 'Integrations' }) },
    { key: 'security', label: t('settings.security', { defaultValue: 'Security' }) },
  ] as const;

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar items={sidebarItems} compact={!sidebarOpen} onNavigate={(href) => setLocation(href)} onLogout={() => setLocation("/login")} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar
          breadcrumbs={[{ label: t('nav.settings', { defaultValue: 'Settings' }), href: '/settings' }, { label: t('settings.security', { defaultValue: 'Security' }) }]}
          showMenuToggle
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

          <div className="flex-1 overflow-auto py-6">
            <div className="flex flex-col gap-4 px-6">

              <h1 className="font-['IBM_Plex_Sans'] text-[24px] font-semibold leading-[1.3] text-[#0f172a]">
                {t('settings.title', { defaultValue: 'Settings' })}
              </h1>

              <div className="flex items-center">
                <div className="flex h-[34px] items-center rounded-[10px] bg-[#f5f5f5] p-[3px]">
                  {tabs.map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => {
                        if (tab.key === 'general') { setLocation('/settings'); return; }
                        if (tab.key === 'integrations') { setLocation('/settingsCrmIntegrations'); return; }
                        setActiveTab(tab.key);
                      }}
                      className={`flex h-7 items-center justify-center rounded-[8px] px-3 font-['IBM_Plex_Sans'] text-[14px] leading-[1.5] text-[#0a0a0a] transition-all ${
                        activeTab === tab.key
                          ? 'border border-[#e5e5e5] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]'
                          : 'hover:bg-white/60'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-[4px]">
                  <h2 className="font-['IBM_Plex_Sans'] text-[20px] font-semibold leading-[1.4] text-[#0f172a]">
                    {t('settings.securityAccess', { defaultValue: 'Security & Access' })}
                  </h2>
                  <p className="font-['IBM_Plex_Sans'] text-[14px] font-normal leading-[1.5] text-[#64748b]">
                    {t('settings.securityDescription', { defaultValue: 'Manage your password, authentication, and device access' })}
                  </p>
                </div>

                <div className="overflow-hidden rounded-[10px] border border-[rgba(0,0,0,0.1)] bg-white">
                  {/* Row 1 — Change Password */}
                  <SecurityRow
                    icon={<LockKeyhole className="h-5 w-5 text-[#0f172a]" />}
                    title={t('settings.changePassword', { defaultValue: 'Change Password' })}
                    description={t('settings.changePasswordDesc', { defaultValue: 'Update your account password regularly to keep your account secure' })}
                    borderBottom
                    action={
                      <button
                        onClick={() => setShowChangePassword(true)}
                        className="flex shrink-0 items-center justify-center rounded-[8px] border border-[rgba(0,0,0,0.1)] bg-white px-3 py-[6px] hover:bg-slate-50"
                      >
                        <span className="font-['IBM_Plex_Sans'] text-[14px] font-normal leading-[1.5] text-[#0a0a0a]">{t('common.change', { defaultValue: 'Change' })}</span>
                      </button>
                    }
                  />

                  {/* Row 2 — Device Sessions  →  View sessions */}
                  <SecurityRow
                    icon={<Airplay className="h-5 w-5 text-[#0f172a]" />}
                    title={t('settings.deviceSessions', { defaultValue: 'Device Sessions' })}
                    description={t('settings.deviceSessionsDesc', { defaultValue: "View and manage devices where you're currently logged in" })}
                    borderBottom
                    action={
                      <button
                        onClick={() => setShowSessions(true)}
                        className="flex shrink-0 items-center justify-center rounded-[8px] border border-[rgba(0,0,0,0.1)] bg-white px-3 py-[6px] hover:bg-slate-50"
                      >
                        <span className="font-['IBM_Plex_Sans'] text-[14px] font-normal leading-[1.5] text-[#0a0a0a]">{t('settings.viewSessions', { defaultValue: 'View sessions' })}</span>
                      </button>
                    }
                  />

                  {/* Row 3 — Two-Factor Authentication  →  Enable 2FA */}
                  <SecurityRow
                    icon={<Shield className="h-5 w-5 text-[#0f172a]" />}
                    title={t('settings.twoFactor', { defaultValue: 'Two-Factor Authentication' })}
                    description={t('settings.twoFactorDesc', { defaultValue: 'Add an extra layer of security to your account with 2FA' })}
                    action={
                      <button
                        onClick={() => setShowTwoFactor(true)}
                        className="flex shrink-0 items-center justify-center rounded-[8px] border border-[rgba(0,0,0,0.1)] bg-[#0f172a] px-3 py-[6px] hover:bg-slate-800"
                      >
                        <span className="font-['IBM_Plex_Sans'] text-[14px] font-normal leading-[1.5] text-white">{t('settings.enable2FA', { defaultValue: 'Enable 2FA' })}</span>
                      </button>
                    }
                  />
                </div>
              </div>
            </div>
          </div>

        {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
        {showSessions && <SessionsModal onClose={() => setShowSessions(false)} />}
        {showTwoFactor && (
          <Modal title="Two-Factor Authentication" onClose={() => setShowTwoFactor(false)}>
            <p className="text-[14px] text-slate-700">
              2FA setup is coming soon. We'll notify you once authenticator app and SMS-based verification are available.
            </p>
            <div className="flex justify-end pt-4">
              <button onClick={() => setShowTwoFactor(false)} className="px-4 py-2 text-[14px] bg-slate-900 text-white rounded-md hover:bg-slate-800">Got it</button>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};
