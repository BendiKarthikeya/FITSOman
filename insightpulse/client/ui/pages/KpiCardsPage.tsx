import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Activity, Medal, Smile, FileCheck, Home, FilePenLine, GitGraph, Users, Navigation, PieChart, Settings } from 'lucide-react';
import { MetricCard, Select } from '../components';
import { Sidebar } from '../layout/Sidebar';
import { Navbar } from '../layout/Navbar';

const sidebarItems = [
  { label: 'Dashboard', icon: <Home className="h-4 w-4" />, href: '/dashboard' },
  { label: 'Surveys', icon: <FilePenLine className="h-4 w-4" />, href: '/surveys' },
  { label: 'Analytics', icon: <GitGraph className="h-4 w-4" />, href: '/analytics' },
  { label: 'Team Insights', icon: <Users className="h-4 w-4" />, href: '/teamInsights' },
  { label: 'Action Planning', icon: <Navigation className="h-4 w-4" />, href: '/actionPlanningBoard' },
  { label: 'Reports', icon: <PieChart className="h-4 w-4" />, href: '/reports' },
  { label: 'Settings', icon: <Settings className="h-4 w-4" />, href: '/settings' },
];

export const KpiCardsPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar items={sidebarItems} compact={!sidebarOpen} onNavigate={(href) => setLocation(href)} onLogout={() => setLocation("/login")} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar
          breadcrumbs={[{ label: 'KPI Cards' }]}
          showMenuToggle
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        <div className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <h1 className="text-2xl font-semibold text-slate-900">KPI Cards</h1>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <Smile className="h-5 w-5 text-slate-700" />
              <Select
                value="6m"
                onChange={() => {}}
                options={[{ label: '6 months', value: '6m' }]}
                className="max-w-28"
              />
            </div>
            <MetricCard title="Engagement Score" value="78/100" icon={<Smile className="h-5 w-5" />} trend={{ value: 12.5, direction: 'up' }} period="Last 6 Months" className="border-0 p-0 shadow-none" />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <FileCheck className="h-5 w-5 text-slate-700" />
              <Select
                value="6m"
                onChange={() => {}}
                options={[{ label: '6 months', value: '6m' }]}
                className="max-w-28"
              />
            </div>
            <MetricCard title="Response Rate" value="62%" icon={<FileCheck className="h-5 w-5" />} trend={{ value: 3.5, direction: 'down' }} period="Last 6 Months" className="border-0 p-0 shadow-none" />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <Medal className="h-5 w-5 text-slate-700" />
              <Select
                value="12m"
                onChange={() => {}}
                options={[{ label: '12 months', value: '12m' }]}
                className="max-w-28"
              />
            </div>
            <MetricCard title="NPS Score" value="34" icon={<Medal className="h-5 w-5" />} trend={{ value: 6, direction: 'up' }} period="Last 12 Months" className="border-0 p-0 shadow-none" />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <Activity className="h-5 w-5 text-slate-700" />
              <Select
                value="1w"
                onChange={() => {}}
                options={[{ label: '1 week', value: '1w' }]}
                className="max-w-28"
              />
            </div>
            <MetricCard title="CSAT %" value="29%" icon={<Activity className="h-5 w-5" />} trend={{ value: 12.5, direction: 'up' }} period="Last Week" className="border-0 p-0 shadow-none" />
           </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
