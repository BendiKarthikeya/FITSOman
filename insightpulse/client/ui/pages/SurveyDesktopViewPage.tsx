import React, { useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SurveyPreviewQuestion {
  id: string;
  type: string;
  title: string;
  required?: boolean;
  options?: string[];
  minValue?: number;
  maxValue?: number;
  placeholder?: string;
}

export interface SurveyDesktopViewPageProps {
  /** Live questions to preview. Falls back to a demo question when empty or omitted. */
  questions?: SurveyPreviewQuestion[];
  /** Survey title shown in the card header. */
  title?: string;
  /** When provided, a close (×) button is shown and this callback is fired on click. */
  onClose?: () => void;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Logo() {
  return (
    <div className="bg-[#0f172a] rounded-lg flex items-center justify-center shrink-0 size-8">
      <span className="font-['IBM_Plex_Sans',sans-serif] font-semibold text-[14px] leading-none text-white select-none">
        IP
      </span>
    </div>
  );
}

function LanguageTabs({
  active,
  onChange,
}: {
  active: 'English' | 'Arabic';
  onChange: (lang: 'English' | 'Arabic') => void;
}) {
  return (
    <div className="bg-[#f5f5f5] flex h-9 items-center justify-center p-[3px] rounded-[10px] w-40">
      {(['English', 'Arabic'] as const).map((lang) => (
        <button
          key={lang}
          onClick={() => onChange(lang)}
          className={`flex-1 h-[29px] flex items-center justify-center px-2 rounded-lg text-[14px] font-medium leading-5 text-[#0a0a0a] font-['Inter',sans-serif] transition-all ${
            active === lang
              ? 'bg-white border border-[#e5e5e5] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]'
              : ''
          }`}
        >
          {lang}
        </button>
      ))}
    </div>
  );
}

function ProgressBar({ fillPct }: { fillPct: number }) {
  return (
    <div className="relative h-2 w-[430px] rounded-full overflow-hidden">
      <div className="absolute inset-0 bg-[#171717] opacity-20 rounded-full" />
      <div
        className="absolute inset-y-0 left-0 bg-[#171717] rounded-full transition-all duration-300"
        style={{ width: `${fillPct}%` }}
      />
    </div>
  );
}

// ── Question type renderers ────────────────────────────────────────────────────

function MultipleChoiceRenderer({ question, value, onChange }: { question: SurveyPreviewQuestion; value?: string; onChange: (v: string) => void }) {
  const options = question.options?.length ? question.options : ['Option 1', 'Option 2'];
  return (
    <div className="flex flex-col gap-4 w-full">
      <p className="font-['Inter',sans-serif] font-medium text-base leading-6 text-[#0a0a0a]">{question.title}</p>
      <div className="flex flex-col gap-3">
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-3 cursor-pointer select-none">
            <div
              role="radio"
              aria-checked={value === opt}
              onClick={() => onChange(opt)}
              className={`shrink-0 size-4 rounded-full border shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] flex items-center justify-center cursor-pointer transition-colors ${
                value === opt ? 'border-[#171717] bg-white' : 'border-[#e5e5e5] bg-white'
              }`}
            >
              {value === opt && <div className="size-2 rounded-full bg-[#171717]" />}
            </div>
            <span className="font-['Inter',sans-serif] font-normal text-[14px] leading-5 text-[#0a0a0a]">{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function TextInputRenderer({ question, value, onChange }: { question: SurveyPreviewQuestion; value?: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-4 w-full">
      <p className="font-['Inter',sans-serif] font-medium text-base leading-6 text-[#0a0a0a]">{question.title}</p>
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={question.placeholder ?? 'Type your answer…'}
        className="w-full h-9 px-3 text-sm border border-[#e5e5e5] rounded-md shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] outline-none focus:border-[#171717] text-[#0a0a0a] bg-white"
      />
    </div>
  );
}

function NPSRenderer({ question, value, onChange }: { question: SurveyPreviewQuestion; value?: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col gap-4 w-full">
      <p className="font-['Inter',sans-serif] font-medium text-base leading-6 text-[#0a0a0a]">{question.title}</p>
      <div className="flex flex-wrap gap-1">
        {Array.from({ length: 11 }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            className={`h-9 w-9 rounded border text-xs font-medium transition-colors ${
              value === i ? 'bg-[#171717] border-[#171717] text-white' : 'border-[#e5e5e5] text-[#0a0a0a] bg-white hover:bg-slate-50'
            }`}
          >
            {i}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-[#717182]">
        <span>Not at all likely</span>
        <span>Extremely likely</span>
      </div>
    </div>
  );
}

function CSATRenderer({ question, value, onChange }: { question: SurveyPreviewQuestion; value?: number; onChange: (v: number) => void }) {
  const emojis = ['😞', '😐', '🙂', '😊', '😍'];
  return (
    <div className="flex flex-col gap-4 w-full">
      <p className="font-['Inter',sans-serif] font-medium text-base leading-6 text-[#0a0a0a]">{question.title}</p>
      <div className="flex gap-4">
        {emojis.map((emoji, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i + 1)}
            className={`text-3xl hover:scale-110 transition-transform p-2 rounded-lg ${value === i + 1 ? 'bg-slate-100 ring-1 ring-[#171717]' : ''}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

function RatingRenderer({ question, value, onChange }: { question: SurveyPreviewQuestion; value?: number; onChange: (v: number) => void }) {
  const max = question.maxValue ?? 5;
  return (
    <div className="flex flex-col gap-4 w-full">
      <p className="font-['Inter',sans-serif] font-medium text-base leading-6 text-[#0a0a0a]">{question.title}</p>
      <div className="flex gap-1">
        {Array.from({ length: max }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i + 1)}
            className={`h-9 w-9 rounded border text-xs font-medium transition-colors ${
              value === i + 1 ? 'bg-[#171717] border-[#171717] text-white' : 'border-[#e5e5e5] text-[#0a0a0a] bg-white hover:bg-slate-50'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

function EVISliderRenderer({ question, value, onChange }: { question: SurveyPreviewQuestion; value?: number; onChange: (v: number) => void }) {
  const min = question.minValue ?? 0;
  const max = question.maxValue ?? 100;
  const current = value ?? Math.round((max - min) / 2 + min);
  return (
    <div className="flex flex-col gap-4 w-full">
      <p className="font-['Inter',sans-serif] font-medium text-base leading-6 text-[#0a0a0a]">{question.title}</p>
      <div className="flex flex-col gap-2">
        <input
          type="range"
          min={min}
          max={max}
          value={current}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-[#171717]"
        />
        <div className="flex justify-between text-xs text-[#717182]">
          <span>{min}</span>
          <span className="font-medium text-[#0a0a0a]">{current}</span>
          <span>{max}</span>
        </div>
      </div>
    </div>
  );
}

function YesNoRenderer({ question, value, onChange }: { question: SurveyPreviewQuestion; value?: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-4 w-full">
      <p className="font-['Inter',sans-serif] font-medium text-base leading-6 text-[#0a0a0a]">{question.title}</p>
      <div className="flex gap-3">
        {['Yes', 'No'].map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`rounded-lg border px-6 py-2 text-sm font-medium transition-colors ${
              value === opt ? 'bg-[#171717] border-[#171717] text-white' : 'border-[#e5e5e5] text-[#0a0a0a] bg-white hover:bg-slate-50'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function QuestionRenderer({
  question,
  answers,
  onChange,
}: {
  question: SurveyPreviewQuestion;
  answers: Record<string, any>;
  onChange: (id: string, val: any) => void;
}) {
  const val = answers[question.id];
  const onSet = (v: any) => onChange(question.id, v);
  switch (question.type) {
    case 'multiple-choice': return <MultipleChoiceRenderer question={question} value={val} onChange={onSet} />;
    case 'nps':             return <NPSRenderer           question={question} value={val} onChange={onSet} />;
    case 'csat':            return <CSATRenderer          question={question} value={val} onChange={onSet} />;
    case 'evi-slider':      return <EVISliderRenderer     question={question} value={val} onChange={onSet} />;
    case 'yes-no':          return <YesNoRenderer         question={question} value={val} onChange={onSet} />;
    case 'rating':          return <RatingRenderer        question={question} value={val} onChange={onSet} />;
    case 'text-input':
    default:                return <TextInputRenderer     question={question} value={val} onChange={onSet} />;
  }
}

// Demo question shown when no real questions are provided
const DEMO_QUESTIONS: SurveyPreviewQuestion[] = [
  {
    id: 'demo-1',
    type: 'multiple-choice',
    title: 'Select the items you use on the desktop.',
    required: false,
    options: ['Hard disks', 'External disks', 'CDs, DVDs, and iPods', 'Connected servers'],
  },
];

// ── Page ───────────────────────────────────────────────────────────────────────

export const SurveyDesktopViewPage: React.FC<SurveyDesktopViewPageProps> = ({
  questions: propQuestions,
  title: propTitle,
  onClose,
}) => {
  const [language, setLanguage] = useState<'English' | 'Arabic'>('English');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});

  const questions = propQuestions && propQuestions.length > 0 ? propQuestions : DEMO_QUESTIONS;
  const surveyTitle = propTitle ?? 'I am a new Survey';
  const totalQuestions = questions.length;
  const currentQuestion = questions[Math.min(currentIdx, totalQuestions - 1)];
  const progressFillPct = ((currentIdx + 1) / totalQuestions) * 100;

  const handleAnswer = (id: string, val: any) => {
    setAnswers((prev) => ({ ...prev, [id]: val }));
  };

  return (
    <div
      data-testid="survey-desktop-view"
      className="bg-[#f1f5f9] flex flex-col gap-[18px] items-center justify-center min-h-full w-full py-12"
    >
      {/* ── Card ── */}
      <div className="bg-white rounded-[14px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] w-[929px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-6">
          <div className="flex items-center gap-[10px]">
            <Logo />
            <span className="font-['IBM_Plex_Sans',sans-serif] font-semibold text-[20px] leading-[1.4] text-[#1b1b1b]">
              {surveyTitle}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageTabs active={language} onChange={setLanguage} />
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Close preview"
              >
                <X className="h-5 w-5 text-[#0a0a0a]" />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex items-start justify-center px-6 pb-6 min-h-[180px]">
          {currentQuestion && (
            <QuestionRenderer
              question={currentQuestion}
              answers={answers}
              onChange={handleAnswer}
            />
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-[#e5e5e5] w-full" />

        {/* Footer */}
        <div className="flex items-center gap-4 px-6 py-5">
          {/* Progress */}
          <div className="flex flex-col gap-1 shrink-0">
            <span className="font-['IBM_Plex_Sans',sans-serif] font-normal text-[16px] leading-6 text-[#1b1b1b] whitespace-nowrap">
              Question: {currentIdx + 1}/{totalQuestions}
            </span>
            <ProgressBar fillPct={progressFillPct} />
          </div>

          {/* Previous */}
          <button
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
            disabled={currentIdx === 0}
            className="flex-1 h-9 bg-white border border-[#e5e5e5] rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] flex items-center justify-center font-['Inter',sans-serif] font-medium text-[14px] leading-5 text-[#0a0a0a] hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Previous
          </button>

          {/* Next */}
          <button
            onClick={() => setCurrentIdx((i) => Math.min(totalQuestions - 1, i + 1))}
            disabled={currentIdx === totalQuestions - 1}
            className="flex-1 h-9 bg-[#171717] rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] flex items-center justify-center font-['IBM_Plex_Sans',sans-serif] font-medium text-[14px] leading-5 text-[#fafafa] hover:bg-[#2a2a2a] transition-colors disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {/* ── Anonymous notice ── */}
      <div className="flex items-center gap-4 w-[929px] px-6">
        <ShieldCheck className="w-4 h-4 text-[#0a0a0a] shrink-0" />
        <span className="font-['Inter',sans-serif] font-medium text-[14px] leading-5 text-[#0a0a0a] whitespace-nowrap">
          Your responses are completely anonymous
        </span>
      </div>
    </div>
  );
};
