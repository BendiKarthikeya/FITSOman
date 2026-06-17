import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Plus, Home, FilePenLine, GitGraph, Users, Navigation, PieChart, Settings } from 'lucide-react';
import { Navbar } from '../layout/Navbar';
import { Sidebar } from '../layout/Sidebar';
import { Badge, Button, KanbanCard } from '../components';

const sidebarItems = [
  { label: 'Dashboard',       icon: <Home className="h-4 w-4" />,       href: '/dashboard' },
  { label: 'Surveys',         icon: <FilePenLine className="h-4 w-4" />, href: '/surveys' },
  { label: 'Analytics',       icon: <GitGraph className="h-4 w-4" />,    href: '/analytics' },
  { label: 'Team Insights',   icon: <Users className="h-4 w-4" />,       href: '/teamInsights' },
  { label: 'Action Planning', icon: <Navigation className="h-4 w-4" />,  href: '/actionPlanningBoard' },
  { label: 'Reports',         icon: <PieChart className="h-4 w-4" />,    href: '/reports' },
  { label: 'Settings',        icon: <Settings className="h-4 w-4" />,    href: '/settings' },
];

const cards = [
  { title: 'Improve onboarding', description: 'Reduce early churn with a structured onboarding follow-up survey.', owner: 'Amina R', dueDate: '15 Mar', priority: 'high' as const },
  { title: 'Manager coaching', description: 'Create action checklist for low-scoring team leads.', owner: 'David L', dueDate: '22 Mar', priority: 'medium' as const },
  { title: 'Recognition cadence', description: 'Pilot monthly recognition in two departments.', owner: 'Noura K', dueDate: '29 Mar', priority: 'low' as const },
];

const columns = [
  { title: 'To-Do', count: 3 },
  { title: 'In Progress', count: 3 },
  { title: 'Completed', count: 3 },
  { title: 'Review', count: 3 },
];

export const ActionPlanningPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar items={sidebarItems} compact={!sidebarOpen} onNavigate={(href) => setLocation(href)} onLogout={() => setLocation("/login")} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar
          breadcrumbs={[{ label: 'Action Planning' }, { label: 'Plan Board' }]}
          showMenuToggle
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-auto p-6">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-slate-900">Action Planning Board</h1>
            <Button className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          </div>

          <div className="grid min-w-[980px] grid-cols-4 gap-4">
            {columns.map((column) => (
              <section key={column.title} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="mb-3 flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-900">{column.title}</h2>
                  <Badge variant="default">{column.count}</Badge>
                </div>
                <div className="space-y-3">
                  {cards.map((card) => (
                    <KanbanCard
                      key={`${column.title}-${card.title}`}
                      title={card.title}
                      description={card.description}
                      owner={card.owner}
                      dueDate={card.dueDate}
                      priority={card.priority}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};
