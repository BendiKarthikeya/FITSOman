import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { Download, Trash2, Settings, Home, FilePenLine, GitGraph, Users, Navigation, PieChart, ChevronRight, Loader } from 'lucide-react';
import { Sidebar } from '../layout/Sidebar';
import { Navbar } from '../layout/Navbar';
import { useCreateSurvey, useTemplates, useDeleteTemplate } from '../hooks/api';
import { auth } from '@/lib/auth';

interface Template {
  id: string;
  title: string;
  description: string;
  questionCount?: number;
  category: string;
  questions?: Array<{ id: string; text: string; type: string }>;
}

const sidebarItems = [
  { label: 'Dashboard',       icon: <Home className="h-4 w-4" />,       href: '/dashboard' },
  { label: 'Surveys',         icon: <FilePenLine className="h-4 w-4" />, href: '/surveys' },
  { label: 'Analytics',       icon: <GitGraph className="h-4 w-4" />,    href: '/analytics' },
  { label: 'Team Insights',   icon: <Users className="h-4 w-4" />,       href: '/teamInsights' },
  { label: 'Action Planning', icon: <Navigation className="h-4 w-4" />,  href: '/actionPlanningBoard' },
  { label: 'Reports',         icon: <PieChart className="h-4 w-4" />,    href: '/reports' },
  { label: 'Settings',        icon: <Settings className="h-4 w-4" />,    href: '/settings' },
];

interface TemplateCardProps {
  template: Template;
  onDelete?: (id: string) => void;
  onUse?: (id: string) => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onDelete, onUse }) => {
   const { t } = useTranslation();
   return (
   <div
     data-testid="template-card"
     className="bg-white border border-black/10 rounded-[10px] flex flex-col gap-[18px] p-[25px] h-[204px] w-full"
   >
     {/* Title row */}
     <div className="flex gap-3 h-16 items-start w-full">
       <div className="flex-1 min-w-0 flex flex-col gap-[2px]">
         <p className="font-['Inter',sans-serif] font-semibold text-[15px] leading-[22.5px] tracking-[-0.2344px] text-[#0a0a0a] whitespace-nowrap overflow-hidden text-ellipsis">
           {template.title}
         </p>
         <p className="font-['Inter',sans-serif] font-normal text-[13px] leading-[19.5px] tracking-[-0.0762px] text-[#717182] overflow-hidden line-clamp-2">
           {template.description}
         </p>
       </div>
       <button
         aria-label={`Delete ${template.title}`}
         onClick={() => onDelete?.(template.id)}
         className="bg-white rounded-lg w-[38px] h-8 flex items-center justify-center hover:bg-slate-50 shrink-0"
       >
         <Trash2 className="w-4 h-4 text-red-400" />
       </button>
     </div>

     {/* Badges */}
     <div className="flex gap-2 items-center">
       <span className="bg-[#eceef2] border border-transparent rounded-lg px-[9px] py-[3px] text-[#030213] text-[11px] font-normal leading-[16.5px] tracking-[0.0645px] whitespace-nowrap">
         {template.questionCount} {t('survey.questions', { defaultValue: 'Questions' })}
       </span>
       <span className="bg-[#eceef2] border border-transparent rounded-lg px-[9px] py-[3px] text-[#030213] text-[11px] font-normal leading-[16.5px] tracking-[0.0645px] whitespace-nowrap">
         {template.category}
       </span>
     </div>

     {/* Use This Template */}
     <button
       aria-label={`Use ${template.title}`}
       onClick={() => onUse?.(template.id)}
       className="bg-white border border-black/10 rounded-lg h-8 w-full flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
     >
       <Settings className="w-4 h-4 text-[#0a0a0a]" />
       <span className="font-['Inter',sans-serif] font-medium text-[14px] leading-5 tracking-[-0.1504px] text-[#0a0a0a]">
         {t('survey.useThisTemplate', { defaultValue: 'Use This Template' })}
       </span>
     </button>
   </div>
   );
};

export const SurveysTemplatesPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const createSurvey = useCreateSurvey();
  const deleteTemplate = useDeleteTemplate();
  const { data: dbTemplates = [], isLoading } = useTemplates();

  const handleDelete = (id: string) => {
    deleteTemplate.mutate(id);
  };

  const handleUseTemplate = (templateId: string) => {
    const template = dbTemplates.find((t: any) => t.id === templateId);
    if (!template) return;

    const user = auth.getUser();
    
     // Transform template questions to proper format
     const transformedQuestions = (template.questions || []).map((q: any, idx: number) => {
       // Debug: log the raw question object to see what we're working with
       console.log(`Raw question ${idx}:`, q, 'Keys:', Object.keys(q || {}));
       
       // Handle various question structures from database
       let questionText = '';
       
       // Try multiple ways to extract question text
       if (typeof q === 'string') {
         questionText = q;
       } else if (q && typeof q === 'object') {
         questionText = q.title || q.text || q.question || q.label || q.name || q.content || '';
         
         // If still empty, try to find any string property that might be the question
         if (!questionText) {
           for (const key in q) {
             if (typeof q[key] === 'string' && q[key].length > 0 && key !== 'id' && key !== 'type') {
               questionText = q[key];
               break;
             }
           }
         }
       }
       
       // Final fallback
       if (!questionText) {
         questionText = `Question ${idx + 1}`;
       }
       
       return {
         id: q?.id || `q-${idx}-${Date.now()}`,
         title: questionText,
         type: q?.type || q?.questionType || 'text-input',
         required: q?.required ?? q?.isRequired ?? false,
         options: q?.options || q?.choices || [],
         maxValue: q?.maxValue ?? q?.max ?? 5,
         minValue: q?.minValue ?? q?.min ?? 0,
       };
     });

     // Debug log to verify questions are being transformed
     console.log('Template loaded:', { templateId, title: template.title, questionCount: transformedQuestions.length, questions: transformedQuestions });

    createSurvey.mutate(
      {
        title: `${template.title.replace(' (Template)', '')} - Copy`,
        description: template.description,
        questions: transformedQuestions,
        createdBy: user?.id,
      },
      {
        onSuccess: (created) => {
          console.log('Survey created successfully:', created);
          setLocation(`/surveyBuilder/${created.id}`);
        },
      }
    );
  };

  return (
    <div className="flex h-full bg-[#f1f5f9]">
      <Sidebar items={sidebarItems} compact={!sidebarOpen} onNavigate={(href) => setLocation(href)} onLogout={() => setLocation("/login")} />

      <div className="flex flex-1 flex-col min-w-0 pr-2 py-2 overflow-y-auto">
        {/* White rounded card wrapping header + content */}
        <div className="bg-white rounded-xl shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] flex flex-col w-full">
          {/* Top navbar */}
          <Navbar
            breadcrumbs={[{ label: t('nav.surveys', { defaultValue: 'Surveys' }) }, { label: t('survey.templatesList', { defaultValue: 'Templates' }) }]}
            showMenuToggle
            onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          />

          {/* Page content */}
          <div className="flex flex-col py-6">
            {/* Header: title + action buttons */}
            <div className="flex items-center justify-between px-6 mb-6">
              <h1 className="font-['IBM_Plex_Sans',sans-serif] font-semibold text-[24px] leading-[1.3] text-[#0f172a] whitespace-nowrap">
                {t('survey.templatesList', { defaultValue: 'Templates' })}
              </h1>

              <div className="flex items-center gap-2">
                {/* Templates button */}
                <div className="bg-white border border-[#e5e5e5] rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] overflow-hidden flex items-center">
                  <button className="flex items-center gap-2 h-9 px-3 border-r border-[#e5e5e5] hover:bg-slate-50 transition-colors">
                    <Download className="w-4 h-4 text-[#0f172a]" />
                    <span className="font-['IBM_Plex_Sans',sans-serif] font-medium text-[14px] leading-[1.5] text-[#0f172a] whitespace-nowrap">
                      {t('survey.templatesList', { defaultValue: 'Templates' })}
                    </span>
                  </button>
                </div>

                {/* Bulk Import button */}
                <div className="bg-white border border-[#e5e5e5] rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] overflow-hidden flex items-center">
                  <button className="flex items-center gap-2 h-9 px-3 border-r border-[#e5e5e5] hover:bg-slate-50 transition-colors">
                    <Download className="w-4 h-4 text-[#0f172a]" />
                    <span className="font-['IBM_Plex_Sans',sans-serif] font-medium text-[14px] leading-[1.5] text-[#0f172a] whitespace-nowrap">
                      {t('survey.bulkImport', { defaultValue: 'Bulk Import' })}
                    </span>
                  </button>
                </div>

                {/* New Survey button */}
                <button className="bg-[#020617] h-9 px-3 rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] flex items-center justify-center hover:bg-slate-800 transition-colors">
                  <span className="font-['IBM_Plex_Sans',sans-serif] font-medium text-[14px] leading-[1.5] text-[#fafafa] whitespace-nowrap">
                    {t('survey.newSurvey', { defaultValue: 'New Survey' })}
                  </span>
                </button>
              </div>
            </div>

            {/* Template grid */}
            <div className="px-6 pb-6">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-[14px] font-['IBM_Plex_Sans'] text-slate-400">
                  <Loader className="h-4 w-4 animate-spin" /> {t('common.loading', { defaultValue: 'Loading templates…' })}
                </div>
              ) : dbTemplates.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-[14px] font-['IBM_Plex_Sans'] text-slate-400">
                  {t('survey.noSurveysYet', { defaultValue: 'No templates found.' })}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-6">
                  {dbTemplates.map((template: any) => (
                    <TemplateCard
                      key={template.id}
                      template={{
                        id: template.id,
                        title: template.title,
                        description: template.description,
                        questionCount: template.questions?.length || 0,
                        category: template.category || 'Custom',
                        questions: template.questions,
                      }}
                      onDelete={handleDelete}
                      onUse={handleUseTemplate}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
