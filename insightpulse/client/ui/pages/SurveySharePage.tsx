import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import {
  Home, FilePenLine, GitGraph, Users, Navigation, PieChart, Settings,
  GripVertical, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Copy, Check, Loader, Download, Tag,
} from 'lucide-react';
import { Navbar } from '../layout/Navbar';
import { Sidebar } from '../layout/Sidebar';
import { ScheduleSurveyModal } from '../components/ScheduleSurveyModal';
import { useSurvey } from '../hooks/api';
import { auth } from '@/lib/auth';
import { apiRequest } from '@/lib/queryClient';
import QRCodeStyling from 'qr-code-styling';

const sidebarItems = [
  { label: 'Dashboard',       icon: <Home className="h-4 w-4" />,       href: '/dashboard' },
  { label: 'Surveys',         icon: <FilePenLine className="h-4 w-4" />, href: '/surveys' },
  { label: 'Analytics',       icon: <GitGraph className="h-4 w-4" />,    href: '/analytics' },
  { label: 'Team Insights',   icon: <Users className="h-4 w-4" />,       href: '/teamInsights' },
  { label: 'Action Planning', icon: <Navigation className="h-4 w-4" />,  href: '/actionPlanningBoard' },
  { label: 'Reports',         icon: <PieChart className="h-4 w-4" />,    href: '/reports' },
  { label: 'Settings',        icon: <Settings className="h-4 w-4" />,    href: '/settings' },
];

/** Map a raw CRM row to the display shape we need. Tries common column names. */
function parseContactFromRow(row: Record<string, any>): { name: string; email: string; phone: string; role: string; department: string } {
  const entries = Object.entries(row);
  const findByPattern = (pattern: RegExp): string => {
    const match = entries.find(([k, v]) => pattern.test(k) && v !== null && v !== undefined && String(v).trim() !== '');
    return match ? String(match[1]).trim() : '';
  };
  let name = findByPattern(/^(full[_\s]?name|fullname|name|contact[_\s]?name|account[_\s]?name|display[_\s]?name)$/i);
  if (!name) {
    const first = findByPattern(/^(first[_\s]?name|firstname|given[_\s]?name)$/i);
    const last  = findByPattern(/^(last[_\s]?name|lastname|surname|family[_\s]?name)$/i);
    name = [first, last].filter(Boolean).join(' ').trim();
  }
  if (!name) {
    const first = entries.find(([, v]) => v !== null && v !== undefined && String(v).trim() !== '');
    if (first) name = String(first[1]).trim();
  }
  const email = findByPattern(/email/i);
  const phone = findByPattern(/^(phone|mobile|cell|telephone|tel)[_\s]?/i) || findByPattern(/phone|mobile|cell/i);
  const role = findByPattern(/^(role|job[_\s]?title|title|position|jobtitle)$/i);
  const department = findByPattern(/^(department|dept|division|team|group)$/i);
  return { name, email, phone, role, department };
}

const DEMO_CONTACTS: { name: string; email: string; phone: string; role: string; department: string }[] = [
  { name: 'Karthikeya Kumar',   email: 'karthikeya@insightpulse.com',  phone: '+91 94913 92074', role: 'Senior Engineer',         department: 'Engineering' },
  { name: 'Aditya Singh',       email: 'aditya@insightpulse.com',      phone: '+91 98765 43210', role: 'Product Manager',         department: 'Product' },
  { name: 'Priya Sharma',       email: 'priya.sharma@insightpulse.com', phone: '+91 87654 32109', role: 'HR Business Partner',     department: 'HR' },
  { name: 'Rahul Patel',        email: 'rahul.patel@insightpulse.com', phone: '+91 76543 21098', role: 'Frontend Developer',      department: 'Engineering' },
  { name: 'Neha Reddy',         email: 'neha.reddy@insightpulse.com',  phone: '+91 65432 10987', role: 'QA Engineer',             department: 'Engineering' },
  { name: 'Arjun Verma',        email: 'arjun.verma@insightpulse.com', phone: '+91 54321 09876', role: 'DevOps Engineer',         department: 'Engineering' },
  { name: 'Divya Gupta',        email: 'divya.gupta@insightpulse.com', phone: '+91 43210 98765', role: 'UX Designer',             department: 'Design' },
  { name: 'Vikram Desai',       email: 'vikram.desai@insightpulse.com', phone: '+91 32109 87654', role: 'Backend Engineer',        department: 'Engineering' },
  { name: 'Ananya Nair',        email: 'ananya.nair@insightpulse.com', phone: '+91 21098 76543', role: 'Talent Acquisition',      department: 'HR' },
  { name: 'Sanjay Rao',         email: 'sanjay.rao@insightpulse.com',  phone: '+91 10987 65432', role: 'Security Engineer',       department: 'Engineering' },
  { name: 'Isha Kapoor',        email: 'isha.kapoor@insightpulse.com', phone: '+91 90123 45678', role: 'HR Coordinator',          department: 'HR' },
  { name: 'Rohan Bhat',         email: 'rohan.bhat@insightpulse.com',  phone: '+91 89012 34567', role: 'ML Engineer',             department: 'Data' },
  { name: 'Pooja Mehta',        email: 'pooja.mehta@insightpulse.com', phone: '+91 78901 23456', role: 'Product Designer',        department: 'Design' },
  { name: 'Abhishek Singh',     email: 'abhishek.singh@insightpulse.com', phone: '+91 67890 12345', role: 'Solutions Architect',  department: 'Engineering' },
  { name: 'Kavya Iyer',         email: 'kavya.iyer@insightpulse.com',  phone: '+91 56789 01234', role: 'Customer Success Mgr',   department: 'Customer Success' },
  { name: 'Meera Joshi',        email: 'meera.joshi@insightpulse.com', phone: '+91 45678 90123', role: 'Finance Analyst',        department: 'Finance' },
  { name: 'Karan Malhotra',     email: 'karan.malhotra@insightpulse.com', phone: '+91 34567 89012', role: 'Sales Executive',     department: 'Sales' },
  { name: 'Shreya Pillai',      email: 'shreya.pillai@insightpulse.com', phone: '+91 23456 78901', role: 'HR Manager',           department: 'HR' },
  { name: 'Dev Agarwal',        email: 'dev.agarwal@insightpulse.com', phone: '+91 12345 67890', role: 'Data Analyst',           department: 'Data' },
  { name: 'Tanvi Bhatt',        email: 'tanvi.bhatt@insightpulse.com', phone: '+91 11234 56789', role: 'Marketing Specialist',   department: 'Marketing' },
];

function SectionCard({
  title,
  description,
  children,
  defaultOpen = true,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border border-[#e5e5e5] rounded-[8px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] flex flex-col px-3 py-[12px] w-full shrink-0">
      <button
        className="flex gap-[44px] items-start w-full text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex flex-col gap-1 flex-1">
          <h2 className="font-semibold text-[20px] leading-[30px] text-[#0a0a0a] tracking-[-0.4492px] whitespace-nowrap">
            {title}
          </h2>
          <p className="text-[14px] leading-[21px] text-[#717182] tracking-[-0.1504px] whitespace-nowrap">
            {description}
          </p>
        </div>
        <div className="flex items-center justify-end shrink-0 mt-1">
          <ChevronDown
            className={`h-4 w-4 text-[#0a0a0a] transition-transform duration-200 ${open ? 'rotate-0' : '-rotate-90'}`}
          />
        </div>
      </button>
      {open && <div className="flex flex-col gap-5 mt-5">{children}</div>}
    </div>
  );
}

function LangToggle({
  value,
  onChange,
}: {
  value: 'english' | 'arabic';
  onChange: (v: 'english' | 'arabic') => void;
}) {
  return (
    <div className="bg-[#f5f5f5] flex h-[36px] items-center justify-center p-[3px] rounded-[10px] w-[160px] shrink-0">
      <button
        className={`flex flex-1 flex-col h-[29px] items-center justify-center px-2 py-1 rounded-[8px] transition-all ${
          value === 'english'
            ? 'bg-white border border-[#e5e5e5] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]'
            : ''
        }`}
        onClick={() => onChange('english')}
      >
        <span className="text-[14px] font-medium leading-5 text-[#0a0a0a] whitespace-nowrap">English</span>
      </button>
      <button
        className={`flex flex-1 flex-col h-[29px] items-center justify-center px-2 py-1 rounded-[8px] transition-all ${
          value === 'arabic'
            ? 'bg-white border border-[#e5e5e5] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]'
            : ''
        }`}
        onClick={() => onChange('arabic')}
      >
        <span className="text-[14px] font-medium leading-5 text-[#0a0a0a] whitespace-nowrap">Arabic</span>
      </button>
    </div>
  );
}

function SelectDropdown({
  placeholder, value, options, onChange, loading,
}: {
  placeholder: string;
  value?: string;
  options?: { label: string; value: string }[];
  onChange?: (v: string) => void;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selectedLabel = options?.find(o => o.value === value)?.label;
  const interactive = !!onChange;

  useEffect(() => {
    if (!open || !interactive) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open, interactive]);

  return (
    <div ref={ref} className="relative">
      <div
        className="bg-white border border-[#e5e5e5] flex h-[36px] items-center justify-between px-3 py-2 rounded-[8px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] w-full cursor-pointer"
        onClick={() => interactive && !loading && setOpen(v => !v)}
      >
        <span className={`text-[14px] leading-5 truncate ${selectedLabel ? 'text-[#0a0a0a]' : 'text-[#737373]'}`}>
          {loading ? 'Loading…' : (selectedLabel || placeholder)}
        </span>
        {loading ? <Loader className="h-3 w-3 animate-spin text-[#737373] shrink-0" /> : <ChevronDown className="h-4 w-4 text-[#0a0a0a] shrink-0" />}
      </div>
      {open && interactive && (
        <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 bg-white border border-[#e5e5e5] rounded-[8px] shadow-[0px_4px_12px_0px_rgba(0,0,0,0.12)] py-1 max-h-48 overflow-y-auto">
          {!options?.length && <div className="px-3 py-2 text-[14px] text-[#737373]">No options available</div>}
          {options?.map(opt => (
            <div
              key={opt.value}
              className={`px-3 py-2 text-[14px] cursor-pointer hover:bg-slate-50 ${opt.value === value ? 'font-medium text-[#171717]' : 'text-[#0a0a0a]'}`}
              onClick={() => { onChange?.(opt.value); setOpen(false); }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TextInput({ placeholder, value, onChange }: { placeholder: string; value?: string; onChange?: (v: string) => void }) {
  if (onChange) {
    return (
      <div className="bg-white border border-[#e5e5e5] flex h-[36px] items-center overflow-hidden px-3 py-1 rounded-[8px] w-full">
        <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="flex-1 text-[16px] leading-6 bg-transparent outline-none text-[#0a0a0a] placeholder-[#737373]" />
      </div>
    );
  }
  return (
    <div className="bg-white border border-[#e5e5e5] flex h-[36px] items-center overflow-hidden px-3 py-1 rounded-[8px] w-full">
      <span className="text-[16px] leading-6 truncate" style={{ color: value ? '#0a0a0a' : '#737373' }}>{value || placeholder}</span>
    </div>
  );
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const splitRow = (line: string): string[] => {
    const out: string[] = [];
    let cur = '', inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuote = !inQuote;
      } else if (c === ',' && !inQuote) { out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur);
    return out.map(s => s.trim());
  };
  const headers = splitRow(lines[0]).map(h => h.toLowerCase());
  // If the first row doesn't look like a header (no email/phone/name keyword), treat as headerless
  const looksLikeHeader = headers.some(h => /name|email|phone|mobile/.test(h));
  if (!looksLikeHeader) {
    return lines.map(line => {
      const cells = splitRow(line);
      const obj: Record<string, string> = {};
      cells.forEach((v, i) => { obj[`col${i}`] = v; });
      // Heuristic mapping: name, email (contains @), phone (has digits/+)
      const email = cells.find(v => v.includes('@')) || '';
      const phone = cells.find(v => /^\+?[\d\s\-()]{6,}$/.test(v)) || '';
      const name = cells.find(v => v && v !== email && v !== phone) || '';
      obj.name = name; obj.email = email; obj.phone = phone;
      return obj;
    });
  }
  return lines.slice(1).map(line => {
    const cells = splitRow(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = cells[i] ?? ''; });
    return obj;
  });
}

function CsvInput({ onParse }: { onParse: (contacts: { name: string; email: string; phone: string; role: string; department: string }[]) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [count, setCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      const contacts = rows
        .map(parseContactFromRow)
        .filter(c => c.email || c.phone);
      if (contacts.length === 0) throw new Error('No valid email/phone columns found');
      onParse(contacts);
      setFileName(file.name);
      setCount(contacts.length);
    } catch (err: any) {
      setError(err.message || 'Failed to parse CSV');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <div
        onClick={() => inputRef.current?.click()}
        className="bg-white border border-dashed border-[#e5e5e5] flex h-[36px] items-center justify-center overflow-hidden px-3 py-1 rounded-[8px] w-full cursor-pointer hover:bg-slate-50 transition-colors"
      >
        <span className="text-[14px] text-[#737373] leading-6 truncate">
          {fileName ? `${fileName} — ${count} contact${count === 1 ? '' : 's'} loaded` : 'Choose File'}
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleChange}
        className="hidden"
      />
      {error && <span className="text-[12px] text-red-500">{error}</span>}
    </>
  );
}

function getPublicLink(surveyId: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/s/${surveyId}`;
}

// Functional QR code component
function QrCodeComponent({ surveyId }: { surveyId: string }) {
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const qrCodeInstance = useRef<QRCodeStyling | null>(null);
  const shareUrl = surveyId ? getPublicLink(surveyId) : "";

  useEffect(() => {
    if (!shareUrl || !qrCodeRef.current) return;
    const container = qrCodeRef.current;
    container.innerHTML = '';
    qrCodeInstance.current = new QRCodeStyling({
      width: 160,
      height: 160,
      data: shareUrl,
      margin: 10,
      qrOptions: { typeNumber: 0, mode: "Byte", errorCorrectionLevel: "H" },
      imageOptions: { hideBackgroundDots: true, imageSize: 0.4, margin: 0 },
      dotsOptions: { color: "#000000", type: "rounded" },
      backgroundOptions: { color: "#ffffff" },
      image: undefined,
      cornersSquareOptions: { type: "extra-rounded" },
      cornersDotOptions: { type: "dot" },
    });
    qrCodeInstance.current.append(container);
    return () => { container.innerHTML = ''; };
  }, [shareUrl]);

  const handleDownload = () => {
    if (qrCodeInstance.current) {
      qrCodeInstance.current.download({ extension: "png", name: `survey-qr-${surveyId}` });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        className="border border-[#e2e8f0] rounded-[4px] size-[194px] bg-white flex items-center justify-center shrink-0 cursor-pointer hover:shadow-md transition-shadow"
        onClick={handleDownload}
        ref={qrCodeRef}
      />
      <button
        onClick={handleDownload}
        className="flex items-center justify-center gap-2 text-[14px] font-medium text-[#0a0a0a] hover:text-[#0f172a] transition-colors"
      >
        <Download className="w-4 h-4" />
        Download QR Code
      </button>
    </div>
  );
}

export const SurveySharePage: React.FC<{ surveyId?: string }> = ({ surveyId }) => {
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [audienceTab, setAudienceTab] = useState<'employee' | 'customer'>('employee');
  const [waLang, setWaLang] = useState<'english' | 'arabic'>('english');
  const [voiceLang, setVoiceLang] = useState<'english' | 'arabic'>('english');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const user = auth.getUser();

  const { data: survey } = useSurvey(surveyId || null);
  const publicLink = surveyId
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/s/${surveyId}`
    : '';

  const handleCopyLink = () => {
    if (publicLink) {
      navigator.clipboard.writeText(publicLink).catch(() => {});
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  // ── CRM state ──────────────────────────────────────────────────────────────
  const [crmLoading, setCrmLoading] = useState(false);
  const [crmConfigs, setCrmConfigs] = useState<any[]>([]);
  const [selectedCrmId, setSelectedCrmId] = useState('');
  const [tablesLoading, setTablesLoading] = useState(false);
  const [crmTables, setCrmTables] = useState<{ name: string; label: string }[]>([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [contactsLoading, setContactsLoading] = useState(false);
  const [crmContacts, setCrmContacts] = useState<{ name: string; email: string; phone: string; role: string; department: string }[]>(DEMO_CONTACTS);
  const [crmPage, setCrmPage] = useState(1);
  const perPage = 10;
  const [availableTags, setAvailableTags] = useState<{ id: string; name: string; color: string; category: string; categoryValue: string }[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [sendingChannel, setSendingChannel] = useState<'whatsapp' | 'voice' | 'email' | null>(null);
  const [sendResult, setSendResult] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // ── Voice state ────────────────────────────────────────────────────────────
  const [voicePhone, setVoicePhone] = useState('');
  const [isStartingVoice, setIsStartingVoice] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Email state ────────────────────────────────────────────────────────────
  const [emailSingle, setEmailSingle] = useState('');
  const [emailMultiple, setEmailMultiple] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Department targeting ───────────────────────────────────────────────────
  const DEPARTMENT_SEGMENTS = [
    { value: 'finance', label: 'Finance' },
    { value: 'hr', label: 'HR' },
    { value: 'it', label: 'IT' },
    { value: 'governance', label: 'Governance' },
    { value: 'strategy', label: 'Strategy' },
  ];
  const [targetDepartment, setTargetDepartment] = useState<string>('');
  const effectiveSegment = audienceTab === 'customer' ? 'customer' : (targetDepartment || null);

  // Load CRM configs on mount
  useEffect(() => {
    setCrmLoading(true);
    apiRequest('GET', '/api/crm-configs')
      .then(r => r.json())
      .then(data => setCrmConfigs(Array.isArray(data) ? data : (data?.data ?? [])))
      .catch(() => setCrmConfigs([]))
      .finally(() => setCrmLoading(false));
  }, []);

  // Load tables when CRM selected
  useEffect(() => {
    if (!selectedCrmId) { setCrmTables([]); setSelectedTable(''); setCrmContacts(DEMO_CONTACTS); setAvailableTags([]); setTagsLoading(false); return; }
    setTablesLoading(true);
    apiRequest('GET', `/api/crm-configs/${selectedCrmId}/tables`)
      .then(r => r.json())
      .then(data => {
        const raw = Array.isArray(data?.data) ? data.data : [];
        // Each table entry may be a string or an object { name, label }
        setCrmTables(raw.map((t: any) => typeof t === 'string' ? { name: t, label: t } : { name: t.name ?? String(t), label: (t.label || t.name) ?? String(t) }));
      })
      .catch(() => setCrmTables([]))
      .finally(() => setTablesLoading(false));
    setSelectedTable('');
    setCrmContacts(DEMO_CONTACTS);
    setSelectedTagIds([]);
    // Load tags for this CRM
    setTagsLoading(true);
    apiRequest('GET', `/api/crm-configs/${selectedCrmId}/tags`)
      .then(r => r.json())
      .then(data => setAvailableTags(Array.isArray(data) ? data : (data?.data ?? [])))
      .catch(() => setAvailableTags([]))
      .finally(() => setTagsLoading(false));
  }, [selectedCrmId]);

  // Contacts table always shows DEMO_CONTACTS — CRM selection is used for tags + sending only
  useEffect(() => {
    setCrmContacts(DEMO_CONTACTS);
    setCrmPage(1);
    setSendResult(null);
  }, [selectedCrmId, selectedTable]);

  // Send to CRM contacts
  const handleSendCrm = async (channel: 'whatsapp' | 'voice' | 'email') => {
    if (!surveyId) { setSendResult({ type: 'error', msg: 'No survey ID — open this page from a specific survey.' }); return; }
    if (!selectedCrmId || !selectedTable) { setSendResult({ type: 'error', msg: 'Select a CRM and table first to load contacts.' }); return; }
    if (crmContacts.length === 0) { setSendResult({ type: 'error', msg: 'No contacts loaded. Make sure the selected table has contact data.' }); return; }
    setSendingChannel(channel);
    setSendResult(null);
    try {
      if (effectiveSegment) {
        await apiRequest('PATCH', `/api/surveys/${surveyId}`, { targetSegment: effectiveSegment }).catch(() => {});
      }
      if (channel === 'whatsapp') {
        const phones = crmContacts.map(c => c.phone).filter(Boolean);
        if (!phones.length) throw new Error('No phone numbers in loaded contacts');
        const r = await apiRequest('POST', '/api/whatsapp/send-survey-bulk', { surveyId, phoneNumbers: phones, language: waLang === 'arabic' ? 'ar' : 'en' });
        const d = await r.json();
        setSendResult({ type: 'success', msg: d.message || `Sent to ${phones.length} contacts via WhatsApp` });
      } else if (channel === 'email') {
        const emails = crmContacts.map(c => c.email).filter(Boolean);
        if (!emails.length) throw new Error('No email addresses in loaded contacts');
        const r = await apiRequest('POST', '/api/email/send-survey-bulk', { surveyId, emails });
        const d = await r.json();
        setSendResult({ type: 'success', msg: d.message || `Sent to ${emails.length} contacts via Email` });
      } else {
        const phones = crmContacts.map(c => c.phone).filter(Boolean);
        if (!phones.length) throw new Error('No phone numbers in loaded contacts');
        let sent = 0; const errs: string[] = [];
        for (const phone of phones) {
          try { await apiRequest('POST', '/api/start-survey', { surveyId, phoneNumber: phone, language: voiceLang === 'arabic' ? 'ar' : 'en' }); sent++; }
          catch (e: any) { errs.push(e?.message || 'failed'); }
        }
        if (sent > 0) setSendResult({ type: 'success', msg: `Initiated ${sent} voice call${sent > 1 ? 's' : ''}${errs.length ? ` (${errs.length} failed)` : ''}` });
        else throw new Error('All voice calls failed: ' + (errs[0] || 'unknown error'));
      }
    } catch (err: any) {
      setSendResult({ type: 'error', msg: err?.message || 'Failed to send' });
    } finally {
      setSendingChannel(null);
    }
  };

  // Start voice survey from Voice Agent section
  const handleStartVoice = async () => {
    if (!surveyId) { setVoiceFeedback({ type: 'error', text: 'No survey selected — open this page from a specific survey.' }); return; }
    if (!voicePhone.trim()) { setVoiceFeedback({ type: 'error', text: 'Enter a phone number in E.164 format (e.g. +968XXXXXXXX).' }); return; }
    setIsStartingVoice(true);
    setVoiceFeedback(null);
    try {
      await apiRequest('POST', '/api/start-survey', { surveyId, phoneNumber: voicePhone.trim(), language: voiceLang === 'arabic' ? 'ar' : 'en' });
      setVoiceFeedback({ type: 'success', text: 'Voice call initiated successfully!' });
    } catch (err: any) {
      setVoiceFeedback({ type: 'error', text: err?.message || 'Failed to start voice call.' });
    } finally {
      setIsStartingVoice(false);
    }
  };

  // Send email survey (single or multiple)
  const handleSendEmail = async () => {
    if (!surveyId) { setEmailFeedback({ type: 'error', text: 'No survey selected — open this page from a specific survey.' }); return; }
    const collected = [emailSingle, emailMultiple]
      .flatMap(v => v.split(/[\s,;]+/))
      .map(s => s.trim())
      .filter(s => s.length > 0);
    const unique = Array.from(new Set(collected));
    const invalid = unique.filter(e => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    if (unique.length === 0) { setEmailFeedback({ type: 'error', text: 'Enter at least one email address.' }); return; }
    if (invalid.length > 0) { setEmailFeedback({ type: 'error', text: `Invalid email${invalid.length > 1 ? 's' : ''}: ${invalid.join(', ')}` }); return; }
    setIsSendingEmail(true);
    setEmailFeedback(null);
    try {
      if (effectiveSegment) {
        await apiRequest('PATCH', `/api/surveys/${surveyId}`, { targetSegment: effectiveSegment }).catch(() => {});
      }
      const r = await apiRequest('POST', '/api/email/send-survey-bulk', { surveyId, emails: unique });
      const d = await r.json().catch(() => ({}));
      if (d?.success) {
        setEmailFeedback({ type: 'success', text: d.message || `Survey emailed to ${unique.length} recipient${unique.length > 1 ? 's' : ''}.` });
        setEmailSingle('');
        setEmailMultiple('');
      } else {
        setEmailFeedback({ type: 'error', text: d?.message || 'Failed to send emails.' });
      }
    } catch (err: any) {
      setEmailFeedback({ type: 'error', text: err?.message || 'Failed to send emails.' });
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Filter contacts by selected tags, then paginate
  const filteredContacts = selectedTagIds.length === 0
    ? crmContacts
    : crmContacts.filter(contact => {
        return selectedTagIds.some(tagId => {
          const tag = availableTags.find(t => t.id === tagId);
          if (!tag) return false;
          const val = (tag.categoryValue || tag.name).toLowerCase();
          if (tag.category === 'department') return contact.department.toLowerCase() === val;
          if (tag.category === 'location')   return false; // no location field on contacts
          // general / fallback — match against department or role
          return contact.department.toLowerCase() === val || contact.role.toLowerCase() === val;
        });
      });
  const totalPages = Math.max(1, Math.ceil(filteredContacts.length / perPage));
  const pagedContacts = filteredContacts.slice((crmPage - 1) * perPage, crmPage * perPage);

  return (
    <div className="flex h-screen bg-[#f1f5f9]">
      <ScheduleSurveyModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        surveyId={surveyId}
        surveyTitle={survey?.title}
        userId={user?.id}
      />
      <Sidebar items={sidebarItems} compact={!sidebarOpen} onNavigate={(href) => setLocation(href)} onLogout={() => setLocation("/login")} />

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0 pr-2 py-2">
        {/* White card */}
        <div className="flex flex-1 flex-col min-h-0 bg-white rounded-xl shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] overflow-hidden">
          {/* Navbar */}
          <Navbar
            breadcrumbs={[{ label: 'Surveys', href: '/surveys' }, { label: 'Share Survey' }]}
            showMenuToggle
            onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          />

          {/* Page body */}
          <div className="flex flex-col py-6 overflow-auto flex-1">
            <div className="flex flex-col gap-4 items-end px-6">
              <div className="flex flex-col gap-4 items-start w-full">

                {/* Title row */}
                <div className="flex items-start justify-between w-full">
                  <h1 className="text-[24px] font-['IBM_Plex_Sans'] font-semibold leading-[1.3] text-[#0f172a] whitespace-nowrap">
                    Share Survey
                  </h1>
                  <button
                    onClick={() => setLocation('/surveys')}
                    className="bg-white border border-[#e5e5e5] rounded-[8px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] h-[36px] px-3 flex items-center"
                  >
                    <span className="font-['IBM_Plex_Sans'] text-[14px] font-medium text-[#0f172a] whitespace-nowrap">
                      Back To Surveys
                    </span>
                  </button>
                </div>

                {/* Employee / Customer tab */}
                <div className="bg-[#f5f5f5] flex h-[36px] items-center justify-center p-[3px] rounded-[10px] w-[160px] shrink-0">
                  <button
                    className={`flex flex-1 flex-col h-[29px] items-center justify-center px-2 py-1 rounded-[8px] transition-all ${
                      audienceTab === 'employee'
                        ? 'bg-white border border-[#e5e5e5] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]'
                        : ''
                    }`}
                    onClick={() => setAudienceTab('employee')}
                  >
                    <span className="text-[14px] font-medium leading-5 text-[#0a0a0a] whitespace-nowrap">Employee</span>
                  </button>
                  <button
                    className={`flex flex-1 flex-col h-[29px] items-center justify-center px-2 py-1 rounded-[8px] transition-all ${
                      audienceTab === 'customer'
                        ? 'bg-white border border-[#e5e5e5] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]'
                        : ''
                    }`}
                    onClick={() => setAudienceTab('customer')}
                  >
                    <span className="text-[14px] font-medium leading-5 text-[#0a0a0a] whitespace-nowrap">Customer</span>
                  </button>
                </div>

              </div>

              {/* ── CRM ── */}
              <SectionCard
                title="CRM"
                description="Fetch contacts from your connected CRM to send surveys"
              >
                {/* Step 1: CRM Connection */}
                <div className="flex flex-col gap-2 w-[545px] shrink-0">
                  <span className="text-[14px] font-medium leading-5 text-[#0f172a]">
                    Step 1: Select CRM Connections
                  </span>
                  <SelectDropdown
                    placeholder="Choose CRM Connection"
                    value={selectedCrmId}
                    options={crmConfigs.map(c => ({ label: c.name || c.crmType || c.id, value: c.id }))}
                    onChange={v => setSelectedCrmId(v)}
                    loading={crmLoading}
                  />
                </div>

                {/* Step 2: Table/Object */}
                <div className="flex flex-col gap-2 w-[545px] shrink-0">
                  <span className="text-[14px] font-medium leading-5 text-[#0f172a]">
                    Step 2: Select Table/Object
                  </span>
                  <SelectDropdown
                    placeholder={selectedCrmId ? 'Choose a table' : 'Select a CRM first'}
                    value={selectedTable}
                    options={crmTables.map(t => ({ label: t.label, value: t.name }))}
                    onChange={v => setSelectedTable(v)}
                    loading={tablesLoading}
                  />
                </div>

                {/* Tags + table only shown once CRM is selected */}
                {selectedCrmId && (
                  <>
                {/* Tags filter */}
                <div className="flex flex-col gap-2 w-full shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-[#717182]" />
                      <span className="text-[14px] font-medium leading-5 text-[#0f172a]">Filter by Tags</span>
                    </div>
                    {selectedTagIds.length > 0 && (
                      <button onClick={() => { setSelectedTagIds([]); setCrmPage(1); }} className="text-[12px] text-[#717182] hover:text-[#0f172a] transition-colors">
                        Clear all
                      </button>
                    )}
                  </div>
                  {tagsLoading && (
                    <div className="flex items-center gap-2 text-[13px] text-[#717182]">
                      <Loader className="h-3 w-3 animate-spin" /> Loading tags…
                    </div>
                  )}
                  {!tagsLoading && availableTags.length === 0 && (
                    <p className="text-[13px] text-[#94a3b8]">No tags yet. Create tags in Settings → CRM Integrations.</p>
                  )}
                  {!tagsLoading && availableTags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {availableTags.map(tag => {
                        const active = selectedTagIds.includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            onClick={() => { setSelectedTagIds(prev => active ? prev.filter(id => id !== tag.id) : [...prev, tag.id]); setCrmPage(1); }}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-medium border transition-all ${active ? 'border-transparent text-white shadow-sm' : 'border-[#e2e8f0] bg-white text-[#374151] hover:border-[#cbd5e1]'}`}
                            style={active ? { backgroundColor: tag.color || '#3b82f6' } : {}}
                          >
                            <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: active ? 'rgba(255,255,255,0.6)' : (tag.color || '#3b82f6') }} />
                            {tag.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Contacts table */}
                <div className="h-[242px] overflow-hidden w-full shrink-0">
                  <div className="bg-white border border-[#e2e8f0] rounded-[8px] overflow-hidden w-full h-full overflow-y-auto">
                    <table className="w-full table-fixed border-collapse">
                      <colgroup>
                        <col style={{ width: '32px' }} />
                        <col style={{ width: '18%' }} />
                        <col style={{ width: '18%' }} />
                        <col style={{ width: '26%' }} />
                        <col style={{ width: '20%' }} />
                        <col style={{ width: '18%' }} />
                      </colgroup>
                      <thead className="bg-[#f8fafc] border-b border-[#e2e8f0] sticky top-0 z-10">
                        <tr>
                          <th className="h-[40px] w-[32px]" />
                          <th className="h-[40px] px-3 text-left font-['IBM_Plex_Sans'] font-medium text-[13px] text-[#0f172a]">Name</th>
                          <th className="h-[40px] px-3 text-left font-['IBM_Plex_Sans'] font-medium text-[13px] text-[#0f172a]">Role</th>
                          <th className="h-[40px] px-3 text-left font-['IBM_Plex_Sans'] font-medium text-[13px] text-[#0f172a]">Email</th>
                          <th className="h-[40px] px-3 text-left font-['IBM_Plex_Sans'] font-medium text-[13px] text-[#0f172a]">Phone Number</th>
                          <th className="h-[40px] px-3 text-left font-['IBM_Plex_Sans'] font-medium text-[13px] text-[#0f172a]">Department</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contactsLoading && (
                          <tr>
                            <td colSpan={6} className="py-6 text-center">
                              <div className="flex items-center justify-center gap-2 text-[#717182]">
                                <Loader className="h-4 w-4 animate-spin" />
                                <span className="text-[13px]">Loading contacts…</span>
                              </div>
                            </td>
                          </tr>
                        )}
                        {!contactsLoading && pagedContacts.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-[13px] text-[#94a3b8]">No contacts found</td>
                          </tr>
                        )}
                        {!contactsLoading && pagedContacts.map((contact, i) => (
                          <tr key={i} className="border-b border-[#e2e8f0] last:border-b-0 hover:bg-[#f8fafc] transition-colors">
                            <td className="h-[48px] w-[32px] px-2">
                              <GripVertical className="h-3 w-3 text-slate-300" />
                            </td>
                            <td className="h-[48px] px-3">
                              <span className="font-['IBM_Plex_Sans'] font-medium text-[14px] text-[#0f172a] truncate block">{contact.name || '—'}</span>
                            </td>
                            <td className="h-[48px] px-3">
                              <span className="font-['IBM_Plex_Sans'] text-[13px] text-[#717182] truncate block">{contact.role || '—'}</span>
                            </td>
                            <td className="h-[48px] px-3">
                              <span className="font-['IBM_Plex_Sans'] text-[13px] text-[#0f172a] truncate block">{contact.email || '—'}</span>
                            </td>
                            <td className="h-[48px] px-3">
                              <span className="font-['IBM_Plex_Sans'] text-[13px] text-[#0f172a] truncate block">{contact.phone || '—'}</span>
                            </td>
                            <td className="h-[48px] px-3">
                              {contact.department
                                ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100 max-w-full truncate">{contact.department}</span>
                                : <span className="text-[13px] text-[#94a3b8]">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination */}
                <div className="flex gap-2 h-[36px] items-center w-full shrink-0">
                  <div className="flex flex-1 items-center">
                    <span className="text-[14px] text-[#94a3b8] leading-5 truncate">
                      {selectedTagIds.length > 0 ? `${filteredContacts.length} of ${crmContacts.length} contact(s)` : `${crmContacts.length} contact(s) loaded.`}
                    </span>
                  </div>
                  <div className="flex gap-8 items-center shrink-0">
                    <div className="flex gap-2 items-center">
                      <span className="text-[14px] font-medium text-[#0f172a] leading-5 pr-2">Rows per page</span>
                      <div className="bg-white border border-[#e2e8f0] flex h-[36px] items-center justify-between px-3 py-2 rounded-[8px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] w-[80px]">
                        <span className="text-sm text-[#0f172a] leading-5">{perPage}</span>
                        <ChevronDown className="h-4 w-4 text-[#0f172a] shrink-0" />
                      </div>
                    </div>
                    <span className="text-[14px] font-medium text-[#0f172a] leading-5 pr-2">Page {crmPage} of {totalPages}</span>
                    <div className="flex gap-2 items-center">
                      <button onClick={() => setCrmPage(1)} disabled={crmPage === 1} className="bg-white border border-[#e2e8f0] flex flex-col items-center justify-center px-3 rounded-[8px] size-[32px] disabled:opacity-50">
                        <ChevronsLeft className="h-4 w-4" />
                      </button>
                      <button onClick={() => setCrmPage(p => Math.max(1, p - 1))} disabled={crmPage === 1} className="bg-white border border-[#e2e8f0] flex flex-col items-center justify-center px-3 rounded-[8px] size-[32px] disabled:opacity-50">
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button onClick={() => setCrmPage(p => Math.min(totalPages, p + 1))} disabled={crmPage === totalPages} className="bg-white border border-[#e2e8f0] flex flex-col items-center justify-center px-3 rounded-[8px] size-[32px] disabled:opacity-50">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                      <button onClick={() => setCrmPage(totalPages)} disabled={crmPage === totalPages} className="bg-white border border-[#e2e8f0] flex flex-col items-center justify-center px-3 rounded-[8px] size-[32px] disabled:opacity-50">
                        <ChevronsRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Contacts loaded banner */}
                <div className="bg-white border border-[rgba(0,0,0,0.1)] flex flex-col items-center p-[25px] rounded-[10px] w-full shrink-0">
                  <div className="flex gap-3 items-start w-full">
                    <div
                      className="border border-[rgba(0,0,0,0.1)] rounded-[10px] shrink-0 size-[40px] flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #f3f4f6 0%, #f9fafb 100%)' }}
                    >
                      <span className="text-[18px] font-bold text-slate-600 leading-none">
                        {(crmConfigs.find(c => c.id === selectedCrmId)?.crmType || 'C')?.[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col gap-1">
                      <h3 className="font-semibold text-[15px] leading-[22.5px] text-[#0a0a0a] tracking-[-0.2344px] whitespace-nowrap">
                        {selectedTagIds.length > 0
                          ? `${filteredContacts.length} of ${crmContacts.length} Contact${crmContacts.length !== 1 ? 's' : ''} (filtered)`
                          : `${crmContacts.length} Contact${crmContacts.length !== 1 ? 's' : ''} loaded`}
                      </h3>
                      <p className="text-[13px] leading-[19.5px] text-[#717182] tracking-[-0.0762px]">
                        {crmConfigs.find(c => c.id === selectedCrmId)?.name || 'CRM'} — ready to send
                      </p>
                    </div>
                  </div>
                </div>

                {/* Send result feedback */}
                {sendResult && (
                  <p className={`text-[13px] font-medium ${sendResult.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                    {sendResult.msg}
                  </p>
                )}

                {/* Department targeting */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[14px] font-medium leading-5 text-[#0f172a] whitespace-nowrap">Target Department:</span>
                  {audienceTab === 'customer' ? (
                    <span className="h-9 px-3 inline-flex items-center text-[13px] border border-[#e2e8f0] rounded-lg bg-slate-50 text-[#0f172a]">Customer</span>
                  ) : (
                    <select
                      value={targetDepartment}
                      onChange={e => setTargetDepartment(e.target.value)}
                      className="h-9 px-3 text-[13px] border border-[#e2e8f0] rounded-lg bg-white text-[#0f172a] focus:outline-none focus:ring-1 focus:ring-teal-500"
                    >
                      <option value="">All Departments</option>
                      {DEPARTMENT_SEGMENTS.map(d => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Send Survey to CRM Contacts */}
                <div className="flex items-center shrink-0">
                  <span className="text-[14px] font-medium leading-5 text-[#0f172a]">Send Survey to CRM Contacts</span>
                </div>

                {/* 3 send buttons */}
                <div className="flex gap-5 items-start w-full shrink-0">
                  {(['whatsapp', 'voice', 'email'] as const).map((ch) => {
                    const labels = { whatsapp: 'Send via Whatsapp', voice: 'Send via Voice', email: 'Send via Email' };
                    const busy = sendingChannel === ch;
                    return (
                      <button
                        key={ch}
                        onClick={() => handleSendCrm(ch)}
                        disabled={!!sendingChannel}
                        className="bg-white border border-[#e5e5e5] flex flex-1 h-[36px] items-center justify-center gap-1.5 px-3 py-2 rounded-[8px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] hover:bg-slate-50 disabled:opacity-60 transition-colors"
                      >
                        {busy && <Loader className="h-3 w-3 animate-spin text-[#0a0a0a] shrink-0" />}
                        <span className="font-medium text-[14px] leading-5 text-[#0a0a0a] whitespace-nowrap">{labels[ch]}</span>
                      </button>
                    );
                  })}
                </div>
                  </>
                )}
              </SectionCard>

              {/* ── Link & QR ── */}
              <SectionCard
                title="Link & QR"
                description="Share a Public link or QR code to collect responses."
              >
                {/* Public Link */}
                <div className="flex flex-col gap-2 w-[545px] shrink-0">
                  <span className="text-[14px] font-medium leading-5 text-[#0a0a0a]">Public Link</span>
                  <div className="flex gap-2 items-center">
                    <div className="flex-1">
                      <TextInput placeholder="Save survey first to get a link" value={publicLink} />
                    </div>
                    {publicLink && (
                      <button
                        onClick={handleCopyLink}
                        className="shrink-0 h-[36px] px-3 bg-white border border-[#e5e5e5] rounded-[8px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] flex items-center gap-1.5 hover:bg-slate-50 transition-colors"
                      >
                        {linkCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-[#0a0a0a]" />}
                        <span className="text-[13px] font-medium text-[#0a0a0a]">{linkCopied ? 'Copied!' : 'Copy'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* QR Code */}
                <div className="flex flex-col gap-2 shrink-0">
                  <span className="text-[14px] font-medium leading-5 text-[#0a0a0a]">QR Code</span>
                  {surveyId && <QrCodeComponent surveyId={surveyId} />}
                </div>
              </SectionCard>

              {/* ── Whatsapp ── */}
              <SectionCard
                title="Whatsapp"
                description="Send survey questions one by one via WhatsApp using Wati."
              >
                {/* Language */}
                <div className="flex flex-col gap-2 w-full shrink-0">
                  <span className="text-[14px] font-medium leading-5 text-[#0a0a0a]">Select Language</span>
                  <LangToggle value={waLang} onChange={setWaLang} />
                </div>

                {/* Phone inputs */}
                <div className="flex gap-5 items-center shrink-0">
                  <div className="flex flex-col gap-2 shrink-0 w-[485px]">
                    <span className="text-[14px] font-medium leading-5 text-[#0a0a0a]">Single Phone Number</span>
                    <TextInput placeholder="eg +123456102" />
                  </div>
                  <div className="flex items-center shrink-0 w-[22px]">
                    <span className="text-[14px] font-medium leading-5 text-[#0a0a0a]">Or</span>
                  </div>
                  <div className="flex flex-col gap-2 flex-1 min-w-0">
                    <span className="text-[14px] font-medium leading-5 text-[#0a0a0a]">Multiple Phone Number</span>
                    <TextInput placeholder="eg +123456102,+123456102,+123456102" />
                  </div>
                </div>

                {/* CSV Upload */}
                <div className="flex flex-col gap-2 shrink-0 w-[485px]">
                  <span className="text-[14px] font-medium leading-5 text-[#0a0a0a]">Upload CSV</span>
                  <CsvInput onParse={(parsed) => setCrmContacts(prev => [...prev, ...parsed])} />
                </div>
              </SectionCard>

              {/* ── Voice Agent ── */}
              <SectionCard
                title="Voice Agent"
                description="Start a test voice survey with your configured VAPI Agent."
              >
                {/* Language */}
                <div className="flex flex-col gap-2 w-full shrink-0">
                  <span className="text-[14px] font-medium leading-5 text-[#0a0a0a]">Select Language</span>
                  <LangToggle value={voiceLang} onChange={setVoiceLang} />
                </div>

                {/* Phone Number */}
                <div className="flex flex-col items-start w-full shrink-0">
                  <div className="flex flex-col gap-2 w-[485px]">
                    <span className="text-[14px] font-medium leading-5 text-[#0a0a0a]">Phone Number (E.164 format)</span>
                    <TextInput placeholder="e.g. +968XXXXXXXX" value={voicePhone} onChange={setVoicePhone} />
                  </div>
                </div>

                {/* CSV Upload */}
                <div className="flex flex-col items-start w-full shrink-0">
                  <div className="flex flex-col gap-2 w-[485px]">
                    <span className="text-[14px] font-medium leading-5 text-[#0a0a0a]">Upload CSV</span>
                    <CsvInput onParse={(parsed) => setCrmContacts(prev => [...prev, ...parsed])} />
                  </div>
                </div>

                {/* Feedback */}
                {voiceFeedback && (
                  <p className={`text-[13px] font-medium ${voiceFeedback.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                    {voiceFeedback.text}
                  </p>
                )}

                {/* Start Voice Survey Calls */}
                <div className="flex justify-end w-full">
                  <button
                    onClick={handleStartVoice}
                    disabled={isStartingVoice || !voicePhone.trim()}
                    className="bg-[#171717] flex h-[36px] items-center justify-center gap-2 px-3 rounded-[8px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] w-[253px] shrink-0 hover:bg-[#2a2a2a] disabled:opacity-60 transition-colors"
                  >
                    {isStartingVoice && <Loader className="h-3 w-3 animate-spin text-[#fafafa] shrink-0" />}
                    <span className="font-['IBM_Plex_Sans'] font-medium text-[14px] leading-5 text-[#fafafa] whitespace-nowrap">
                      Start Voice Survey Calls
                    </span>
                  </button>
                </div>
              </SectionCard>

              {/* ── Email ── */}
              <SectionCard
                title="Email"
                description="Send the survey link via email to one or many recipients."
              >
                {/* Email inputs */}
                <div className="flex gap-5 items-center shrink-0">
                  <div className="flex flex-col gap-2 shrink-0 w-[485px]">
                    <span className="text-[14px] font-medium leading-5 text-[#0a0a0a]">Single Email</span>
                    <TextInput placeholder="e.g. user@example.com" value={emailSingle} onChange={setEmailSingle} />
                  </div>
                  <div className="flex items-center shrink-0 w-[22px]">
                    <span className="text-[14px] font-medium leading-5 text-[#0a0a0a]">Or</span>
                  </div>
                  <div className="flex flex-col gap-2 flex-1 min-w-0">
                    <span className="text-[14px] font-medium leading-5 text-[#0a0a0a]">Multiple Emails</span>
                    <TextInput placeholder="e.g. a@x.com, b@y.com, c@z.com" value={emailMultiple} onChange={setEmailMultiple} />
                  </div>
                </div>

                {/* CSV Upload */}
                <div className="flex flex-col gap-2 shrink-0 w-[485px]">
                  <span className="text-[14px] font-medium leading-5 text-[#0a0a0a]">Upload CSV</span>
                  <CsvInput onParse={(parsed) => {
                    const more = parsed.map(c => c.email).filter(Boolean);
                    if (more.length === 0) { setEmailFeedback({ type: 'error', text: 'No email column detected in CSV.' }); return; }
                    setEmailMultiple(prev => {
                      const merged = [prev, more.join(', ')].filter(Boolean).join(', ');
                      return merged;
                    });
                  }} />
                </div>

                {/* Feedback */}
                {emailFeedback && (
                  <p className={`text-[13px] font-medium ${emailFeedback.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                    {emailFeedback.text}
                  </p>
                )}

                {/* Send button */}
                <div className="flex justify-end w-full">
                  <button
                    onClick={handleSendEmail}
                    disabled={isSendingEmail || (!emailSingle.trim() && !emailMultiple.trim())}
                    className="bg-[#171717] flex h-[36px] items-center justify-center gap-2 px-3 rounded-[8px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] w-[253px] shrink-0 hover:bg-[#2a2a2a] disabled:opacity-60 transition-colors"
                  >
                    {isSendingEmail && <Loader className="h-3 w-3 animate-spin text-[#fafafa] shrink-0" />}
                    <span className="font-['IBM_Plex_Sans'] font-medium text-[14px] leading-5 text-[#fafafa] whitespace-nowrap">
                      Send Email Survey
                    </span>
                  </button>
                </div>
              </SectionCard>

              {/* ── Bottom actions ── */}
              <div className="flex gap-3 justify-end w-full">
                <button
                  onClick={() => setScheduleOpen(true)}
                  className="bg-white border border-[#e5e5e5] flex h-[36px] items-center justify-center px-3 rounded-[8px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] shrink-0 hover:bg-slate-50 transition-colors">
                  <span className="font-['IBM_Plex_Sans'] font-medium text-[14px] leading-5 text-[#0a0a0a] whitespace-nowrap">
                    Schedule Survey
                  </span>
                </button>
                <button className="bg-[#171717] flex h-[36px] items-center justify-center px-3 rounded-[8px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] shrink-0">
                  <span className="font-['IBM_Plex_Sans'] font-medium text-[14px] leading-5 text-[#fafafa] whitespace-nowrap">
                    Send Survey
                  </span>
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
