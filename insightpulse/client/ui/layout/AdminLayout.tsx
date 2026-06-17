import React, { useState } from 'react';
import { useLocation } from 'wouter';
import {
  Shield, Building2, Layers, KeyRound, ScrollText, MonitorPlay, Rocket,
  RefreshCcw, CalendarRange, Plus,
} from 'lucide-react';
import { Sidebar } from './Sidebar';
import { auth } from '@/lib/auth';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const adminSidebarItems = [
  { label: 'Admin Dashboard', icon: <Shield className="h-4 w-4" />, href: '/admin/dashboard' },
  { label: 'Organizations', icon: <Building2 className="h-4 w-4" />, href: '/admin/organizations' },
  { label: 'Departments', icon: <Layers className="h-4 w-4" />, href: '/admin/departments' },
  { label: 'Permissions', icon: <KeyRound className="h-4 w-4" />, href: '/admin/permissions' },
  { label: 'Audit Logs', icon: <ScrollText className="h-4 w-4" />, href: '/admin/audit-logs' },
  { label: 'Sessions', icon: <MonitorPlay className="h-4 w-4" />, href: '/admin/sessions' },
  { label: 'Subscriptions', icon: <Rocket className="h-4 w-4" />, href: '/admin/subscriptions' },
  { label: 'Data Transfer', icon: <RefreshCcw className="h-4 w-4" />, href: '/admin/data-transfer' },
  { label: 'Assessment Periods', icon: <CalendarRange className="h-4 w-4" />, href: '/admin/assessment-periods' },
  { label: 'Onboarding', icon: <Plus className="h-4 w-4" />, href: '/admin/onboarding' },
];

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [, setLocation] = useLocation();
  const [compact] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar
        items={adminSidebarItems}
        compact={compact}
        onNavigate={(href) => setLocation(href)}
        onLogout={() => {
          auth.logout();
          window.location.href = '/login';
        }}
      />
      <div className="flex-1 min-w-0 overflow-auto">
        {children}
      </div>
    </div>
  );
};
