import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import {
  GripVertical, Download, ChevronDown, Loader, CircleCheck, BadgeAlert, Clock,
  EllipsisVertical, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Home, FilePenLine, GitGraph, Users, Navigation, PieChart, Settings, Trash2, Edit2,
  Globe, Smartphone, Mic, Mail, BarChart3, Share2
} from 'lucide-react';
import { Navbar } from '../layout/Navbar';
import { Sidebar } from '../layout/Sidebar';
import { NewSurveyModal } from '../components/NewSurveyModal';
import { useSurveys, useCreateSurvey, useDeleteSurvey, useSurveyResponseCount } from '../hooks/api';
import type { ApiSurvey, SurveyType, SurveyAudience } from '../hooks/api';
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

type SurveyStatus = 'In Review' | 'Completed' | 'Flagged' | 'In Progress' | 'Pending';

interface SurveyRow {
  id: string;
  name: string;
  sharedWith: SurveyAudience;
  channel: SurveyType;
  status: SurveyStatus;
  date: string;
  responseNumber: number;
}

function mapApiSurvey(s: ApiSurvey): SurveyRow {
  return {
    id: String(s.id),
    name: s.title,
    sharedWith: s.sharedWith ?? 'employee',
    channel: s.surveyType ?? 'web',
    status: s.isActive ? 'In Progress' : 'Completed',
    date: s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-GB') : '—',
    responseNumber: 0,
  };
}

const TABS = ['All', 'Drafts', 'Active', 'Completed'] as const;
const TAB_LABEL_KEYS: Record<string, string> = {
  All: 'common.viewAll',
  Drafts: 'common.draft',
  Active: 'common.active',
  Completed: 'common.completed',
};
type Tab = typeof TABS[number];

function StatusBadge({ status }: { status: SurveyStatus }) {
  const iconClass = 'shrink-0 h-3 w-3';
  let icon: React.ReactNode;
  if (status === 'In Review')   icon = <Loader className={iconClass} />;
  else if (status === 'Flagged') icon = <BadgeAlert className={iconClass} />;
  else if (status === 'Pending') icon = <Clock className={iconClass} />;
  else                           icon = <CircleCheck className={iconClass} />;

  return (
    <span className="inline-flex items-center gap-1 h-[22px] px-1.5 py-0.5 rounded-md border border-slate-200 bg-white text-[14px] font-['IBM_Plex_Sans'] text-slate-500 whitespace-nowrap shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)]">
      {icon}
      {status}
    </span>
  );
}

const SURVEY_TYPE_CONFIG: Record<SurveyType, { label: string; icon: React.ReactNode; color: string }> = {
  web:    { label: 'Web',    icon: <Globe      className="h-3 w-3 shrink-0" />, color: 'text-blue-500' },
  mobile: { label: 'Mobile', icon: <Smartphone className="h-3 w-3 shrink-0" />, color: 'text-violet-500' },
  voice:  { label: 'Voice',  icon: <Mic        className="h-3 w-3 shrink-0" />, color: 'text-emerald-500' },
  email:  { label: 'Email',  icon: <Mail       className="h-3 w-3 shrink-0" />, color: 'text-orange-500' },
};

function ChannelBadge({ channel }: { channel: SurveyType }) {
  const config = SURVEY_TYPE_CONFIG[channel] ?? SURVEY_TYPE_CONFIG.web;
  return (
    <span className={`inline-flex items-center gap-1 h-[22px] px-1.5 py-0.5 rounded-md border border-slate-200 bg-white text-[14px] font-['IBM_Plex_Sans'] whitespace-nowrap ${config.color}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

function ResponseNumberCell({ surveyId }: { surveyId: string }) {
  const { data: responseData } = useSurveyResponseCount(surveyId);
  return (
    <span className="text-[14px] font-['IBM_Plex_Sans'] text-slate-900 text-right">
      {responseData?.count ?? 0}
    </span>
  );
}

export const SurveysPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('All');
  const [query, setQuery] = useState('');
  const [newSurveyOpen, setNewSurveyOpen] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [orderedSurveys, setOrderedSurveys] = useState<SurveyRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<'All' | SurveyStatus>('All');
  const [sharedFilter, setSharedFilter] = useState<'All' | SurveyAudience>('All');
  const [statusOpen, setStatusOpen] = useState(false);
  const [sharedOpen, setSharedOpen] = useState(false);
  const { t } = useTranslation();

  const { data: apiSurveys, isLoading, refetch } = useSurveys();
  const createSurvey = useCreateSurvey();
  const deleteSurvey = useDeleteSurvey();

  const allRows = useMemo(() => (apiSurveys ?? []).map(mapApiSurvey), [apiSurveys]);

  // Initialize ordered surveys when allRows change
  React.useEffect(() => {
    if (allRows.length > 0 && orderedSurveys.length === 0) {
      setOrderedSurveys(allRows);
    }
  }, [allRows, orderedSurveys.length]);

  // Close the row actions menu on scroll/resize — the fixed-position menu can't track its trigger.
  React.useEffect(() => {
    if (!openMenuId) return;
    const close = () => { setOpenMenuId(null); setMenuPos(null); };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [openMenuId]);

   const filteredRows = useMemo(() => {
     return orderedSurveys.filter((row) => {
       const byTab =
         activeTab === 'All' ||
         (activeTab === 'Drafts'    && row.status === 'In Review') ||
         (activeTab === 'Active'    && row.status === 'In Progress') ||
         (activeTab === 'Completed' && row.status === 'Completed');
       const byQuery = row.name.toLowerCase().includes(query.toLowerCase());
       const byStatus = statusFilter === 'All' || row.status === statusFilter;
       const byShared = sharedFilter === 'All' || row.sharedWith === sharedFilter;
       return byTab && byQuery && byStatus && byShared;
     });
   }, [orderedSurveys, activeTab, query, statusFilter, sharedFilter]);

   const handleExportCsv = () => {
     const rows = filteredRows.length > 0 ? filteredRows : orderedSurveys;
     if (rows.length === 0) return;
     const header = ['Name', 'Shared With', 'Channel', 'Status', 'Date', 'Responses'];
     const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
     const csv = [
       header.join(','),
       ...rows.map(r => [r.name, r.sharedWith, r.channel, r.status, r.date, r.responseNumber].map(escape).join(',')),
     ].join('\n');
     const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = `surveys-${new Date().toISOString().slice(0, 10)}.csv`;
     document.body.appendChild(a);
     a.click();
     document.body.removeChild(a);
     URL.revokeObjectURL(url);
   };

   const totalPages = Math.ceil(filteredRows.length / rowsPerPage);
   const paginatedRows = useMemo(() => {
     const startIndex = (currentPage - 1) * rowsPerPage;
     const endIndex = startIndex + rowsPerPage;
     return filteredRows.slice(startIndex, endIndex);
   }, [filteredRows, currentPage, rowsPerPage]);

   const handlePageChange = (page: number) => {
     setCurrentPage(Math.max(1, Math.min(page, totalPages)));
     setSelectedRows(new Set()); // Clear selection when changing page
   };

   const handleSelectRow = (id: string) => {
     const newSelected = new Set(selectedRows);
     if (newSelected.has(id)) {
       newSelected.delete(id);
     } else {
       newSelected.add(id);
     }
     setSelectedRows(newSelected);
   };

   const handleSelectAll = () => {
     if (selectedRows.size === filteredRows.length) {
       setSelectedRows(new Set());
     } else {
       setSelectedRows(new Set(filteredRows.map(r => r.id)));
     }
   };

   const handleDeleteSurvey = (id: string) => {
     deleteSurvey.mutate(id, {
       onSuccess: () => {
         setDeleteConfirmId(null);
         setOpenMenuId(null);
         // Remove deleted survey from ordered list
         setOrderedSurveys(orderedSurveys.filter(s => s.id !== id));
         refetch();
       }
     });
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

     // Find indices in the current visible (paginated) rows
     const draggedIndex = paginatedRows.findIndex(s => s.id === draggedId);
     const targetIndex = paginatedRows.findIndex(s => s.id === targetId);

     if (draggedIndex === -1 || targetIndex === -1) {
       setDraggedId(null);
       setDragOverId(null);
       return;
     }

     // Create a new ordered list by reordering
     const newOrdered = [...orderedSurveys];
     const draggedRow = newOrdered.find(s => s.id === draggedId);
     const targetRow = newOrdered.find(s => s.id === targetId);

     if (draggedRow && targetRow) {
       const draggedOrderIndex = newOrdered.indexOf(draggedRow);
       const targetOrderIndex = newOrdered.indexOf(targetRow);

       // Remove dragged item
       newOrdered.splice(draggedOrderIndex, 1);
       // Insert before target
       newOrdered.splice(targetOrderIndex, 0, draggedRow);

       setOrderedSurveys(newOrdered);
     }

     setDraggedId(null);
     setDragOverId(null);
   };

  return (
    <div className="flex h-screen bg-[#f1f5f9]">
      <Sidebar items={sidebarItems} compact={!sidebarOpen} onNavigate={(href) => setLocation(href)} onLogout={() => setLocation("/login")} />

      {/* Main content wrapper with right + y margin */}
      <div className="flex flex-1 flex-col min-w-0 pr-2 py-2">
        {/* White card */}
        <div className="flex flex-1 flex-col min-h-0 bg-white rounded-xl shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] overflow-hidden">
          {/* Navbar */}
          <Navbar
            breadcrumbs={[{ label: t('survey.title', { defaultValue: 'Surveys' }) }, { label: t('survey.surveyManagement', { defaultValue: 'List' }) }]}
            showMenuToggle
            onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          />

          {/* Page body */}
          <div className="flex flex-col gap-0 py-6 overflow-auto flex-1">
            <div className="flex flex-col gap-4 px-6">
               {/* Title + actions row */}
               <div className="flex items-center justify-between">
                 <h1 className="text-[24px] font-semibold font-['IBM_Plex_Sans'] leading-[1.3] text-slate-900 whitespace-nowrap">
                   {t('survey.surveyManagement', { defaultValue: 'Survey List' })}
                 </h1>
                 <div className="flex items-center gap-2">
                   {/* Delete selected button - shows when surveys are selected */}
                   {selectedRows.size > 0 && (
                     <button
                       onClick={() => {
                         if (confirm(t('survey.deleteConfirm', { defaultValue: `Delete ${selectedRows.size} selected survey(ies)? This action cannot be undone.` }))) {
                           selectedRows.forEach(id => handleDeleteSurvey(id));
                           setSelectedRows(new Set());
                         }
                       }}
                       className="flex items-center gap-2 h-9 px-3 rounded-lg bg-red-600 text-[14px] font-medium font-['IBM_Plex_Sans'] text-white shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] hover:bg-red-700 transition-colors whitespace-nowrap"
                     >
                       <Trash2 className="h-4 w-4 shrink-0" />
                       {t('common.delete', { defaultValue: 'Delete' })} ({selectedRows.size})
                     </button>
                   )}
                   {/* Download / Export CSV */}
                   <div className="flex items-center overflow-hidden rounded-lg border border-[#e5e5e5] bg-white shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)]">
                     <button
                       type="button"
                       onClick={handleExportCsv}
                       disabled={filteredRows.length === 0}
                       className="flex items-center gap-2 h-9 px-3 py-2 border-r border-[#e5e5e5] text-[14px] font-medium font-['IBM_Plex_Sans'] text-slate-900 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                       <Download className="h-4 w-4 shrink-0" />
                       {t('common.download', { defaultValue: 'Download CSV' })}
                     </button>
                   </div>
                   {/* New Survey */}
                   <button
                     onClick={() => setNewSurveyOpen(true)}
                     className="flex items-center justify-center h-9 px-3 rounded-lg bg-slate-950 text-[14px] font-medium font-['IBM_Plex_Sans'] text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] whitespace-nowrap"
                   >
                     {t('survey.createNew', { defaultValue: 'New Survey' })}
                   </button>
                 </div>
               </div>

              {/* Filter row */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  {/* Tabs */}
                  <div className="flex items-center h-[34px] p-[3px] rounded-[10px] bg-[#f5f5f5]">
                    {TABS.map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`h-7 px-2 py-1 rounded-lg text-[14px] font-['IBM_Plex_Sans'] text-slate-900 whitespace-nowrap transition-colors ${
                          activeTab === tab
                            ? 'bg-white border border-[#e5e5e5] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] font-medium'
                            : 'font-normal'
                        }`}
                      >
                        {t(TAB_LABEL_KEYS[tab], { defaultValue: tab })}
                      </button>
                    ))}
                  </div>

                  {/* Right filters */}
                  <div className="flex items-center gap-[10px]">
                    {/* Status filter */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => { setStatusOpen(o => !o); setSharedOpen(false); }}
                        className="flex items-center overflow-hidden rounded-lg border border-slate-100 bg-white shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-2 h-9 px-3 py-2 border-r border-slate-100">
                          <span className="text-[14px] font-medium font-['IBM_Plex_Sans'] text-slate-950 whitespace-nowrap">
                            {t('common.status', { defaultValue: 'Status' })}{statusFilter !== 'All' ? `: ${statusFilter}` : ''}
                          </span>
                        </div>
                        <div className="flex items-center justify-center h-9 w-9">
                          <ChevronDown className="h-4 w-4 text-slate-900" />
                        </div>
                      </button>
                      {statusOpen && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 min-w-[160px]">
                          {(['All', 'In Review', 'In Progress', 'Completed', 'Flagged', 'Pending'] as const).map(s => (
                            <button
                              key={s}
                              onClick={() => { setStatusFilter(s); setStatusOpen(false); setCurrentPage(1); }}
                              className={`w-full text-left px-3 py-2 text-[14px] hover:bg-slate-50 ${statusFilter === s ? 'bg-slate-50 font-medium' : ''}`}
                            >{s}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Shared filter */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => { setSharedOpen(o => !o); setStatusOpen(false); }}
                        className="flex items-center overflow-hidden rounded-lg border border-slate-100 bg-white shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-2 h-9 px-3 py-2 border-r border-slate-100">
                          <span className="text-[14px] font-medium font-['IBM_Plex_Sans'] text-slate-950 whitespace-nowrap">
                            {t('common.share', { defaultValue: 'Shared' })}{sharedFilter !== 'All' ? `: ${sharedFilter === 'customer' ? 'Customer' : 'Employee'}` : ''}
                          </span>
                        </div>
                        <div className="flex items-center justify-center h-9 w-9">
                          <ChevronDown className="h-4 w-4 text-slate-900" />
                        </div>
                      </button>
                      {sharedOpen && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 min-w-[160px]">
                          {([
                            { v: 'All' as const,       label: 'All' },
                            { v: 'customer' as const,  label: 'Customer' },
                            { v: 'employee' as const,  label: 'Employee' },
                          ]).map(opt => (
                            <button
                              key={opt.v}
                              onClick={() => { setSharedFilter(opt.v); setSharedOpen(false); setCurrentPage(1); }}
                              className={`w-full text-left px-3 py-2 text-[14px] hover:bg-slate-50 ${sharedFilter === opt.v ? 'bg-slate-50 font-medium' : ''}`}
                            >{opt.label}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Search */}
                    <div className="flex items-center h-8 w-[300px] px-3 py-1 rounded-lg border border-[#e5e5e5] bg-white shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)]">
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t('common.search', { defaultValue: 'Search tasks...' })}
                        className="flex-1 min-w-0 bg-transparent text-[14px] font-['IBM_Plex_Sans'] text-slate-500 placeholder:text-slate-500 placeholder:opacity-50 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
                   {/* Table header */}
                   <div className="flex items-stretch bg-slate-50 border-b border-slate-200">
                     {/* Drag col */}
                     <div className="w-11 shrink-0 flex items-center justify-center" />
                     {/* Checkbox col */}
                      <div className="flex items-center pl-2 w-[25px] shrink-0 h-10">
                        <button
                          onClick={handleSelectAll}
                          className={`h-4 w-4 rounded-sm border-2 shrink-0 hover:bg-slate-50 flex items-center justify-center transition-colors ${
                            selectedRows.size > 0
                              ? 'bg-slate-900 border-slate-900'
                              : 'bg-white border-slate-300'
                          }`}
                        >
                          {selectedRows.size > 0 && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      </div>
                    {/* Survey Name */}
                    <div className="flex items-center px-3 h-10 flex-1 min-w-0">
                      <span className="text-[14px] font-medium font-['IBM_Plex_Sans'] text-slate-900 truncate">{t('survey.surveyName', { defaultValue: 'Survey Name' })}</span>
                    </div>
                    {/* Shared With */}
                    <div className="flex items-center justify-center px-3 h-10 flex-1">
                      <span className="text-[14px] font-medium font-['IBM_Plex_Sans'] text-slate-900 truncate">{t('common.sharedWith', { defaultValue: 'Shared With' })}</span>
                    </div>
                    {/* Channel */}
                    <div className="flex items-center justify-center px-3 h-10 flex-1">
                      <span className="text-[14px] font-medium font-['IBM_Plex_Sans'] text-slate-900 truncate">{t('survey.surveyType', { defaultValue: 'Channel' })}</span>
                    </div>
                    {/* Status */}
                    <div className="flex items-center justify-center px-3 h-10 flex-1">
                      <span className="text-[14px] font-medium font-['IBM_Plex_Sans'] text-slate-900 truncate">{t('common.status', { defaultValue: 'Status' })}</span>
                    </div>
                    {/* Date */}
                    <div className="flex items-center justify-center px-3 h-10 flex-1">
                      <span className="text-[14px] font-medium font-['IBM_Plex_Sans'] text-slate-900 truncate">{t('common.dateRange', { defaultValue: 'Date' })}</span>
                    </div>
                     {/* Response Number */}
                     <div className="flex items-center justify-center px-3 h-10 flex-1">
                       <span className="text-[14px] font-medium font-['IBM_Plex_Sans'] text-slate-900 text-center whitespace-nowrap">{t('survey.responseNumber', { defaultValue: 'Response Number' })}</span>
                     </div>
                    {/* Actions col */}
                    <div className="w-[80px] shrink-0 h-10 flex items-center justify-end" />
                  </div>

                  {/* Loading / empty states */}
                  {isLoading && (
                    <div className="flex items-center justify-center gap-2 py-12 text-[14px] font-['IBM_Plex_Sans'] text-slate-400">
                      <Loader className="h-4 w-4 animate-spin" /> {t('common.loading', { defaultValue: 'Loading surveys…' })}
                    </div>
                  )}
                  {!isLoading && filteredRows.length === 0 && (
                    <div className="flex items-center justify-center py-12 text-[14px] font-['IBM_Plex_Sans'] text-slate-400">
                      {t('survey.noSurveysYet', { defaultValue: 'No surveys found.' })}
                    </div>
                  )}
                   {/* Rows */}
                   {!isLoading && paginatedRows.map((row) => (
                    <div 
                      key={row.id} 
                      className={`flex items-stretch border-b border-slate-200 last:border-b-0 transition-all ${
                        draggedId === row.id ? 'opacity-50 bg-slate-100' : ''
                      } ${dragOverId === row.id ? 'bg-blue-50 border-t-2 border-t-blue-400' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, row.id)}
                      onDragOver={(e) => handleDragOver(e, row.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, row.id)}
                    >
                      {/* Drag */}
                      <div className="flex items-center justify-center p-2 w-11 shrink-0 h-[53px] cursor-grab hover:bg-slate-50 active:cursor-grabbing">
                        <div className="flex items-center justify-center h-7 w-7">
                          <GripVertical className={`h-3 w-3 ${draggedId === row.id ? 'text-slate-600' : 'text-slate-400'}`} />
                        </div>
                      </div>
                        {/* Checkbox */}
                        <div className="flex items-center pl-2 w-[25px] shrink-0 h-[53px]">
                          <button
                            onClick={() => handleSelectRow(row.id)}
                            className={`h-4 w-4 rounded-sm border-2 shrink-0 hover:bg-slate-50 flex items-center justify-center transition-colors ${
                              selectedRows.has(row.id)
                                ? 'bg-slate-900 border-slate-900'
                                : 'bg-white border-slate-300'
                            }`}
                          >
                            {selectedRows.has(row.id) && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        </div>
                      {/* Survey Name */}
                      <div className="flex items-center px-3 h-[53px] flex-1 min-w-0">
                        <span className="text-[14px] font-medium font-['IBM_Plex_Sans'] text-slate-900 truncate cursor-pointer hover:underline" onClick={() => setLocation(`/viewAnalytics/${row.id}`)}>{row.name}</span>
                      </div>
                      {/* Shared With */}
                      <div className="flex items-center justify-center px-3 h-[53px] flex-1">
                        <span className={`inline-flex items-center h-[22px] px-2 rounded-md text-[13px] font-medium font-['IBM_Plex_Sans'] whitespace-nowrap ${
                          row.sharedWith === 'customer'
                            ? 'bg-blue-50 text-blue-600'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {row.sharedWith === 'customer' ? 'Customer' : 'Employee'}
                        </span>
                      </div>
                      {/* Channel */}
                      <div className="flex items-center justify-center px-3 h-[53px] flex-1">
                        <ChannelBadge channel={row.channel} />
                      </div>
                      {/* Status */}
                      <div className="flex items-center justify-center px-3 h-[53px] flex-1">
                        <StatusBadge status={row.status} />
                      </div>
                      {/* Date */}
                      <div className="flex items-center justify-center px-3 h-[53px] flex-1">
                        <span className="text-[14px] font-['IBM_Plex_Sans'] text-slate-900 truncate">{row.date}</span>
                      </div>
                       {/* Response Number */}
                       <div className="flex items-center justify-center px-3 h-[53px] flex-1">
                         <ResponseNumberCell surveyId={row.id} />
                       </div>
                       {/* Actions */}
                       <div className="flex items-center justify-end gap-3 p-2 w-[80px] shrink-0 h-[53px] relative">
                         {/* More Actions Menu */}
                         <button
                           onClick={(e) => {
                             if (openMenuId === row.id) {
                               setOpenMenuId(null);
                               setMenuPos(null);
                             } else {
                               const r = e.currentTarget.getBoundingClientRect();
                               setMenuPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
                               setOpenMenuId(row.id);
                             }
                           }}
                           className="flex items-center justify-center h-8 w-8 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
                         >
                           <EllipsisVertical className="h-4 w-4 text-slate-500" />
                         </button>
                         
                         {/* Actions dropdown menu — portaled & fixed-positioned so it escapes the table's overflow clipping */}
                         {openMenuId === row.id && menuPos && createPortal(
                           <>
                             <div
                               className="fixed inset-0 z-40"
                               onClick={() => { setOpenMenuId(null); setMenuPos(null); }}
                             />
                             <div
                               style={{ top: menuPos.top, right: menuPos.right }}
                               className="fixed bg-white border border-slate-200 rounded-lg shadow-lg z-50 min-w-[180px]"
                             >
                               <button
                                 onClick={() => { setOpenMenuId(null); setMenuPos(null); setLocation(`/viewAnalytics/${row.id}`); }}
                                 className="w-full flex items-center gap-2 px-3 py-2 text-[14px] text-slate-900 hover:bg-slate-50 first:rounded-t-lg"
                               >
                                 <BarChart3 className="h-4 w-4" />
                                 {t('common.viewResults', { defaultValue: 'View Results' })}
                               </button>
                               <button
                                 onClick={() => { setOpenMenuId(null); setMenuPos(null); setLocation(`/surveyBuilder/${row.id}`); }}
                                 className="w-full flex items-center gap-2 px-3 py-2 text-[14px] text-slate-900 hover:bg-slate-50"
                               >
                                 <Edit2 className="h-4 w-4" />
                                 {t('common.edit', { defaultValue: 'Edit' })}
                               </button>
                               <button
                                 onClick={() => { setOpenMenuId(null); setMenuPos(null); setLocation(`/surveyShare/${row.id}`); }}
                                 className="w-full flex items-center gap-2 px-3 py-2 text-[14px] text-slate-900 hover:bg-slate-50"
                               >
                                 <Share2 className="h-4 w-4" />
                                 {t('common.share', { defaultValue: 'Share' })}
                               </button>
                               <button
                                 onClick={() => { setOpenMenuId(null); setMenuPos(null); setDeleteConfirmId(row.id); }}
                                 className="w-full flex items-center gap-2 px-3 py-2 text-[14px] text-red-600 hover:bg-red-50 last:rounded-b-lg"
                               >
                                 <Trash2 className="h-4 w-4" />
                                 {t('common.delete', { defaultValue: 'Delete' })}
                               </button>
                             </div>
                           </>,
                           document.body
                         )}
                         
                         {/* Delete confirmation dialog */}
                         {deleteConfirmId === row.id && (
                           <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                             <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm">
                               <h3 className="text-[16px] font-semibold text-slate-900 mb-2">
                                 {t('common.confirm', { defaultValue: 'Confirm Delete' })}
                               </h3>
                               <p className="text-[14px] text-slate-600 mb-6">
                                 {t('survey.deleteConfirm', { defaultValue: `Are you sure you want to delete "${row.name}"? This action cannot be undone.` })}
                               </p>
                               <div className="flex gap-3 justify-end">
                                 <button
                                   onClick={() => setDeleteConfirmId(null)}
                                   className="px-4 py-2 text-[14px] font-medium text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50"
                                 >
                                   {t('common.cancel', { defaultValue: 'Cancel' })}
                                 </button>
                                 <button
                                   onClick={() => handleDeleteSurvey(row.id)}
                                   className="px-4 py-2 text-[14px] font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                                 >
                                   {t('common.delete', { defaultValue: 'Delete' })}
                                 </button>
                               </div>
                             </div>
                           </div>
                         )}
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

              {/* Footer / pagination */}
              <div className="flex items-center justify-between px-6 pt-4 text-[14px] font-['IBM_Plex_Sans'] text-slate-500">
                <span>{t('common.rowsSelected', { count: selectedRows.size, defaultValue: '{{count}} of {{total}} row(s) selected.' }).replace('{{count}}', String(selectedRows.size)).replace('{{total}}', String(filteredRows.length))}</span>
               <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2">
                   <span className="text-[14px] font-medium leading-5">{t('common.rowsPerPage', { defaultValue: 'Rows per page' })}</span>
                   <select
                     value={rowsPerPage}
                     onChange={(e) => {
                       setRowsPerPage(Number(e.target.value));
                       setCurrentPage(1);
                     }}
                     className="flex items-center gap-1 h-8 px-2 rounded-lg border border-[#e5e5e5] bg-white shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] text-[14px] font-['IBM_Plex_Sans'] text-slate-900 cursor-pointer"
                   >
                     {[5, 10, 15, 20, 25, 50].map(num => (
                       <option key={num} value={num}>{num}</option>
                     ))}
                   </select>
                 </div>
                   <span className="text-slate-900">{t('common.page', { defaultValue: 'Page' })} {currentPage} {t('common.of', { defaultValue: 'of' })} {totalPages || 1}</span>
                 <div className="flex items-center gap-1">
                   <button
                     onClick={() => handlePageChange(1)}
                     disabled={currentPage === 1}
                     className="flex items-center justify-center h-8 w-8 rounded-lg border border-[#e5e5e5] bg-white shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     <ChevronsLeft className="h-4 w-4" />
                   </button>
                   <button
                     onClick={() => handlePageChange(currentPage - 1)}
                     disabled={currentPage === 1}
                     className="flex items-center justify-center h-8 w-8 rounded-lg border border-[#e5e5e5] bg-white shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     <ChevronLeft className="h-4 w-4" />
                   </button>
                   <button
                     onClick={() => handlePageChange(currentPage + 1)}
                     disabled={currentPage === totalPages}
                     className="flex items-center justify-center h-8 w-8 rounded-lg border border-[#e5e5e5] bg-white shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     <ChevronRight className="h-4 w-4" />
                   </button>
                   <button
                     onClick={() => handlePageChange(totalPages)}
                     disabled={currentPage === totalPages}
                     className="flex items-center justify-center h-8 w-8 rounded-lg border border-[#e5e5e5] bg-white shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     <ChevronsRight className="h-4 w-4" />
                   </button>
                 </div>
               </div>
             </div>
          </div>
        </div>
      </div>
      <NewSurveyModal
        open={newSurveyOpen}
        onClose={() => setNewSurveyOpen(false)}
        onSubmit={({ title, description, surveyType, sharedWith }) => {
          const user = auth.getUser();
          createSurvey.mutate(
            { title, description, questions: [], surveyType, sharedWith, createdBy: user?.id },
            { onSuccess: (created) => { setNewSurveyOpen(false); setLocation(`/surveyBuilder/${created.id}`); } }
          );
        }}
      />
    </div>
  );
};
