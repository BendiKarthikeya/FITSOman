import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { Navbar } from '../layout/Navbar';
import { Sidebar } from '../layout/Sidebar';
import { MetricCard } from '../components/MetricCard';
import { useSurveys, useUnifiedMetrics, useSurveyResponseCount } from '../hooks/api';
import { EngagementTrendCard } from '../components/EngagementTrendCard';
import { QuickActions } from '../components/QuickActions';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/Table';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Checkbox } from '../components/Checkbox';
import { DropdownMenu } from '../components/DropdownMenu';
import {
  Smile,
  FileCheck,
  Activity,
  Medal,
  Filter,
  ChevronDown,
  MoreVertical,
  GripVertical,
  Loader,
  CircleCheck,
  AlertCircle,
  BadgeAlert,
  Clock,
  Home,
  FilePenLine,
  GitGraph,
  Users,
  Navigation,
  PieChart,
  Settings,
} from 'lucide-react';

const sidebarItems = [
  { label: 'Dashboard', icon: <Home className="h-4 w-4" />, href: '/dashboard' },
  { label: 'Surveys', icon: <FilePenLine className="h-4 w-4" />, href: '/surveys' },
  { label: 'Analytics', icon: <GitGraph className="h-4 w-4" />, href: '/analytics' },
  { label: 'Team Insights', icon: <Users className="h-4 w-4" />, href: '/teamInsights' },
  { label: 'Action Planning', icon: <Navigation className="h-4 w-4" />, href: '/actionPlanningBoard' },
  { label: 'Reports', icon: <PieChart className="h-4 w-4" />, href: '/reports' },
  { label: 'Settings', icon: <Settings className="h-4 w-4" />, href: '/settings' },
];

// Response count cell component
function DashboardResponseCountCell({ surveyId }: { surveyId: string }) {
  const { data: responseData } = useSurveyResponseCount(surveyId);
  return (
    <span className="text-sm text-slate-900">
      {responseData?.count ?? 0}
    </span>
  );
}

interface SurveyResponse {
  id: string;
  survey: string;
  channel: string;
  status: 'In Review' | 'Completed' | 'Flagged' | 'In Progress' | 'Pending';
  date: string;
  respondent: string;
  sharedWith: 'employee' | 'customer';
}

export const DashboardPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [orderedResponses, setOrderedResponses] = useState<SurveyResponse[]>([]);
  const { t } = useTranslation();

  const handleViewDetails = (surveyId: string) => {
    setLocation(`/viewAnalytics/${surveyId}`);
  };

  const handleEdit = (surveyId: string) => {
    setLocation(`/surveyBuilder/${surveyId}`);
  };

  const handleDuplicate = (surveyId: string) => {
    console.log('Duplicate survey:', surveyId);
    // TODO: Implement duplicate functionality
  };

  const handleDelete = (surveyId: string) => {
    if (window.confirm('Are you sure you want to delete this survey?')) {
      console.log('Delete survey:', surveyId);
      // TODO: Implement delete functionality
    }
  };

  const ROWS_PER_PAGE = 5;

  const { data: apiSurveys, isLoading: surveysLoading } = useSurveys();
  const { data: metrics } = useUnifiedMetrics();

  const surveyData: SurveyResponse[] = (apiSurveys ?? []).map((s) => ({
    id: String(s.id),
    survey: s.title,
    channel: 'Web',
    status: s.isActive ? 'In Progress' : 'Completed',
    date: s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-GB') : '—',
    respondent: '—',
    sharedWith: (s.sharedWith ?? 'employee') as 'employee' | 'customer',
  }));

  // Initialize ordered responses when surveyData changes
  React.useEffect(() => {
    if (surveyData.length > 0 && orderedResponses.length === 0) {
      setOrderedResponses(surveyData);
    }
  }, [surveyData.length, orderedResponses.length, surveyData]);

  // Calculate pagination
  const totalPages = Math.ceil(orderedResponses.length / ROWS_PER_PAGE);
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
  const endIndex = startIndex + ROWS_PER_PAGE;
  const paginatedData = orderedResponses.slice(startIndex, endIndex);

  const toggleRowSelection = (id: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(id);
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const draggedIndex = paginatedData.findIndex(s => s.id === draggedId);
    const targetIndex = paginatedData.findIndex(s => s.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const newOrdered = [...orderedResponses];
    const draggedRow = newOrdered.find(s => s.id === draggedId);
    const targetRow = newOrdered.find(s => s.id === targetId);

    if (draggedRow && targetRow) {
      const draggedOrderIndex = newOrdered.indexOf(draggedRow);
      const targetOrderIndex = newOrdered.indexOf(targetRow);

      newOrdered.splice(draggedOrderIndex, 1);
      newOrdered.splice(targetOrderIndex, 0, draggedRow);

      setOrderedResponses(newOrdered);
    }

    setDraggedId(null);
    setDragOverId(null);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const getStatusBadge = (status: string) => {
    const iconClass = 'shrink-0 h-3 w-3';
    let icon: React.ReactNode;
    if (status === 'In Review')    icon = <Loader className={iconClass} />;
    else if (status === 'Flagged') icon = <BadgeAlert className={iconClass} />;
    else if (status === 'Pending') icon = <Clock className={iconClass} />;
    else                           icon = <CircleCheck className={iconClass} />;
    return (
      <span className="inline-flex items-center gap-1 h-[22px] px-1.5 py-0.5 rounded-md border border-slate-200 bg-white text-[14px] font-['IBM_Plex_Sans'] text-slate-500 whitespace-nowrap shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)]">
        {icon}
        {status}
      </span>
    );
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar items={sidebarItems} compact={!sidebarOpen} onNavigate={(href) => setLocation(href)} onLogout={() => setLocation("/login")} />
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navbar */}
        <Navbar
          breadcrumbs={[
            { label: t('nav.dashboard', { defaultValue: 'Dashboard' }) },
          ]}
          rightContent={<div className="text-sm text-slate-600">Welcome, User</div>}
          showMenuToggle
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
            {/* Metrics Grid and Engagement Trend */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left side: 4 Metric Cards in 2x2 grid - 50% width */}
              <div className="lg:col-span-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <MetricCard
                    title={t('dashboard.kpis.evi', { defaultValue: 'Engagement Score' })}
                    value={metrics ? `${metrics.eviScore}/100` : '—'}
                    icon={<Smile className="w-[18px] h-[18px]" />}
                    trend={{ value: 12.5, direction: 'up' }}
                    period={t('common.last30Days', { defaultValue: 'Last 30 Days' })}
                  />
                  <MetricCard
                    title={t('dashboard.kpis.responseRate', { defaultValue: 'Response Rate' })}
                    value={metrics ? `${metrics.csatScore}%` : '—'}
                    icon={<FileCheck className="w-[18px] h-[18px]" />}
                    trend={{ value: 3.5, direction: 'up' }}
                    period={t('common.last30Days', { defaultValue: 'Last 30 Days' })}
                  />
                  <MetricCard
                    title={t('survey.activeSurveys', { defaultValue: 'Active Surveys' })}
                    value={(apiSurveys ?? []).filter(s => s.isActive).length}
                    icon={<Activity className="w-[18px] h-[18px]" />}
                    trend={{ value: 3.5, direction: 'up' }}
                    period={t('common.last30Days', { defaultValue: 'Last 30 Days' })}
                  />
                  <MetricCard
                    title={t('dashboard.kpis.nps', { defaultValue: 'NPS Score' })}
                    value={metrics ? metrics.npsScore : '—'}
                    icon={<Medal className="w-[18px] h-[18px]" />}
                    trend={{ value: 12.5, direction: 'up' }}
                    period={t('common.last30Days', { defaultValue: 'Last 30 Days' })}
                  />
                </div>
              </div>

              {/* Right side: Engagement Trend Card - 50% width */}
              <div className="lg:col-span-1">
                <EngagementTrendCard />
              </div>
            </div>

            {/* Quick Actions */}
            <QuickActions onNavigate={(path) => setLocation(path)} />

            {/* Response List Table */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{t('dashboard.insights.recentFeedback', { defaultValue: 'Response List' })}</CardTitle>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    {t('common.filters', { defaultValue: 'Filters' })}
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox />
                      </TableHead>
                      <TableHead className="w-10"></TableHead>
                      <TableHead className="min-w-[200px]">{t('survey.surveyName', { defaultValue: 'Survey Name' })}</TableHead>
                      <TableHead className="w-28">{t('survey.surveyType', { defaultValue: 'Channel' })}</TableHead>
                      <TableHead className="w-28">{t('common.status', { defaultValue: 'Status' })}</TableHead>
                      <TableHead className="w-20">Date</TableHead>
                      <TableHead className="w-32">Response Count</TableHead>
                      <TableHead className="w-32">Shared With</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                   <TableBody>
                     {surveysLoading && (
                       <tr>
                         <td colSpan={9} className="text-center py-8 text-sm text-slate-400">
                           <Loader className="w-4 h-4 animate-spin inline mr-2" />{t('common.loading', { defaultValue: 'Loading surveys…' })}
                         </td>
                       </tr>
                     )}
                     {!surveysLoading && orderedResponses.length === 0 && (
                       <tr>
                         <td colSpan={9} className="text-center py-8 text-sm text-slate-400">{t('survey.noSurveysYet', { defaultValue: 'No surveys yet.' })}</td>
                       </tr>
                     )}
                     {!surveysLoading && paginatedData.map((row) => (
                       <TableRow 
                         key={row.id}
                         className={`transition-all ${
                           draggedId === row.id ? 'opacity-50 bg-slate-100' : ''
                         } ${dragOverId === row.id ? 'bg-blue-50' : ''}`}
                         draggable
                         onDragStart={(e) => handleDragStart(e, row.id)}
                         onDragOver={(e) => handleDragOver(e, row.id)}
                         onDragLeave={handleDragLeave}
                         onDrop={(e) => handleDrop(e, row.id)}
                       >
                         <TableCell className="w-10">
                           <Checkbox
                             checked={selectedRows.has(row.id)}
                             onCheckedChange={() => toggleRowSelection(row.id)}
                           />
                         </TableCell>
                         <TableCell className={`w-10 cursor-grab active:cursor-grabbing ${draggedId === row.id ? 'text-slate-600' : 'text-slate-400'}`}>
                           <GripVertical className="w-4 h-4" />
                         </TableCell>
                         <TableCell className="font-medium min-w-[200px]">{row.survey}</TableCell>
                         <TableCell className="w-28">
                           <Badge variant="default">{row.channel}</Badge>
                         </TableCell>
                         <TableCell className="w-28">{getStatusBadge(row.status)}</TableCell>
                         <TableCell className="w-20">{row.date}</TableCell>
                         <TableCell className="w-32">
                           <DashboardResponseCountCell surveyId={row.id} />
                         </TableCell>
                          <TableCell className="w-32">
                            <span className={`inline-flex items-center h-[22px] px-2 rounded-md text-[13px] font-medium font-['IBM_Plex_Sans'] whitespace-nowrap ${
                              row.sharedWith === 'customer'
                                ? 'bg-blue-50 text-blue-600'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {row.sharedWith === 'customer' ? 'Customer' : 'Employee'}
                            </span>
                          </TableCell>
                          <TableCell className="w-10">
                            <DropdownMenu
                              trigger={
                                <button className="p-2 hover:bg-slate-100 rounded-md">
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              }
                              items={[
                                {
                                  label: 'View Details',
                                  onClick: () => handleViewDetails(row.id),
                                },
                                {
                                  label: 'Edit',
                                  onClick: () => handleEdit(row.id),
                                },
                                {
                                  label: 'Duplicate',
                                  onClick: () => handleDuplicate(row.id),
                                },
                                {
                                  divider: true,
                                },
                                {
                                  label: 'Delete',
                                  onClick: () => handleDelete(row.id),
                                },
                              ]}
                              align="right"
                            />
                          </TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
                </div>

                 {/* Pagination */}
                 <div className="mt-4 flex justify-between items-center text-sm text-slate-600">
                   <span>{selectedRows.size} of {orderedResponses.length} row(s) selected.</span>
                   <div className="flex items-center gap-4">
                     <span>Page {currentPage} of {totalPages || 1}</span>
                     <div className="flex gap-2">
                       <Button 
                         variant="outline" 
                         size="sm"
                         onClick={handlePreviousPage}
                         disabled={currentPage === 1}
                       >
                         {'<'}
                       </Button>
                       <Button 
                         variant="outline" 
                         size="sm"
                         onClick={handleNextPage}
                         disabled={currentPage === totalPages}
                       >
                         {'>'}
                       </Button>
                     </div>
                   </div>
                 </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
