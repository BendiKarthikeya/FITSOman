import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { X, LayoutTemplate, Globe, Smartphone, Mic, Mail } from 'lucide-react';
import type { SurveyType, SurveyAudience } from '../hooks/api';

interface NewSurveyModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit?: (data: { title: string; description: string; surveyType: SurveyType; sharedWith: SurveyAudience }) => void;
}

export const NewSurveyModal: React.FC<NewSurveyModalProps> = ({ open, onClose, onSubmit }) => {
  const [, setLocation] = useLocation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [surveyType, setSurveyType] = useState<SurveyType>('web');
  const [sharedWith, setSharedWith] = useState<SurveyAudience>('employee');
  const titleRef = useRef<HTMLInputElement>(null);

  const SURVEY_TYPES: { value: SurveyType; label: string; icon: React.ReactNode }[] = [
    { value: 'web',    label: 'Web',    icon: <Globe      className="h-4 w-4" /> },
    { value: 'mobile', label: 'Mobile', icon: <Smartphone className="h-4 w-4" /> },
    { value: 'voice',  label: 'Voice',  icon: <Mic        className="h-4 w-4" /> },
    { value: 'email',  label: 'Email',  icon: <Mail       className="h-4 w-4" /> },
  ];

  // Focus title input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => titleRef.current?.focus(), 50);
    } else {
      setTitle('');
      setDescription('');
      setSurveyType('web');
      setSharedWith('employee');
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = () => {
    onSubmit?.({ title, description, surveyType, sharedWith });
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal card */}
      <div className="relative bg-white rounded-[14px] shadow-[0px_8px_30px_0px_rgba(0,0,0,0.15)] w-[500px] p-6 flex flex-col gap-[10px]">
        {/* Header row */}
        <div className="flex items-start justify-between gap-0.5">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-[15px] font-semibold font-['Inter',sans-serif] leading-[22.5px] tracking-[-0.23px] text-[#0a0a0a] whitespace-nowrap">
              Create New Survey
            </h3>
            <p className="text-[13px] font-normal font-['Inter',sans-serif] leading-[19.5px] tracking-[-0.08px] text-[#717182]">
              Enter the details for your new survey below.
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center h-6 w-6 rounded-md text-[#717182] hover:text-[#0a0a0a] hover:bg-slate-100 transition-colors shrink-0 mt-0.5"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Survey Title */}
        <div className="flex flex-col gap-2">
          <label className="text-[14px] font-medium font-['IBM_Plex_Sans',sans-serif] leading-5 text-[#0a0a0a]">
            Survey Title
          </label>
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="eg. Customer satisfaction survey"
            className="w-full h-9 px-3 py-1 rounded-lg border border-[#e5e5e5] bg-white text-[16px] font-normal font-['Inter',sans-serif] leading-6 text-[#0a0a0a] placeholder:text-[#737373] outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 transition-colors"
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-2">
          <label className="text-[14px] font-medium font-['IBM_Plex_Sans',sans-serif] leading-5 text-[#0a0a0a]">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter Survey Description"
            rows={3}
            className="w-full h-16 px-3 py-3 rounded-lg border border-[#e5e5e5] bg-white text-[14px] font-normal font-['Inter',sans-serif] leading-5 text-[#0a0a0a] placeholder:text-[#737373] outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 transition-colors resize-none"
          />
        </div>

        {/* Share With */}
        <div className="flex flex-col gap-2">
          <label className="text-[14px] font-medium font-['IBM_Plex_Sans',sans-serif] leading-5 text-[#0a0a0a]">
            Share With
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['employee', 'customer'] as SurveyAudience[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setSharedWith(value)}
                className={`flex items-center justify-center gap-2 h-9 rounded-lg border transition-colors text-[13px] font-medium font-['IBM_Plex_Sans',sans-serif] capitalize ${
                  sharedWith === value
                    ? 'border-[#171717] bg-[#171717] text-white shadow-sm'
                    : 'border-[#e5e5e5] bg-white text-[#0a0a0a] hover:bg-slate-50'
                }`}
              >
                {value === 'employee' ? 'Employee' : 'Customer'}
              </button>
            ))}
          </div>
        </div>

        {/* Survey Type */}
        <div className="flex flex-col gap-2">
          <label className="text-[14px] font-medium font-['IBM_Plex_Sans',sans-serif] leading-5 text-[#0a0a0a]">
            Survey Type
          </label>
          <div className="grid grid-cols-4 gap-2">
            {SURVEY_TYPES.map(({ value, label, icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setSurveyType(value)}
                className={`flex flex-col items-center justify-center gap-1.5 h-[60px] rounded-lg border transition-colors text-[13px] font-medium font-['IBM_Plex_Sans',sans-serif] ${
                  surveyType === value
                    ? 'border-[#171717] bg-[#171717] text-white shadow-sm'
                    : 'border-[#e5e5e5] bg-white text-[#0a0a0a] hover:bg-slate-50'
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {/* Choose Template */}
          <button
            onClick={() => { onClose(); setLocation('/surveysTemplates'); }}
            className="w-full flex items-center justify-center gap-2 h-9 px-3 py-2 rounded-lg border border-[#e5e5e5] bg-white shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] text-[14px] font-medium font-['Inter',sans-serif] leading-5 text-[#0a0a0a] hover:bg-slate-50 transition-colors"
          >
            <LayoutTemplate className="h-4 w-4 shrink-0" />
            Choose Template
          </button>
          <div className="flex items-center gap-[10px]">
            <button
              onClick={onClose}
              className="flex-1 flex items-center justify-center h-9 px-3 py-2 rounded-lg border border-[#e5e5e5] bg-white shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] text-[14px] font-medium font-['Inter',sans-serif] leading-5 text-[#0a0a0a] hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 flex items-center justify-center h-9 px-3 rounded-lg bg-[#171717] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] text-[14px] font-medium font-['IBM_Plex_Sans',sans-serif] leading-[1.5] text-[#fafafa] hover:bg-[#2a2a2a] transition-colors"
            >
              Create Survey
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
