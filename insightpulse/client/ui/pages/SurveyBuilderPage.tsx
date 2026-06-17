import React, { useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { Calendar, ChevronDown, CheckCircle2, Edit3, GripVertical, Presentation, Save, Share2, BookTemplate, Home, FilePenLine, GitGraph, Users, Navigation, PieChart, Settings, Loader, X, Menu, Trash2 } from 'lucide-react';
import { Badge, Button } from '../components';
import { Sidebar } from '../layout/Sidebar';
import { ScheduleSurveyModal } from '../components/ScheduleSurveyModal';
import { SurveyDesktopViewPage } from './SurveyDesktopViewPage';
import { useSurvey } from '../hooks/api';
import { apiRequest } from '@/lib/queryClient';
import { auth } from '@/lib/auth';
import { queryClient } from '@/lib/queryClient';
import type { Question } from '@shared/schema';

interface DragItem {
  type: 'question' | 'field';
  index: number;
  fieldName?: string;
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

const leftSections = [
  { title: 'Text', fields: ['Single Text', 'Multi-line Text', 'Email Field', 'Number Field', 'Link Field', 'Date Field'] },
  { title: 'Choice', fields: ['Multiple Choice', 'Dropdown', 'Boolean'] },
  { title: 'Scale', fields: ['NPS', 'Response Rate', 'EVI'] },
];

function QuestionCard({ question, index, isSelected, onDragStart, onSelect }: { question: Question; index: number; isSelected?: boolean; onDragStart?: (e: React.DragEvent, item: DragItem) => void; onSelect?: () => void }) {
   const typeLabel = question.type ? question.type.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Unknown';
   const questionTitle = question.title || (question as any).text || (question as any).question || (question as any).label || `Question ${index + 1}`;
   
   // Debug log
   if (!question.title && !((question as any).text)) {
     console.log(`Question ${index} missing title:`, question);
   }
   
   return (
     <div onClick={onSelect} className={`relative rounded-[14px] border bg-white px-6 py-5 shadow-sm hover:shadow-md transition-all cursor-pointer ${isSelected ? 'border-slate-500 ring-2 ring-slate-500' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Q{index + 1} · {typeLabel}</span>
            {question.required && (
              <span className="text-xs text-red-500">*Required</span>
            )}
          </div>
          <p className="text-sm font-medium text-slate-900">{questionTitle}</p>
          {/* Render input preview per type */}
          {question.type && (question.type === 'text-input') && (
            <div className="flex h-9 items-center rounded-md border border-slate-200 px-3 text-sm text-slate-400 shadow-sm">
              Type your answer…
            </div>
          )}
          {(question.type === 'multiple-choice') && (
            <div className="space-y-1">
              {(question.options ?? ['Option 1', 'Option 2']).map((opt: string) => (
                <label key={opt} className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="radio" readOnly className="h-4 w-4" /> {opt}
                </label>
              ))}
            </div>
          )}
          {(question.type === 'nps') && (
            <div className="flex gap-1">
              {Array.from({ length: 11 }, (_, i) => (
                <button key={i} type="button" className="h-8 w-8 rounded border border-slate-200 text-xs text-slate-700 hover:bg-slate-100">{i}</button>
              ))}
            </div>
          )}
          {(question.type === 'evi-slider' || question.type === 'rating') && (
            <div className="flex gap-1">
              {Array.from({ length: question.maxValue ?? 5 }, (_, i) => (
                <button key={i} type="button" className="h-8 w-8 rounded border border-slate-200 text-xs text-slate-700 hover:bg-slate-100">{i + 1}</button>
              ))}
            </div>
          )}
          {(question.type === 'csat') && (
            <div className="flex gap-2">
              {['😞', '😐', '🙂', '😊', '😍'].map((emoji) => (
                <button key={emoji} type="button" className="text-2xl hover:scale-110 transition-transform">{emoji}</button>
              ))}
            </div>
          )}
          {(question.type === 'yes-no') && (
            <div className="flex gap-2">
              <button type="button" className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Yes</button>
              <button type="button" className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">No</button>
            </div>
           )}
         </div>
         <button
           draggable
           onDragStart={(e) => onDragStart?.(e, { type: 'question', index })}
           className="cursor-grab active:cursor-grabbing p-1 hover:bg-slate-100 rounded transition-colors"
           title="Drag to reorder"
         >
           <GripVertical className="h-4 w-4 shrink-0 text-slate-400" />
         </button>
       </div>
     </div>
   );
 }

export const SurveyBuilderPage: React.FC<{ surveyId?: string }> = ({ surveyId }) => {
   const [, setLocation] = useLocation();
   const [sidebarOpen, setSidebarOpen] = useState(true);
   const [publishOpen, setPublishOpen] = useState(false);
   const [scheduleOpen, setScheduleOpen] = useState(false);
   const [previewOpen, setPreviewOpen] = useState(false);
   const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
   const [templateName, setTemplateName] = useState('');
   const [isSavingTemplate, setIsSavingTemplate] = useState(false);
   const [templateFeedback, setTemplateFeedback] = useState<string | null>(null);
   const [isSavingSurvey, setIsSavingSurvey] = useState(false);
   const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
   const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
   const [questions, setQuestions] = useState<Question[]>([]);
   const [fieldSections, setFieldSections] = useState(leftSections);
   const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
   const [isEditingTitle, setIsEditingTitle] = useState(false);
   const [editedTitle, setEditedTitle] = useState('');
   const titleInputRef = useRef<HTMLInputElement>(null);
   const publishRef = useRef<HTMLDivElement>(null);
   const { data: survey, isLoading, refetch } = useSurvey(surveyId);
   const user = auth.getUser();

  // Initialize questions from survey data
  React.useEffect(() => {
    if (survey?.questions && Array.isArray(survey.questions)) {
      console.log('Survey loaded with questions:', { surveyId, title: survey.title, questionCount: survey.questions.length, questions: survey.questions });
      setQuestions(survey.questions);
    } else if (survey) {
      console.log('Survey loaded but has no questions:', { surveyId, title: survey.title, questionsField: survey.questions });
      setQuestions([]);
    }
  }, [survey?.questions, survey]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    if (!publishOpen) return;
    function handleClick(e: MouseEvent) {
      if (publishRef.current && !publishRef.current.contains(e.target as Node)) {
        setPublishOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [publishOpen]);

  const title = survey?.title ?? 'Campaign Title';
  const status = survey ? (survey.isActive ? 'Active' : 'Draft') : 'Draft';

  const handleOpenSaveTemplate = () => {
    setPublishOpen(false);
    setTemplateName(title + ' (Template)');
    setTemplateFeedback(null);
    setSaveTemplateOpen(true);
  };

  const handleConfirmSaveTemplate = async () => {
    if (!templateName.trim()) return;
    try {
      setIsSavingTemplate(true);
      setTemplateFeedback(null);
      const res = await apiRequest('POST', '/api/templates', {
        title: templateName,
        questions,
        category: 'Custom',
        isPublic: false,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed');
      }
      setTemplateFeedback('success');
      setTimeout(() => { setSaveTemplateOpen(false); setTemplateFeedback(null); }, 1500);
    } catch {
      setTemplateFeedback('error');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const saveSurvey = async () => {
    if (!surveyId || !survey) {
      alert('Survey not found');
      return;
    }

    try {
      setIsSavingSurvey(true);
      const payload = {
        title: survey.title,
        description: survey.description,
        questions,
        isActive: survey.isActive ?? true,
      };

      const res = await apiRequest('PUT', `/api/surveys/${surveyId}`, payload);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to save survey' }));
        throw new Error(err.error || 'Failed to save survey');
      }

      setPublishOpen(false);
      setLocation(`/surveyShare/${surveyId}`);
    } catch (error) {
      console.error('Failed to save survey:', error);
      alert(`Failed to save survey: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSavingSurvey(false);
    }
  };

  const handleTitleEdit = () => {
    setEditedTitle(title);
    setIsEditingTitle(true);
    setTimeout(() => titleInputRef.current?.select(), 0);
  };

  const handleTitleSave = async () => {
    const trimmed = editedTitle.trim();
    if (!trimmed || !surveyId || !survey || trimmed === title) {
      setIsEditingTitle(false);
      return;
    }
    try {
      const res = await apiRequest('PUT', `/api/surveys/${surveyId}`, {
        title: trimmed,
        description: survey.description,
        questions,
        isActive: survey.isActive ?? true,
      });
      if (!res.ok) throw new Error('Failed');
      await refetch();
    } catch {
      // revert on failure
    } finally {
      setIsEditingTitle(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, item: DragItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

   const handleDrop = (e: React.DragEvent, dropIndex: number, sectionTitle?: string) => {
     e.preventDefault();
     setDragOverIndex(null);
     
     if (!draggedItem) {
       setDraggedItem(null);
       return;
     }
     
     // Handle question reordering
     if (draggedItem.type === 'question') {
       const dragIndex = draggedItem.index;
       if (dragIndex === dropIndex) {
         setDraggedItem(null);
         return;
       }

       // Reorder questions
       const newQuestions = [...questions];
       const [draggedQuestion] = newQuestions.splice(dragIndex, 1);
       newQuestions.splice(dropIndex, 0, draggedQuestion);
       
       // Update the questions state
       setQuestions(newQuestions);
       
       // Question order updated - will be persisted when user clicks "Publish" button
       console.log('Reordered questions:', newQuestions);
     }
     
     // Handle field type creation (dragging from left panel to middle)
     if (draggedItem.type === 'field' && draggedItem.fieldName && !sectionTitle) {
       // Create a new question from the field type
       const fieldName = draggedItem.fieldName;
       const fieldTypeMap: { [key: string]: string } = {
         'Single Text': 'text-input',
         'Multi-line Text': 'text-input',
         'Email Field': 'text-input',
         'Number Field': 'number',
         'Link Field': 'text-input',
         'Date Field': 'date',
         'Multiple Choice': 'multiple-choice',
         'Dropdown': 'dropdown',
         'Boolean': 'yes-no',
         'NPS': 'nps',
         'Response Rate': 'rating',
         'EVI': 'evi-slider',
       };

       const questionType = (fieldTypeMap[fieldName] || 'text-input') as Question['type'];
       const newQuestion: Question = {
         id: `q${Date.now()}`,
         type: questionType,
         title: fieldName,
         required: false,
         ...(questionType === 'multiple-choice' && { options: ['Option 1', 'Option 2'] }),
         ...(questionType === 'rating' && { maxValue: 5 }),
         ...(questionType === 'evi-slider' && { maxValue: 100 }),
         ...(questionType === 'nps' && { maxValue: 10 }),
       };

       const newQuestions = [...questions];
       newQuestions.splice(dropIndex, 0, newQuestion);
       setQuestions(newQuestions);
       setSelectedQuestionId(newQuestion.id);
       console.log('Created new question from field:', newQuestion);
     }
     
     // Handle field type reordering within the same section
     if (draggedItem.type === 'field' && sectionTitle) {
       const dragIndex = draggedItem.index;
       if (dragIndex === dropIndex) {
         setDraggedItem(null);
         return;
       }

       // Reorder fields within the section
       const newSections = fieldSections.map(section => {
         if (section.title === sectionTitle) {
           const newFields = [...section.fields];
           const [draggedField] = newFields.splice(dragIndex, 1);
           newFields.splice(dropIndex, 0, draggedField);
           return { ...section, fields: newFields };
         }
         return section;
       });
       
       // Update the field sections state
       setFieldSections(newSections);
       
       // TODO: Persist the new order to the backend
       console.log('Reordered fields:', newSections);
     }
     
     setDraggedItem(null);
   };

  return (
    <>
    {/* Preview overlay */}
    {previewOpen && (
      <div className="fixed inset-0 z-50 overflow-auto bg-[#f1f5f9]">
        <SurveyDesktopViewPage
          questions={questions as any}
          title={title}
          onClose={() => setPreviewOpen(false)}
        />
      </div>
    )}

    {/* Save as Template dialog */}
    {saveTemplateOpen && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        onClick={(e) => { if (e.target === e.currentTarget) setSaveTemplateOpen(false); }}
      >
        <div className="bg-white rounded-[14px] shadow-[0px_8px_32px_0px_rgba(0,0,0,0.16)] flex flex-col p-6 w-[440px]">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-[15px] text-[#0a0a0a]">Save as Template</h3>
              <p className="text-[13px] text-[#717182] mt-0.5">This survey will be saved to your templates library.</p>
            </div>
            <button onClick={() => setSaveTemplateOpen(false)} className="p-1 rounded-[6px] hover:bg-slate-100">
              <X className="h-4 w-4 text-[#0a0a0a]" />
            </button>
          </div>
          <label className="text-[14px] font-medium text-[#0f172a] mb-1">Template Name</label>
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="h-9 w-full border border-[#e5e5e5] rounded-lg px-3 text-sm text-[#0a0a0a] outline-none focus:border-[#171717] mb-4"
          />
          {templateFeedback === 'success' && <p className="text-[13px] text-green-600 mb-3">Template saved successfully!</p>}
          {templateFeedback === 'error' && <p className="text-[13px] text-red-500 mb-3">Failed to save template. Please try again.</p>}
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setSaveTemplateOpen(false)}
              className="h-9 px-4 border border-[#e5e5e5] rounded-lg text-[14px] font-medium text-[#0a0a0a] hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSaveTemplate}
              disabled={isSavingTemplate || !templateName.trim()}
              className="h-9 px-4 bg-[#171717] rounded-lg text-[14px] font-medium text-white hover:bg-[#2a2a2a] disabled:opacity-60 flex items-center gap-2"
            >
              {isSavingTemplate && <Loader className="h-3 w-3 animate-spin" />}
              Save Template
            </button>
          </div>
        </div>
      </div>
    )}

    <div className="flex h-screen bg-slate-50">
      <Sidebar items={sidebarItems} compact={!sidebarOpen} onNavigate={(href) => setLocation(href)} onLogout={() => setLocation("/login")} />
    <div className="flex flex-col flex-1 overflow-hidden bg-slate-50">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
         <div className="flex items-center gap-4">
           <button
             onClick={() => setSidebarOpen(!sidebarOpen)}
             className="p-2 hover:bg-slate-100 rounded-md transition-colors"
           >
             <Menu className="w-5 h-5" />
           </button>
           <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="cursor-pointer hover:underline" onClick={() => setLocation('/surveys')}>Surveys</span>
            <span>/</span>
            <span>Builder</span>
          </div>
          <div className="h-4 w-px bg-slate-300" />
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') setIsEditingTitle(false); }}
              className="text-lg font-semibold text-slate-900 border-b border-slate-400 bg-transparent outline-none w-48"
              autoFocus
            />
          ) : (
            <h1 className="text-lg font-semibold text-slate-900">
              {isLoading ? <Loader className="h-4 w-4 animate-spin" /> : title}
            </h1>
          )}
          <button onClick={handleTitleEdit} className="rounded-md p-2 hover:bg-slate-100">
            <Edit3 className="h-4 w-4 text-slate-600" />
          </button>
          <Badge variant="warning">{status}</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="inline-flex items-center gap-2" onClick={() => setPreviewOpen(true)}>
            <Presentation className="h-4 w-4" />
            Preview
          </Button>
          {/* Split Publish button */}
          <div ref={publishRef} className="relative flex items-center">
            <button 
              onClick={saveSurvey}
              disabled={isSavingSurvey}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-l-lg bg-slate-950 text-sm font-medium text-white hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSavingSurvey ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Publish
                </>
              )}
            </button>
            <button
              onClick={() => setPublishOpen((v) => !v)}
              disabled={isSavingSurvey}
              className="inline-flex items-center justify-center h-9 w-9 rounded-r-lg bg-slate-950 text-white hover:bg-slate-800 transition-colors border-l border-slate-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            {publishOpen && (
              <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-52 rounded-xl border border-slate-200 bg-white shadow-[0px_8px_24px_0px_rgba(0,0,0,0.12)] py-1">
                <button
                  onClick={() => { setPublishOpen(false); setScheduleOpen(true); }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                  Schedule Survey
                </button>

                <button
                   onClick={() => {
                     setPublishOpen(false);
                     if (surveyId) setLocation(`/surveyShare/${surveyId}`);
                     else setLocation('/surveyShare');
                   }}
                   className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                 >
                   <Share2 className="h-4 w-4 text-slate-400 shrink-0" />
                   Share Survey
                 </button>
                <button
                  onClick={handleOpenSaveTemplate}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <BookTemplate className="h-4 w-4 text-slate-400 shrink-0" />
                  Save as Template
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <aside style={{ width: '280px', flexShrink: 0, overflowY: 'auto', borderRight: '1px solid #e2e8f0', background: 'white', paddingTop: '16px' }}>
          <h2 className="px-3 pb-3 text-[28px] font-normal leading-tight text-slate-800">Types of Fields</h2>
           <div className="space-y-2 px-3">
             {fieldSections.map((section) => (
               <div key={section.title} className="space-y-2">
                 <div className="flex items-center justify-between px-1 py-2">
                   <span className="text-sm font-normal text-slate-500">{section.title}</span>
                   <ChevronDown className="h-4 w-4 text-slate-500" />
                 </div>
                  <div className="space-y-2">
                      {section.fields.map((field, fieldIdx) => (
                        <div
                          key={field}
                          onDragOver={(e) => handleDragOver(e, fieldIdx)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, fieldIdx, section.title)}
                          className={`transition-all duration-200 ${dragOverIndex === fieldIdx ? 'opacity-60 scale-95 bg-blue-50 rounded-lg p-1' : ''}`}
                        >
                          <button
                            type="button"
                            draggable
                            onDragStart={(e) => handleDragStart(e, { type: 'field', index: fieldIdx, fieldName: field })}
                            className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-4 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-grab active:cursor-grabbing transition-colors"
                          >
                            <span>{field}</span>
                            <GripVertical className="h-4 w-4 text-slate-400" />
                          </button>
                        </div>
                      ))}
                  </div>
               </div>
             ))}
           </div>
        </aside>

        <main
          style={{ flex: 1, overflowY: 'auto', minWidth: 0, background: '#f1f5f9', padding: '48px' }}
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
          onDrop={(e) => handleDrop(e, questions.length)}
        >
          <div className="mx-auto max-w-[760px] space-y-2">
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
                <Loader className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading survey…</span>
              </div>
            )}
            {!isLoading && questions.length === 0 && (
              <div
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'; }}
                onDrop={(e) => { e.stopPropagation(); handleDrop(e, 0); }}
                className="flex items-center justify-center py-16 text-sm text-slate-400"
              >
                No questions yet. Drag a field type from the left panel to add one.
              </div>
            )}
              {!isLoading && questions.map((q, idx) => (
                <div
                  key={q.id ?? idx}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, idx)}
                  className={`transition-all duration-200 ${dragOverIndex === idx ? 'opacity-60 scale-95 bg-blue-50 rounded-lg p-2' : 'mb-2'}`}
                >
                  <QuestionCard 
                    question={q} 
                    index={idx} 
                    isSelected={selectedQuestionId === q.id}
                    onDragStart={handleDragStart}
                    onSelect={() => setSelectedQuestionId(q.id)}
                  />
                </div>
              ))}
          </div>
        </main>

        <aside style={{ width: '340px', flexShrink: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', borderLeft: '1px solid #e2e8f0', background: '#fafafa', padding: '16px' }}>
           {!selectedQuestionId ? (
             <div className="flex-1 space-y-4">
               <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Survey Info</p>
               <div>
                 <label className="mb-1 block text-sm font-medium text-slate-900">Title</label>
                 <div className="h-9 w-full flex items-center rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm">
                   {isLoading ? '…' : title}
                 </div>
               </div>
               <div>
                 <label className="mb-1 block text-sm font-medium text-slate-900">Questions</label>
                 <div className="h-9 w-full flex items-center rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm">
                   {isLoading ? '…' : questions.length}
                 </div>
               </div>
               <div>
                 <label className="mb-1 block text-sm font-medium text-slate-900">Status</label>
                 <div className="h-9 w-full flex items-center rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm">
                   {isLoading ? '…' : status}
                 </div>
               </div>
             </div>
           ) : (
             <div className="flex-1 space-y-4">
               <div className="flex items-center justify-between">
                 <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Question Settings</p>
                 <button onClick={() => setSelectedQuestionId(null)} className="p-1 hover:bg-slate-200 rounded">
                   <X className="h-4 w-4 text-slate-600" />
                 </button>
               </div>
               {questions.find(q => q.id === selectedQuestionId) && (
                 <div className="space-y-4">
                   <div>
                     <label className="mb-1 block text-sm font-medium text-slate-900">Question Text</label>
                     <input
                       type="text"
                       value={questions.find(q => q.id === selectedQuestionId)?.title || ''}
                       onChange={(e) => {
                         setQuestions(questions.map(q => 
                           q.id === selectedQuestionId ? { ...q, title: e.target.value } : q
                         ));
                       }}
                       className="h-9 w-full border border-slate-200 rounded-md px-3 text-sm text-slate-700 shadow-sm focus:outline-none focus:border-slate-400"
                       placeholder="Enter question text"
                     />
                   </div>
                   <div>
                     <label className="mb-1 block text-sm font-medium text-slate-900">Question Type</label>
                     <select
                       value={questions.find(q => q.id === selectedQuestionId)?.type || ''}
                       onChange={(e) => {
                         setQuestions(questions.map(q => 
                           q.id === selectedQuestionId ? { ...q, type: e.target.value as Question['type'] } : q
                         ));
                       }}
                       className="h-9 w-full border border-slate-200 rounded-md px-3 text-sm text-slate-700 shadow-sm focus:outline-none focus:border-slate-400"
                     >
                       <option value="text-input">Text Input</option>
                       <option value="long_text">Long Text</option>
                       <option value="multiple-choice">Multiple Choice</option>
                       <option value="nps">NPS</option>
                       <option value="csat">CSAT</option>
                       <option value="evi-slider">EVI Slider</option>
                       <option value="rating">Rating</option>
                       <option value="yes-no">Yes/No</option>
                     </select>
                   </div>
                   {questions.find(q => q.id === selectedQuestionId)?.type === 'multiple-choice' && (
                     <div>
                       <label className="mb-1 block text-sm font-medium text-slate-900">Options</label>
                       <div className="space-y-2">
                         {(questions.find(q => q.id === selectedQuestionId)?.options || []).map((opt, idx) => (
                           <input
                             key={idx}
                             type="text"
                             value={opt}
                             onChange={(e) => {
                               setQuestions(questions.map(q => {
                                 if (q.id === selectedQuestionId && q.options) {
                                   const newOpts = [...q.options];
                                   newOpts[idx] = e.target.value;
                                   return { ...q, options: newOpts };
                                 }
                                 return q;
                               }));
                             }}
                             className="h-8 w-full border border-slate-200 rounded-md px-2 text-xs text-slate-700 shadow-sm focus:outline-none focus:border-slate-400"
                             placeholder={`Option ${idx + 1}`}
                           />
                         ))}
                         <button
                           onClick={() => {
                             setQuestions(questions.map(q => {
                               if (q.id === selectedQuestionId && q.options) {
                                 return { ...q, options: [...q.options, `Option ${q.options.length + 1}`] };
                               }
                               return q;
                             }));
                           }}
                           className="text-xs text-slate-600 hover:text-slate-900 font-medium"
                         >
                           + Add Option
                         </button>
                       </div>
                     </div>
                   )}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="required"
                        checked={questions.find(q => q.id === selectedQuestionId)?.required || false}
                        onChange={(e) => {
                          setQuestions(questions.map(q => 
                            q.id === selectedQuestionId ? { ...q, required: e.target.checked } : q
                          ));
                        }}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      <label htmlFor="required" className="text-sm font-medium text-slate-900">Required</label>
                    </div>
                    <button
                      onClick={() => {
                        setQuestions(questions.filter(q => q.id !== selectedQuestionId));
                        setSelectedQuestionId(null);
                      }}
                      className="w-full flex items-center justify-center gap-2 h-9 rounded-md border border-red-200 bg-red-50 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Question
                    </button>
                 </div>
               )}
             </div>
           )}

           <div className="mt-4 grid grid-cols-2 gap-2">
             <Button variant="ghost" className="h-9" onClick={() => setSelectedQuestionId(null)}>Cancel</Button>
             <Button 
               className="inline-flex h-9 items-center justify-center gap-2"
               onClick={() => {
                 setSelectedQuestionId(null);
                 saveSurvey();
               }}
               disabled={isSavingSurvey}
             >
               {isSavingSurvey ? (
                 <>
                   <Loader className="h-4 w-4 animate-spin" />
                   Saving...
                 </>
               ) : (
                 <>
                   <CheckCircle2 className="h-4 w-4" />
                   Save
                 </>
               )}
             </Button>
           </div>
         </aside>
      </div>
    </div>
    </div>
      <ScheduleSurveyModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        surveyId={surveyId}
        surveyTitle={title}
        userId={user?.id}
      />
    </>
  );
};
