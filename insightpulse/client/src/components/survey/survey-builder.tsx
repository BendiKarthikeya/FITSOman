import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Smile,
  Star,
  ThumbsUp,
  CheckCircle,
  Type,
  ToggleLeft,
  ImageIcon,
  Calendar,
  Hash
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { auth } from "@/lib/auth";
import { useTranslation } from 'react-i18next';

import { useQuery } from "@tanstack/react-query";

import { SurveyBuilderHeader } from "./survey-builder-header";
import { SurveyEditor } from "./survey-editor";
import { SurveySidebar } from "./survey-sidebar";

interface Question {
  id: string;
  type: string;
  title: string;
  description?: string;
  required: boolean;
  options?: string[];
  minValue?: number;
  maxValue?: number;
  placeholder?: string;
}

interface SurveyBuilderProps {
  survey?: any | null;
  onSaved?: (survey: any) => void;
}

export default function SurveyBuilder({ survey, onSaved }: SurveyBuilderProps) {
  const { t } = useTranslation();
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: "q1",
      type: "evi-slider",
      title: "How satisfied are you with our service?",
      description: "Please rate your satisfaction level",
      required: true,
      minValue: 0,
      maxValue: 100
    }
  ]);

  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [surveyTitle, setSurveyTitle] = useState("Customer Experience Survey");
  const [surveyDescription, setSurveyDescription] = useState("Help us improve your experience");
  const [showPreview, setShowPreview] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (survey) {
      setSurveyTitle(survey.title || "");
      setSurveyDescription(survey.description || "");
      if (Array.isArray(survey.questions) && survey.questions.length > 0) {
        const mappedQuestions = survey.questions.map((q: any) => ({
          id: q.id || `q${Date.now()}`,
          type: q.questionType || q.type || "text-input",
          title: q.questionText || q.title || "",
          description: q.description || "",
          required: q.required !== undefined ? q.required : true,
          options: q.options || [],
          minValue: q.metadata?.min || q.minValue,
          maxValue: q.metadata?.max || q.maxValue,
          placeholder: q.placeholder || ""
        }));
        setQuestions(mappedQuestions);
      }
      setSelectedQuestion(null);
    }
  }, [survey]);

  const questionTypes = [
    { id: "evi-slider", name: t('survey.questionTypes.eviSliders'), icon: Smile, description: t('survey.questionTypes.eviDescription') },
    { id: "nps", name: t('survey.questionTypes.npsScale'), icon: Star, description: t('survey.questionTypes.npsDescription') },
    { id: "csat", name: t('survey.questionTypes.csatRating'), icon: ThumbsUp, description: t('survey.questionTypes.csatDescription') },
    { id: "multiple-choice", name: t('survey.questionTypes.multipleChoiceLabel'), icon: CheckCircle, description: t('survey.questionTypes.multipleChoiceDescription') },
    { id: "text-input", name: t('survey.questionTypes.textInput'), icon: Type, description: t('survey.questionTypes.textInputDescription') },
    { id: "long_text", name: "Long Text", icon: Type, description: "Multi-line text input" },
    { id: "rating", name: t('survey.questionTypes.ratingScale'), icon: Star, description: t('survey.questionTypes.ratingScaleDescription') },
    { id: "yes-no", name: t('survey.questionTypes.yesNo'), icon: ToggleLeft, description: t('survey.questionTypes.yesNoDescription') },
    { id: "number", name: t('survey.questionTypes.numberInput'), icon: Hash, description: t('survey.questionTypes.numberInputDescription') },
    { id: "date", name: "Date Picker", icon: Calendar, description: "Date selection" },
    { id: "image-choice", name: "Image Choice", icon: ImageIcon, description: "Visual selection options" }
  ];

  const templatePresets = [
    {
      id: "flexible-assessment",
      title: "Flexible Assessment Periods",
      description: "Assessments for mid-year and end-of-year cycles.",
      questions: [
        {
          id: "q-flex-1",
          type: "multiple-choice",
          title: "Which assessment period are you completing?",
          required: true,
          options: ["Mid-Year", "End-Year"]
        }
      ]
    }
  ];

  const { data: customTemplates } = useQuery({
    queryKey: ["/api/templates"],
    enabled: !!auth.getUser()
  });

  const allTemplates = [
    ...templatePresets,
    ...(Array.isArray(customTemplates) ? customTemplates : []).map((t: any) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      questions: t.questions
    }))
  ];

  const applyTemplate = (templateId: string) => {
    const template = allTemplates.find(t => t.id === templateId);
    if (!template) return;

    const timestamp = Date.now();
    const clonedQuestions = (template.questions || []).map((q: any, idx: number) => ({
      ...q,
      id: `${templateId}-${idx}-${timestamp}`
    }));

    setSurveyTitle(template.title.replace(" (Template)", ""));
    setSurveyDescription(template.description || "");
    setQuestions(clonedQuestions);
    setSelectedQuestion(null);
    toast({ title: "Template applied" });
  };

  const addQuestion = (type: string) => {
    const newQuestion: Question = {
      id: `q${Date.now()}`,
      type,
      title: "New Question",
      required: false,
      ...(type === "multiple-choice" && { options: ["Option 1", "Option 2"] }),
      ...(type === "rating" && { minValue: 1, maxValue: 5 }),
      ...(type === "evi-slider" && { minValue: 0, maxValue: 100 }),
      ...(type === "nps" && { minValue: 0, maxValue: 10 }),
      ...(type === "csat" && { minValue: 1, maxValue: 5 }),
      ...(type === "text-input" && { placeholder: "Enter your response..." })
    };

    setQuestions([...questions, newQuestion]);
    setSelectedQuestion(newQuestion.id);
    toast({ title: "Question added" });
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const deleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
    if (selectedQuestion === id) setSelectedQuestion(null);
  };

  const duplicateQuestion = (id: string) => {
    const q = questions.find(q => q.id === id);
    if (q) {
      const newQuestion = { ...q, id: `q${Date.now()}`, title: `${q.title} (Copy)` };
      setQuestions([...questions, newQuestion]);
    }
  };

  const moveQuestion = (id: string, direction: 'up' | 'down') => {
    const index = questions.findIndex(q => q.id === id);
    if ((direction === 'up' && index > 0) || (direction === 'down' && index < questions.length - 1)) {
      const newQuestions = [...questions];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]];
      setQuestions(newQuestions);
    }
  };

  const saveSurvey = async () => {
    try {
      const user = auth.getUser();
      const payload = {
        title: surveyTitle,
        description: surveyDescription,
        questions,
        isActive: true,
        ...(survey?.id ? {} : { createdBy: user?.id })
      };

      const res = survey?.id
        ? await apiRequest("PUT", `/api/surveys/${survey.id}`, payload)
        : await apiRequest("POST", "/api/surveys", payload);
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const saved = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/surveys"] });
      toast({ title: "Survey saved" });
      if (onSaved) onSaved(saved);
    } catch (err) {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  };

  const handleSaveTemplateClick = () => {
    setTemplateTitle(surveyTitle + " (Template)");
    setShowSaveTemplateDialog(true);
  };

  const handleConfirmSaveTemplate = async () => {
    try {
      setIsSavingTemplate(true);
      const payload = { title: templateTitle, questions, category: "Custom", isPublic: false };
      const res = await apiRequest("POST", "/api/templates", payload);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast({ title: "Template created" });
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      setShowSaveTemplateDialog(false);
    } catch (err) {
      toast({ title: "Failed to save template", variant: "destructive" });
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const selectedQuestionData = questions.find(q => q.id === selectedQuestion);

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <SurveyBuilderHeader
        title={surveyTitle}
        status="Draft"
        onPreview={() => setShowPreview(true)}
        onPublish={saveSurvey}
        onSave={saveSurvey}
      />

      <div className="flex flex-1 overflow-hidden min-w-[1000px]">
        <div className="w-64 border-r border-border bg-background p-4 flex flex-col gap-4 shrink-0 overflow-y-auto">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Question Types</h3>
          <div className="grid grid-cols-1 gap-2">
            {questionTypes.map((type) => (
              <Button
                key={type.id}
                variant="outline"
                className="justify-start gap-2 h-10 px-3 text-xs"
                onClick={() => addQuestion(type.id)}
              >
                <type.icon className="w-4 h-4" />
                {type.name}
              </Button>
            ))}
          </div>
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Templates</h3>
            {templatePresets.map((t) => (
              <Button key={t.id} variant="ghost" className="justify-start text-left h-auto py-2 px-3 text-xs" onClick={() => applyTemplate(t.id)}>
                {t.title}
              </Button>
            ))}
          </div>
          <div className="mt-auto pt-4">
             <Button size="sm" variant="outline" className="w-full" onClick={handleSaveTemplateClick} disabled={isSavingTemplate}>
                <Copy className="w-4 h-4 mr-1" />
                Save template
              </Button>
          </div>
        </div>

        <SurveyEditor
          questions={questions}
          selectedQuestionId={selectedQuestion}
          onSelectQuestion={setSelectedQuestion}
          onMoveUp={(id) => moveQuestion(id, "up")}
          onMoveDown={(id) => moveQuestion(id, "down")}
          onDuplicate={duplicateQuestion}
          onDelete={deleteQuestion}
        />

        <SurveySidebar
          question={selectedQuestionData || null}
          onUpdate={(updated) => updateQuestion(updated.id, updated)}
          onCancel={() => setSelectedQuestion(null)}
          onSave={saveSurvey}
        />
      </div>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Preview: {surveyTitle}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {questions.map((q) => (
              <Card key={q.id}>
                <CardHeader><CardTitle className="text-base">{q.title}</CardTitle></CardHeader>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Save Template</DialogTitle></DialogHeader>
          <div className="py-4"><Input value={templateTitle} onChange={(e) => setTemplateTitle(e.target.value)} /></div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowSaveTemplateDialog(false)}>Cancel</Button>
            <Button onClick={handleConfirmSaveTemplate} disabled={isSavingTemplate}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
