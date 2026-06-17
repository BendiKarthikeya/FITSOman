import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Home, FilePenLine, GitGraph, Users, Navigation, PieChart, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Navbar } from '../layout/Navbar';
import { Sidebar } from '../layout/Sidebar';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Select } from '../components';
import i18n from '@/i18n/config';

type SettingsTab = 'general' | 'channels' | 'security';

const sidebarItems = [
  { label: 'Dashboard', icon: <Home className="h-4 w-4" />, href: '/dashboard' },
  { label: 'Surveys', icon: <FilePenLine className="h-4 w-4" />, href: '/surveys' },
  { label: 'Analytics', icon: <GitGraph className="h-4 w-4" />, href: '/analytics' },
  { label: 'Team Insights', icon: <Users className="h-4 w-4" />, href: '/teamInsights' },
  { label: 'Action Planning', icon: <Navigation className="h-4 w-4" />, href: '/actionPlanningBoard' },
  { label: 'Reports', icon: <PieChart className="h-4 w-4" />, href: '/reports' },
  { label: 'Settings', icon: <Settings className="h-4 w-4" />, href: '/settings' },
];

const timezoneOptions = [
  { label: '+05:30, Asia/Kolkata', value: '+05:30' },
  { label: '+00:00, UTC', value: '+00:00' },
  { label: '-05:00, America/New_York', value: '-05:00' },
  { label: '-08:00, America/Los_Angeles', value: '-08:00' },
];

const languageOptions = [
  { label: 'English', value: 'en' },
  { label: 'Arabic', value: 'ar' },
  { label: 'Spanish', value: 'es' },
  { label: 'French', value: 'fr' },
];

const tabs: { id: SettingsTab; labelKey: string; defaultLabel: string }[] = [
  { id: 'general', labelKey: 'settings.general', defaultLabel: 'General' },
  { id: 'channels', labelKey: 'settings.channels', defaultLabel: 'Integration' },
  { id: 'security', labelKey: 'settings.security', defaultLabel: 'Security' },
];

interface SettingsPageProps {
  defaultTab?: SettingsTab;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ defaultTab = 'general' }) => {
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<SettingsTab>(defaultTab);
  const [companyName, setCompanyName] = useState('Infosys');
  const [timezone, setTimezone] = useState('+05:30');
  const [language, setLanguage] = useState(i18n.language?.startsWith('ar') ? 'ar' : 'en');
  const [saveFeedback, setSaveFeedback] = useState('');
  const { t } = useTranslation();

  const handleSaveGeneral = () => {
    i18n.changeLanguage(language);
    setSaveFeedback('Saved!');
    setTimeout(() => setSaveFeedback(''), 2000);
  };

  const renderGeneralChannelsContent = () => (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <Input
            label={t('settings.companyName', { defaultValue: 'Company Name' })}
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder={t('settings.companyName', { defaultValue: 'Enter company name' })}
          />
          <Select
            label={t('settings.timezone', { defaultValue: 'Timezone' })}
            value={timezone}
            onChange={setTimezone}
            options={timezoneOptions}
          />
          <Select
            label={t('settings.languageLabel', { defaultValue: 'Language' })}
            value={language}
            onChange={setLanguage}
            options={languageOptions}
          />
        </div>
        <div className="mt-6 flex justify-end items-center gap-3">
          {saveFeedback && <span className="text-sm text-green-600 font-medium">{saveFeedback}</span>}
          <Button variant="primary" size="sm" onClick={handleSaveGeneral}>{t('common.save', { defaultValue: 'Save' })}</Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderSecurityContent = () => (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100">
            <span className="text-xl">🔒</span>
          </div>
          <div className="flex flex-col gap-1">
            <CardTitle>{t('settings.security', { defaultValue: 'Security & Access' })}</CardTitle>
            <p className="text-sm text-slate-500">{t('settings.securityDescription', { defaultValue: 'Manage your password, authentication, and device access' })}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info banner */}
        <div className="flex items-start gap-3 rounded-md border-l-4 border-cyan-600 bg-blue-50 px-5 py-4">
          <span className="shrink-0 text-lg leading-snug text-cyan-600">ℹ️</span>
          <p className="text-[13px] leading-relaxed text-slate-700">
            <span className="font-bold">Password and two-factor authentication features are coming soon.</span>
            {" We're enhancing security options for your account. In the meantime, your account is protected by enterprise-grade security."}
          </p>
        </div>

        {/* Security action rows */}
        <div className="space-y-3">
          {/* Change Password */}
          <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-slate-900">{t('settings.changePassword', { defaultValue: 'Change Password' })}</p>
              <p className="text-xs text-slate-500">{t('settings.changePasswordDesc', { defaultValue: 'Update your account password regularly to keep your account secure' })}</p>
            </div>
            <Button variant="primary" size="sm">{t('settings.changePassword', { defaultValue: '🔐 Change Password' })}</Button>
          </div>

          {/* Two-Factor Authentication */}
          <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-slate-900">{t('settings.twoFactor', { defaultValue: 'Two-Factor Authentication' })}</p>
              <p className="text-xs text-slate-500">{t('settings.twoFactorDesc', { defaultValue: 'Add an extra layer of security to your account with 2FA' })}</p>
            </div>
            <Button variant="primary" size="sm" className="bg-slate-600 hover:bg-slate-700 focus:ring-slate-600">{t('settings.enable2FA', { defaultValue: 'Enable 2FA' })}</Button>
          </div>

          {/* Device Sessions */}
          <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-slate-900">{t('settings.deviceSessions', { defaultValue: 'Device Sessions' })}</p>
              <p className="text-xs text-slate-500">{t('settings.deviceSessionsDesc', { defaultValue: "View and manage devices where you're currently logged in" })}</p>
            </div>
            <Button variant="outline" size="sm">{t('settings.viewSessions', { defaultValue: 'View Sessions' })}</Button>
          </div>

          {/* Last Password Change */}
          <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-slate-900">{t('settings.lastPasswordChange', { defaultValue: 'Last Password Change' })}</p>
              <p className="text-xs text-slate-500">{t('settings.lastPasswordChangeDesc', { defaultValue: 'Your password was last updated 6 months ago' })}</p>
            </div>
            <span className="px-3 py-2 text-sm text-slate-500">Updated: July 15, 2024</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar items={sidebarItems} compact={!sidebarOpen} onNavigate={(href) => setLocation(href)} onLogout={() => setLocation("/login")} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar
          breadcrumbs={[{ label: t('nav.settings', { defaultValue: 'Settings' }) }]}
          showMenuToggle
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="flex-1 overflow-auto p-6">
          <div className="w-full">
            {/* Page title */}
            <h3 className="mb-6 text-2xl font-semibold text-slate-900">{t('settings.title', { defaultValue: 'Settings' })}</h3>

            {/* Pill tab bar */}
            <div className="mb-6 inline-flex items-center gap-1 rounded-lg bg-[#f5f5f5] p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.id === 'channels') { setLocation('/settingsCrmIntegrations'); return; }
                    if (tab.id === 'security') { setLocation('/settingsSecurity'); return; }
                    setActiveTab(tab.id);
                  }}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'border border-[#e5e5e5] bg-white shadow-sm text-slate-900'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t(tab.labelKey, { defaultValue: tab.defaultLabel })}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {activeTab === 'security' ? renderSecurityContent() : renderGeneralChannelsContent()}
          </div>
        </main>
      </div>
    </div>
  );
};
