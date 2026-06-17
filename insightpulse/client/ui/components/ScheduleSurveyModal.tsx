import React, { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronDown, Clock, X, Loader } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { auth } from '@/lib/auth';

interface ScheduleSurveyModalProps {
  open: boolean;
  onClose: () => void;
  /** Survey to schedule. Passed from SurveyBuilderPage. */
  surveyId?: string | null;
  surveyTitle?: string;
  userId?: string;
}

export const ScheduleSurveyModal: React.FC<ScheduleSurveyModalProps> = ({
  open,
  onClose,
  surveyId,
  surveyTitle,
  userId,
}) => {
  const [crmConnection, setCrmConnection] = useState('');
  const [crmOpen, setCrmOpen] = useState(false);
  const [crmConfigs, setCrmConfigs] = useState<any[]>([]);
  const [isLoadingCrm, setIsLoadingCrm] = useState(false);
  const [crmLoadError, setCrmLoadError] = useState<string | null>(null);
  const [contactMethods, setContactMethods] = useState({ whatsapp: false, voice: false, email: false });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const crmRef = useRef<HTMLDivElement>(null);

  // Load CRM configurations when modal opens
  useEffect(() => {
    if (!open) return;
    setIsLoadingCrm(true);
    setCrmLoadError(null);
    apiRequest('GET', '/api/crm-configs')
      .then(r => r.json())
      .then(data => {
        const configs = Array.isArray(data) ? data : (data?.data ?? []);
        setCrmConfigs(configs);
        if (configs.length === 0) setCrmLoadError('No CRM connections found. Add one in Settings → CRM.');
      })
      .catch((err) => {
        setCrmConfigs([]);
        setCrmLoadError(err?.message?.includes('401') ? 'Not authenticated — please log in.' : 'Failed to load CRM connections.');
      })
      .finally(() => setIsLoadingCrm(false));
  }, [open]);

  // Keyboard dismiss
  useEffect(() => {
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [open, onClose]);

  // Close CRM dropdown on outside click
  useEffect(() => {
    if (!crmOpen) return;
    const handle = (e: MouseEvent) => {
      if (crmRef.current && !crmRef.current.contains(e.target as Node)) setCrmOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [crmOpen]);

  if (!open) return null;

  const toggleMethod = (key: keyof typeof contactMethods) =>
    setContactMethods(prev => ({ ...prev, [key]: !prev[key] }));

  const selectedCrm = crmConfigs.find((c) => c.id === crmConnection);

  const handleSchedule = async () => {
    if (!surveyId) {
      setFeedbackMsg({ type: 'error', text: 'No survey selected. Please save the survey first.' });
      return;
    }
    const methods = Object.entries(contactMethods)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (methods.length === 0) {
      setFeedbackMsg({ type: 'error', text: 'Select at least one contact method.' });
      return;
    }
    if (!startDate || !endDate) {
      setFeedbackMsg({ type: 'error', text: 'Please fill in start and end dates.' });
      return;
    }

    try {
      setIsScheduling(true);
      setFeedbackMsg(null);
      const effectiveUserId = userId || auth.getUser()?.id || '';
      const scheduledAt = startDate && startTime
        ? new Date(`${startDate}T${startTime}`).toISOString()
        : new Date(startDate).toISOString();

      const res = await apiRequest('POST', '/api/schedules', {
        surveyId,
        crmConfigId: crmConnection || undefined,
        contactMethods: methods,
        scheduleStartDate: new Date(startDate).toISOString(),
        scheduleEndDate: new Date(endDate).toISOString(),
        scheduledAt,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to schedule');
      }
      setFeedbackMsg({ type: 'success', text: 'Survey scheduled successfully!' });
      setTimeout(() => { setFeedbackMsg(null); onClose(); }, 1500);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err?.message || 'Failed to schedule survey.' });
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-[14px] shadow-[0px_8px_32px_0px_rgba(0,0,0,0.16)] flex flex-col p-[24px] w-[593px]"
      >
        {/* Header */}
        <div className="flex gap-[2px] items-start w-full shrink-0 mb-[20px]">
          <div className="flex flex-1 flex-col gap-[2px] items-start min-w-0">
            <h3 className="font-semibold text-[15px] leading-[22.5px] text-[#0a0a0a] tracking-[-0.2344px] whitespace-nowrap">
              Schedule Survey
            </h3>
            <p className="text-[13px] leading-[19.5px] text-[#717182] tracking-[-0.0762px]">
              Schedule &ldquo;{surveyTitle || 'Survey'}&rdquo; to be sent via CRM at a specific time
            </p>
          </div>
          <button onClick={onClose} className="shrink-0 p-1 rounded-[6px] hover:bg-slate-100 transition-colors ml-2">
            <X className="h-4 w-4 text-[#0a0a0a]" />
          </button>
        </div>

        <div className="flex flex-col gap-[20px] w-full">
          {/* CRM Connection */}
          <div className="flex flex-col gap-[8px] w-full">
            <span className="font-medium text-[14px] leading-5 text-[#0f172a]">Select CRM Connections</span>
            <div ref={crmRef} className="relative">
              <div
                className="bg-white border border-[#e5e5e5] flex h-[36px] items-center justify-between px-3 py-2 rounded-[8px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] w-full cursor-pointer"
                onClick={() => setCrmOpen((v) => !v)}
              >
                <span className="text-[14px] leading-5 truncate flex-1 text-[#0a0a0a]">
                  {isLoadingCrm ? (
                    <span className="flex items-center gap-1 text-[#737373]"><Loader className="h-3 w-3 animate-spin" /> Loading…</span>
                  ) : selectedCrm ? selectedCrm.name : (
                    <span className="text-[#737373]">Choose CRM Connection</span>
                  )}
                </span>
                <ChevronDown className={`h-4 w-4 text-[#0a0a0a] shrink-0 transition-transform ${crmOpen ? 'rotate-180' : ''}`} />
              </div>
              {crmOpen && (
                <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 bg-white border border-[#e5e5e5] rounded-[8px] shadow-[0px_4px_12px_0px_rgba(0,0,0,0.12)] py-1 max-h-48 overflow-y-auto">
                  <div
                    className="px-3 py-2 text-[14px] text-[#737373] cursor-pointer hover:bg-slate-50"
                    onClick={() => { setCrmConnection(''); setCrmOpen(false); }}
                  >
                    None (no CRM)
                  </div>
                  {crmConfigs.map((cfg) => (
                    <div
                      key={cfg.id}
                      className="px-3 py-2 text-[14px] text-[#0a0a0a] cursor-pointer hover:bg-slate-50"
                      onClick={() => { setCrmConnection(cfg.id); setCrmOpen(false); }}
                    >
                      {cfg.name || cfg.crmType || cfg.id}
                    </div>
                  ))}
                  {crmConfigs.length === 0 && !isLoadingCrm && (
                    <div className="px-3 py-2 text-[14px] text-[#737373]">{crmLoadError || 'No CRM connections found'}</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Contact Method */}
          <div className="flex flex-col gap-[8px] w-full">
            <span className="font-medium text-[16px] leading-6 text-[#0a0a0a]">Contact Method</span>
            <div className="flex flex-col gap-[12px]">
              {([['whatsapp', 'Whatsapp'], ['voice', 'Voice Agent'], ['email', 'Email']] as const).map(([key, label]) => (
                <div
                  key={key}
                  className="flex gap-[12px] items-center cursor-pointer"
                  onClick={() => toggleMethod(key)}
                >
                  <div className={`h-4 w-4 rounded-[6px] border border-[#e5e5e5] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] shrink-0 flex items-center justify-center transition-colors ${contactMethods[key] ? 'bg-[#171717] border-[#171717]' : 'bg-white'}`}>
                    {contactMethods[key] && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className="text-[14px] leading-5 text-[#0a0a0a]">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Start Date / End Date */}
          <div className="flex gap-[20px] items-start w-full">
            {/* Start Date */}
            <div className="flex flex-col gap-[8px] flex-1 min-w-0">
              <span className="font-medium text-[14px] leading-5 text-[#0f172a]">Start Date</span>
              <div className="bg-white border border-[#f1f5f9] flex h-[36px] items-center gap-[8px] overflow-hidden px-3 py-1 rounded-[8px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] w-full">
                <Calendar className="h-4 w-4 text-[#737373] shrink-0" />
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="flex-1 text-[14px] leading-6 text-[#0a0a0a] bg-transparent outline-none min-w-0 truncate"
                />
              </div>
            </div>
            {/* End Date */}
            <div className="flex flex-col gap-[8px] flex-1 min-w-0">
              <span className="font-medium text-[14px] leading-5 text-[#0f172a]">End Date</span>
              <div className="bg-white border border-[#f1f5f9] flex h-[36px] items-center gap-[8px] overflow-hidden px-3 py-1 rounded-[8px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] w-full">
                <Calendar className="h-4 w-4 text-[#737373] shrink-0" />
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="flex-1 text-[14px] leading-6 text-[#0a0a0a] bg-transparent outline-none min-w-0 truncate"
                />
              </div>
            </div>
          </div>

          {/* Start Time */}
          <div className="flex flex-col gap-[8px] w-full">
            <span className="font-medium text-[14px] leading-5 text-[#0f172a]">Start Time</span>
            <div className="bg-white border border-[#f1f5f9] flex h-[36px] items-center gap-[8px] overflow-hidden px-3 py-1 rounded-[8px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] w-full">
              <Clock className="h-4 w-4 text-[#737373] shrink-0" />
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="flex-1 text-[14px] leading-6 text-[#0a0a0a] bg-transparent outline-none min-w-0 truncate"
              />
            </div>
          </div>

          {/* Feedback message */}
          {feedbackMsg && (
            <p className={`text-[13px] font-medium ${feedbackMsg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
              {feedbackMsg.text}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-[10px] items-center w-full">
            <button
              onClick={onClose}
              className="flex-1 bg-white border border-[#e5e5e5] flex h-[36px] items-center justify-center px-3 rounded-[8px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] hover:bg-slate-50 transition-colors"
            >
              <span className="font-medium text-[14px] leading-5 text-[#0a0a0a]">Cancel</span>
            </button>
            <button
              onClick={handleSchedule}
              disabled={isScheduling}
              className="flex-1 bg-[#171717] flex h-[36px] items-center justify-center gap-2 px-3 rounded-[8px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] hover:bg-[#2a2a2a] transition-colors disabled:opacity-60"
            >
              {isScheduling && <Loader className="h-3 w-3 animate-spin text-white" />}
              <span className="font-['IBM_Plex_Sans'] font-medium text-[14px] leading-5 text-[#fafafa]">Schedule</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
