import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Home,
  FilePenLine,
  GitGraph,
  Users,
  Navigation,
  PieChart,
  Settings,
  Settings2,
  Trash2,
  ExternalLink,
  X,
  Eye,
  EyeOff,
  Loader2,
  Tag as TagIcon,
  Edit2,
  AlertCircle,
  CheckCircle2,
  Plus,
  Phone,
} from 'lucide-react';
import { Sidebar } from '../layout/Sidebar';
import { Navbar } from '../layout/Navbar';
import { auth } from '@/lib/auth';

const sidebarItems = [
  { label: 'Dashboard', icon: <Home className="h-4 w-4" />, href: '/dashboard' },
  { label: 'Surveys', icon: <FilePenLine className="h-4 w-4" />, href: '/surveys' },
  { label: 'Analytics', icon: <GitGraph className="h-4 w-4" />, href: '/analytics' },
  { label: 'Team Insights', icon: <Users className="h-4 w-4" />, href: '/teamInsights' },
  { label: 'Action Planning', icon: <Navigation className="h-4 w-4" />, href: '/actionPlanningBoard' },
  { label: 'Reports', icon: <PieChart className="h-4 w-4" />, href: '/reports' },
  { label: 'Settings', icon: <Settings className="h-4 w-4" />, href: '/settings' },
];

// ─── Brand Logo assets (Figma MCP) ────────────────────────────────────────────
const imgSalesforce = '/images/crm-salesforce.svg';
const imgHubspot = '/images/crm-hubspot.svg';
const imgZoho = '/images/crm-zoho.jpg';
const imgMicrosoftDynamics = '/images/crm-microsoft-dynamics.svg';

// ─── CRM field definitions ────────────────────────────────────────────────────
type CRMType = 'zoho' | 'salesforce' | 'hubspot' | 'pipedrive' | 'microsoftDynamics' | 'freshsales' | 'twilio' | 'gmail' | 'outlook';

interface CRMConfig {
  id: string;
  crmType: CRMType;
  authType: string;
  isActive: boolean;
  createdAt: string;
}

interface CRMFormState {
  crmType: CRMType | '';
  authType: string;
  credentials: Record<string, string>;
}

const CRM_CONFIGS = {
  zoho: {
    name: 'Zoho CRM',
    description: 'SMB and mid-market CRM solution',
    fields: {
      OAuth2: [
        { key: 'client_id', label: 'Client ID', placeholder: 'Your Zoho Client ID', required: true },
        { key: 'client_secret', label: 'Client Secret', placeholder: 'Your Zoho Client Secret', required: true, type: 'password' },
        { key: 'access_token', label: 'Access Token', placeholder: 'OAuth access token', required: true, type: 'password' },
        { key: 'refresh_token', label: 'Refresh Token', placeholder: 'OAuth refresh token', required: false, type: 'password' },
        { key: 'region', label: 'Region', type: 'select', options: ['US', 'EU', 'IN', 'AU', 'CN', 'JP'], required: true },
      ],
      'Self Client': [
        { key: 'client_id', label: 'Client ID', placeholder: 'Your Zoho Client ID', required: true },
        { key: 'client_secret', label: 'Client Secret', placeholder: 'Your Zoho Client Secret', required: true, type: 'password' },
        { key: 'access_token', label: 'Access Token', placeholder: 'Self Client access token', required: true, type: 'password' },
        { key: 'region', label: 'Region', type: 'select', options: ['US', 'EU', 'IN', 'AU', 'CN', 'JP'], required: true },
      ],
    } as Record<string, any[]>,
  },
  salesforce: {
    name: 'Salesforce',
    description: 'Enterprise-grade CRM platform',
    fields: {
      OAuth2: [
        { key: 'client_id', label: 'Consumer Key', placeholder: 'Your Salesforce Consumer Key', required: true },
        { key: 'client_secret', label: 'Consumer Secret', placeholder: 'Your Salesforce Consumer Secret', required: true, type: 'password' },
      ],
      'OAuth2 Web Flow': [
        { key: 'client_id', label: 'Consumer Key', placeholder: 'Your Salesforce Consumer Key', required: true },
        { key: 'client_secret', label: 'Consumer Secret', placeholder: 'Your Salesforce Consumer Secret', required: true, type: 'password' },
        { key: 'access_token', label: 'Access Token', placeholder: 'OAuth access token', required: true, type: 'password' },
        { key: 'refresh_token', label: 'Refresh Token', placeholder: 'OAuth refresh token', required: false, type: 'password' },
        { key: 'instance_url', label: 'Instance URL', placeholder: 'https://your-instance.salesforce.com', required: true },
      ],
      'JWT Bearer Flow': [
        { key: 'client_id', label: 'Consumer Key', placeholder: 'Your Salesforce Consumer Key', required: true },
        { key: 'username', label: 'Username', placeholder: 'Salesforce username', required: true },
        { key: 'private_key', label: 'Private Key', placeholder: '-----BEGIN RSA PRIVATE KEY-----', required: true, type: 'textarea' },
        { key: 'instance_url', label: 'Instance URL', placeholder: 'https://your-instance.salesforce.com', required: true },
      ],
    } as Record<string, any[]>,
  },
  hubspot: {
    name: 'HubSpot',
    description: 'Marketing, sales, and service platform',
    fields: {
      'OAuth2 Private App': [
        { key: 'access_token', label: 'Access Token', placeholder: 'pat-na1-xxxxx', required: true, type: 'password' },
        { key: 'app_id', label: 'App ID', placeholder: 'Your App ID', required: false },
      ],
      'OAuth2 Public App': [
        { key: 'client_id', label: 'Client ID', placeholder: 'Your HubSpot Client ID', required: true },
        { key: 'client_secret', label: 'Client Secret', placeholder: 'Your HubSpot Client Secret', required: true, type: 'password' },
        { key: 'access_token', label: 'Access Token', placeholder: 'OAuth access token', required: true, type: 'password' },
      ],
    } as Record<string, any[]>,
  },
  pipedrive: {
    name: 'Pipedrive',
    description: 'Visual sales pipeline management',
    fields: {
      OAuth2: [
        { key: 'client_id', label: 'Client ID', placeholder: 'Your Pipedrive Client ID', required: true },
        { key: 'client_secret', label: 'Client Secret', placeholder: 'Your Pipedrive Client Secret', required: true, type: 'password' },
        { key: 'access_token', label: 'Access Token', placeholder: 'OAuth access token', required: true, type: 'password' },
        { key: 'refresh_token', label: 'Refresh Token', placeholder: 'OAuth refresh token', required: false, type: 'password' },
      ],
    } as Record<string, any[]>,
  },
  microsoftDynamics: {
    name: 'Microsoft Dynamics 365',
    description: 'Enterprise CRM and business applications',
    fields: {
      OAuth2: [
        { key: 'client_id', label: 'Client ID', placeholder: 'Your Application Client ID', required: true },
        { key: 'client_secret', label: 'Client Secret', placeholder: 'Your Client Secret', required: true, type: 'password' },
        { key: 'tenant_id', label: 'Tenant ID', placeholder: 'Your Azure Tenant ID', required: true },
        { key: 'instance_url', label: 'Instance URL', placeholder: 'https://your-instance.crm.dynamics.com', required: true },
      ],
    } as Record<string, any[]>,
  },
  freshsales: {
    name: 'Freshsales',
    description: 'AI-powered sales CRM for growing teams',
    fields: {
      OAuth2: [
        { key: 'client_id', label: 'Client ID', placeholder: 'Your Freshsales Client ID', required: true },
        { key: 'client_secret', label: 'Client Secret', placeholder: 'Your Freshsales Client Secret', required: true, type: 'password' },
        { key: 'access_token', label: 'Access Token', placeholder: 'OAuth access token', required: true, type: 'password' },
      ],
    } as Record<string, any[]>,
  },
  gmail: {
    name: 'Gmail',
    description: 'Send survey invites from your Google Workspace / Gmail account',
    fields: {
      OAuth2: [
        { key: 'client_id', label: 'Google OAuth Client ID', placeholder: 'xxxxx.apps.googleusercontent.com', required: true },
        { key: 'client_secret', label: 'Google OAuth Client Secret', placeholder: 'GOCSPX-…', required: true, type: 'password' },
      ],
    } as Record<string, any[]>,
  },
  outlook: {
    name: 'Outlook / Microsoft 365',
    description: 'Send survey invites from your Outlook or Microsoft 365 mailbox',
    fields: {
      OAuth2: [
        { key: 'client_id', label: 'Azure Application (Client) ID', placeholder: 'Your Azure app Client ID', required: true },
        { key: 'client_secret', label: 'Azure Client Secret', placeholder: 'Your Azure client secret value', required: true, type: 'password' },
      ],
    } as Record<string, any[]>,
  },
  twilio: {
    name: 'Twilio (VAPI Telephony)',
    description: 'Use your Twilio number as the outbound caller ID for voice surveys',
    fields: {
      'Account Credentials': [
        { key: 'account_sid', label: 'Account SID', placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', required: true },
        { key: 'auth_token', label: 'Auth Token', placeholder: 'Your Twilio Auth Token', required: true, type: 'password' },
        { key: 'phone_number', label: 'Phone Number (E.164)', placeholder: '+15551234567', required: true },
        { key: 'assistant_id', label: 'VAPI Assistant ID (optional)', placeholder: 'Override the default voice agent', required: false },
      ],
    } as Record<string, any[]>,
  },
} as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

interface TagBadgeProps { label: string }
const TagBadge: React.FC<TagBadgeProps> = ({ label }) => (
  <span className="inline-flex items-center justify-center rounded-[8px] bg-[#eceef2] px-[9px] py-[3px] font-['IBM_Plex_Sans'] text-[11px] font-normal leading-[16.5px] tracking-[0.0645px] text-[#030213]">
    {label}
  </span>
);

interface ActiveBadgeProps { active?: boolean }
function ActiveBadge({ active }: ActiveBadgeProps) {
  const { t } = useTranslation();
  return active ? (
    <span className="inline-flex items-center gap-[6px] rounded-[8px] border border-[#b9f8cf] bg-[#f0fdf4] px-[8px] py-[3px]">
      <span className="h-[6px] w-[6px] rounded-full bg-[#00a63e]" />
      <span className="font-['IBM_Plex_Sans'] text-[12px] font-medium leading-[16px] text-[#008236]">{t('common.active', { defaultValue: 'Active' })}</span>
    </span>
  ) : null;
}

interface LogoBoxProps { children: React.ReactNode; size?: 'sm' | 'md' }
const LogoBox: React.FC<LogoBoxProps> = ({ children, size = 'md' }) => (
  <div
    className={`flex shrink-0 items-center justify-center rounded-[10px] border border-[rgba(0,0,0,0.1)] ${size === 'sm' ? 'h-8 w-8 rounded-[8px]' : 'h-10 w-10'}`}
    style={{ background: 'linear-gradient(135deg, rgb(243,244,246) 0%, rgb(249,250,251) 100%)' }}
  >
    {children}
  </div>
);

interface IntegrationCardProps {
  logo: React.ReactNode;
  name: string;
  description: string;
  tags: string[];
  active?: boolean;
  connected?: boolean;
  onConnect: () => void;
  onManage: () => void;
}
function IntegrationCard({ logo, name, description, tags, active, connected, onConnect, onManage }: IntegrationCardProps) {
  const { t } = useTranslation();
  return (
  <div className="flex w-[348px] shrink-0 flex-col gap-[18px] rounded-[10px] border border-[rgba(0,0,0,0.1)] bg-white p-[25px]">
    <div className="flex gap-3 items-start">
      <LogoBox>{logo}</LogoBox>
      <div className="flex flex-1 flex-col gap-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="font-['IBM_Plex_Sans'] text-[15px] font-semibold leading-[22.5px] tracking-[-0.2344px] text-[#0a0a0a]">{name}</p>
          {active && <ActiveBadge active />}
        </div>
        <p className="font-['IBM_Plex_Sans'] text-[13px] font-normal leading-[19.5px] tracking-[-0.0762px] text-[#717182]">{description}</p>
      </div>
    </div>
    <div className="flex flex-wrap gap-[6px]">
      {tags.map(tag => <TagBadge key={tag} label={tag} />)}
    </div>
    {connected ? (
      <button onClick={onManage} className="flex h-8 w-full items-center justify-center gap-3 rounded-[8px] border border-[rgba(0,0,0,0.1)] bg-white px-3 hover:bg-slate-50">
        <Settings2 className="h-4 w-4 text-[#0a0a0a]" />
        <span className="font-['IBM_Plex_Sans'] text-[14px] font-medium leading-5 tracking-[-0.1504px] text-[#0a0a0a]">{t('common.manage', { defaultValue: 'Manage' })}</span>
      </button>
    ) : (
      <button onClick={onConnect} className="flex h-8 w-full items-center justify-center rounded-[8px] bg-[#030213] px-3 hover:bg-[#1a1a2e]">
        <span className="font-['IBM_Plex_Sans'] text-[14px] font-medium leading-5 tracking-[-0.1504px] text-white">{t('common.connect', { defaultValue: 'Connect' })}</span>
      </button>
    )}
  </div>
  );
}

interface ConnectionRowProps {
  logo: React.ReactNode;
  name: string;
  authMethod: string;
  connectedOn: string;
  borderBottom?: boolean;
  onManage: () => void;
  onDelete: () => void;
  deleting?: boolean;
}
function ConnectionRow({ logo, name, authMethod, connectedOn, borderBottom, onManage, onDelete, deleting }: ConnectionRowProps) {
  const { t } = useTranslation();
  return (
  <div className={`flex items-center gap-4 px-6 py-[calc(1.5rem-1px)] ${borderBottom ? 'border-b border-[rgba(0,0,0,0.1)]' : ''}`}>
    <LogoBox size="sm">{logo}</LogoBox>
    <div className="flex flex-1 flex-col gap-[2px] min-w-0">
      <p className="font-['IBM_Plex_Sans'] text-[15px] font-semibold leading-[22.5px] tracking-[-0.2344px] text-[#0a0a0a]">{name}</p>
      <div className="flex items-center gap-3">
        <span className="font-['IBM_Plex_Sans'] text-[13px] font-normal leading-[19.5px] tracking-[-0.0762px] text-[#717182]">{authMethod}</span>
        <span className="h-1 w-1 rounded-full bg-[rgba(113,113,130,0.3)]" />
        <span className="font-['IBM_Plex_Sans'] text-[13px] font-normal leading-[19.5px] tracking-[-0.0762px] text-[#717182]">{connectedOn}</span>
      </div>
    </div>
    <ActiveBadge active />
    <div className="flex items-center gap-2">
      <button onClick={onManage} className="flex h-8 w-[102px] items-center justify-center gap-3 rounded-[8px] border border-[rgba(0,0,0,0.1)] bg-white px-3 hover:bg-slate-50">
        <Settings2 className="h-4 w-4 text-[#0a0a0a]" />
        <span className="font-['IBM_Plex_Sans'] text-[14px] font-medium leading-5 tracking-[-0.1504px] text-[#0a0a0a]">{t('common.manage', { defaultValue: 'Manage' })}</span>
      </button>
      <button onClick={onDelete} disabled={deleting} className="flex h-8 w-[38px] items-center justify-center rounded-[8px] border border-[rgba(0,0,0,0.1)] bg-white hover:bg-red-50 disabled:opacity-50">
        {deleting ? <Loader2 className="h-4 w-4 animate-spin text-[#e11d48]" /> : <Trash2 className="h-4 w-4 text-[#e11d48]" />}
      </button>
    </div>
  </div>
  );
}

// ─── CRM logo helper ─────────────────────────────────────────────────────────
function getCrmLogo(crmType: CRMType, size: 'sm' | 'md' = 'md') {
  if (crmType === 'salesforce') return <img src={imgSalesforce} alt="Salesforce" className={size === 'sm' ? 'h-4 w-[23px] object-contain' : 'h-5 w-[29px] object-contain'} />;
  if (crmType === 'hubspot') return <img src={imgHubspot} alt="HubSpot" className={size === 'sm' ? 'h-4 w-[13px] object-contain' : 'h-5 w-[17px] object-contain'} />;
  if (crmType === 'zoho') return <img src={imgZoho} alt="Zoho CRM" className={size === 'sm' ? 'h-6 w-6 object-contain' : 'h-7 w-7 object-contain'} />;
  if (crmType === 'microsoftDynamics') return <img src={imgMicrosoftDynamics} alt="Microsoft Dynamics 365" className={size === 'sm' ? 'h-4 w-4 object-contain' : 'h-5 w-5 object-contain'} />;
  if (crmType === 'pipedrive') return <span className="text-[18px] leading-none">📊</span>;
  if (crmType === 'freshsales') return <span className="text-[18px] leading-none">🌟</span>;
  if (crmType === 'twilio') return <Phone className={size === 'sm' ? 'h-4 w-4 text-[#F22F46]' : 'h-5 w-5 text-[#F22F46]'} />;
  if (crmType === 'gmail') return <span className={size === 'sm' ? 'text-[16px] leading-none' : 'text-[18px] leading-none'}>📧</span>;
  if (crmType === 'outlook') return <span className={size === 'sm' ? 'text-[16px] leading-none' : 'text-[18px] leading-none'}>📨</span>;
  return <span className="text-[18px] leading-none">🔗</span>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export const SettingsCrmIntegrationsPage: React.FC = () => {
  const { t } = useTranslation();
  const user = auth.getUser();
  const userId = user?.id || 'anonymous';
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab] = useState<'general' | 'integrations' | 'security'>('integrations');

  // ── Dialog / form state ──────────────────────────────────────────────────
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showOAuthDialog, setShowOAuthDialog] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [formState, setFormState] = useState<CRMFormState>({ crmType: '', authType: '', credentials: {} });
  const [oauthCredentials, setOauthCredentials] = useState({ client_id: '', client_secret: '', region: 'US' });
  const [testingConnection, setTestingConnection] = useState(false);
  const [showTwilioDialog, setShowTwilioDialog] = useState(false);
  const [twilioCreds, setTwilioCreds] = useState({ account_sid: '', auth_token: '', phone_number: '', assistant_id: '' });
  const [twilioShowToken, setTwilioShowToken] = useState(false);

  // ── Tags management state ────────────────────────────────────────────────
  const [showTagsDialog, setShowTagsDialog] = useState(false);
  const [selectedConfigForTags, setSelectedConfigForTags] = useState('');
  const [tagFormState, setTagFormState] = useState({ name: '', color: '#3b82f6', category: 'general', categoryValue: '', description: '' });
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [tagCreationTab, setTagCreationTab] = useState<'manual' | 'column'>('manual');
  const [columnTagFormState, setColumnTagFormState] = useState({ tableName: '', columnName: '', phoneColumn: '', tagName: '', selectedValues: [] as string[] });
  const [availableColumns, setAvailableColumns] = useState<any[]>([]);
  const [columnValues, setColumnValues] = useState<string[]>([]);
  const [loadingColumns, setLoadingColumns] = useState(false);
  const [loadingValues, setLoadingValues] = useState(false);
  const [columnSearch, setColumnSearch] = useState('');

  // ── Auth helpers ─────────────────────────────────────────────────────────
  const getAuthHeaders = (extra: Record<string, string> = {}): Record<string, string> => {
    const token = localStorage.getItem('insightpulse_token');
    const headers: Record<string, string> = { 'user-id': userId, ...extra };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: crmConfigs = [], isLoading, refetch } = useQuery<CRMConfig[]>({
    queryKey: ['/crm-configs', userId],
    queryFn: async () => {
      const res = await fetch('/api/crm-configs', { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch CRM configs');
      const data = await res.json();
      return data.data || [];
    },
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const { data: allTags = [] } = useQuery<any[]>({
    queryKey: ['/crm-tags/all', userId],
    queryFn: async () => {
      const res = await fetch('/api/crm-tags/all', { headers: { 'user-id': userId } });
      if (!res.ok) throw new Error('Failed to fetch tags');
      const data = await res.json();
      return data.data || [];
    },
    enabled: crmConfigs.length > 0,
  });

  const { data: configTags = [] } = useQuery<any[]>({
    queryKey: ['/crm-configs', selectedConfigForTags, 'tags'],
    queryFn: async () => {
      if (!selectedConfigForTags) return [];
      const res = await fetch(`/api/crm-configs/${selectedConfigForTags}/tags`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch tags');
      const data = await res.json();
      return data.data || [];
    },
    enabled: !!selectedConfigForTags,
  });

  const { data: crmTables = [] } = useQuery<any[]>({
    queryKey: ['/crm-configs', selectedConfigForTags, 'tables'],
    queryFn: async () => {
      if (!selectedConfigForTags) return [];
      const res = await fetch(`/api/crm-configs/${selectedConfigForTags}/tables`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch tables');
      const data = await res.json();
      return data.data || [];
    },
    enabled: !!selectedConfigForTags,
  });

  // ── Mutations ────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (data: CRMFormState) => {
      const res = await fetch('/api/crm-configs', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.details || err.error || 'Failed to save config');
      }
      return res.json();
    },
    onSuccess: () => {
      setConnectionMessage({ type: 'success', text: '✓ Connection saved!' });
      setTimeout(() => {
        setIsDialogOpen(false);
        setFormState({ crmType: '', authType: '', credentials: {} });
        setConnectionMessage(null);
        refetch();
      }, 1500);
    },
    onError: (error) => {
      setConnectionMessage({ type: 'error', text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (configId: string) => {
      const res = await fetch(`/api/crm-configs/${configId}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete config');
      }
      return res.json();
    },
    onSuccess: () => refetch(),
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/crm-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crmType: formState.crmType, authType: formState.authType, credentials: formState.credentials }),
      });
      if (!res.ok) throw new Error('Connection test failed');
      return res.json();
    },
  });

  const createTagMutation = useMutation({
    mutationFn: async (data: any) => {
      if (data.endpoint === 'from-column') {
        const res = await fetch(`/api/crm-configs/${selectedConfigForTags}/tags/from-column`, {
          method: 'POST', headers: getAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(data.data),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to create tags from column'); }
        return res.json();
      }
      const res = await fetch(`/api/crm-configs/${selectedConfigForTags}/tags`, {
        method: 'POST', headers: getAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(data),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to create tag'); }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/crm-configs', selectedConfigForTags, 'tags'] });
      queryClient.invalidateQueries({ queryKey: ['/crm-tags/all', userId] });
      setTagFormState({ name: '', color: '#3b82f6', category: 'general', categoryValue: '', description: '' });
      setColumnTagFormState({ tableName: '', columnName: '', phoneColumn: '', tagName: '', selectedValues: [] });
      setEditingTagId(null);
      setAvailableColumns([]);
      setColumnValues([]);
    },
    onError: (error) => { alert(error instanceof Error ? error.message : 'Failed to create tag'); },
  });

  const updateTagMutation = useMutation({
    mutationFn: async ({ tagId, tagData }: { tagId: string; tagData: typeof tagFormState }) => {
      const res = await fetch(`/api/crm-tags/${tagId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'user-id': userId }, body: JSON.stringify(tagData),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to update tag'); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/crm-configs', selectedConfigForTags, 'tags'] });
      queryClient.invalidateQueries({ queryKey: ['/crm-tags/all', userId] });
      setTagFormState({ name: '', color: '#3b82f6', category: 'general', categoryValue: '', description: '' });
      setEditingTagId(null);
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      const res = await fetch(`/api/crm-tags/${tagId}`, { method: 'DELETE', headers: { 'user-id': userId } });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to delete tag'); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/crm-configs', selectedConfigForTags, 'tags'] });
      queryClient.invalidateQueries({ queryKey: ['/crm-tags/all', userId] });
    },
  });

  // ── Load columns when table is selected ──────────────────────────────────
  useEffect(() => {
    if (!selectedConfigForTags || !columnTagFormState.tableName) { setAvailableColumns([]); return; }
    setLoadingColumns(true);
    fetch(`/api/crm-configs/${selectedConfigForTags}/tables/${encodeURIComponent(columnTagFormState.tableName)}/columns`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(result => setAvailableColumns(result.data || []))
      .catch(() => setAvailableColumns([]))
      .finally(() => setLoadingColumns(false));
  }, [selectedConfigForTags, columnTagFormState.tableName]);

  // ── PKCE helpers ─────────────────────────────────────────────────────────
  const base64UrlEncode = (buf: Uint8Array) =>
    btoa(String.fromCharCode(...Array.from(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const generateCodeVerifier = () => {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    return base64UrlEncode(arr);
  };

  const generateCodeChallenge = async (verifier: string) => {
    const data = new TextEncoder().encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return base64UrlEncode(new Uint8Array(hash));
  };

  // ── OAuth2 flow ───────────────────────────────────────────────────────────
  const handleOAuthSubmit = async () => {
    if (!oauthCredentials.client_id || !oauthCredentials.client_secret) {
      setConnectionMessage({ type: 'error', text: 'Client ID and Client Secret are required for OAuth' });
      return;
    }
    const region = formState.crmType === 'zoho' ? oauthCredentials.region : undefined;
    const redirectUri = `${window.location.origin}/crm-oauth-callback`;
    try {
      let codeVerifier = '', codeChallenge = '';
      if (formState.crmType === 'salesforce') {
        codeVerifier = generateCodeVerifier();
        codeChallenge = await generateCodeChallenge(codeVerifier);
      }
      const params = new URLSearchParams({ client_id: oauthCredentials.client_id, redirect_uri: redirectUri });
      if (region) params.append('region', region);
      if (codeChallenge) params.append('code_challenge', codeChallenge);

      const res = await fetch(`/api/crm-oauth/authorize/${formState.crmType}?${params}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const pendingData: any = {
        crmType: formState.crmType, authType: 'OAuth2',
        client_id: oauthCredentials.client_id, client_secret: oauthCredentials.client_secret,
        region, redirect_uri: redirectUri,
      };
      if (codeVerifier) pendingData.code_verifier = codeVerifier;
      sessionStorage.setItem('oauth_pending', JSON.stringify(pendingData));
      setShowOAuthDialog(false);

      const width = 600, height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open(data.authUrl, 'CRM_OAuth', `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`);

      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        setConnectionMessage({ type: 'error', text: '⚠️ Popup blocked! Please allow popups for this site and try again.' });
        setShowOAuthDialog(true);
        return;
      }
      try { popup.focus(); } catch (_) {}

      const handleMessage = async (event: MessageEvent) => {
        if (event.data.type === 'oauth_success') {
          const { code } = event.data;
          const pending = JSON.parse(sessionStorage.getItem('oauth_pending') || '{}');
          const payload: any = {
            code, crmType: pending.crmType, client_id: pending.client_id,
            client_secret: pending.client_secret, redirect_uri: pending.redirect_uri, region: pending.region,
          };
          if (pending.code_verifier) payload.code_verifier = pending.code_verifier;

          const callbackRes = await fetch('/api/crm-oauth/callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'user-id': userId },
            body: JSON.stringify(payload),
          });
          if (!callbackRes.ok) {
            const errText = await callbackRes.text();
            setConnectionMessage({ type: 'error', text: `Connection failed: ${errText}` });
            popup?.close();
            return;
          }
          const result = await callbackRes.json();
          if (result.success) {
            setConnectionMessage({ type: 'success', text: result.message });
            sessionStorage.removeItem('oauth_pending');
            setIsDialogOpen(false);
            setShowOAuthDialog(false);
            setTimeout(() => refetch(), 500);
          } else {
            setConnectionMessage({ type: 'error', text: result.error });
          }
          popup?.close();
        } else if (event.data.type === 'oauth_error') {
          setConnectionMessage({ type: 'error', text: `OAuth failed: ${event.data.errorDescription || event.data.error}` });
          sessionStorage.removeItem('oauth_pending');
          popup?.close();
        }
      };
      window.addEventListener('message', handleMessage);
      const checkPopup = setInterval(() => {
        if (popup?.closed) { clearInterval(checkPopup); window.removeEventListener('message', handleMessage); }
      }, 1000);
    } catch (error) {
      setConnectionMessage({ type: 'error', text: `OAuth failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
      setShowOAuthDialog(true);
    }
  };

  // ── Test & Save handlers ─────────────────────────────────────────────────
  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const result = await testMutation.mutateAsync();
      setConnectionMessage({ type: result.success ? 'success' : 'error', text: result.message || (result.success ? 'Connection successful!' : 'Connection failed') });
    } catch {
      setConnectionMessage({ type: 'error', text: 'Connection test failed' });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!formState.crmType || !formState.authType) {
      setConnectionMessage({ type: 'error', text: 'Please select a CRM platform and authentication method' });
      return;
    }
    try { await saveMutation.mutateAsync(formState); } catch (_) {}
  };

  // ── Tags handlers ────────────────────────────────────────────────────────
  const handleTagSubmit = () => {
    if (!tagFormState.name.trim()) { alert('Tag name is required'); return; }
    if (editingTagId) updateTagMutation.mutate({ tagId: editingTagId, tagData: tagFormState });
    else createTagMutation.mutate(tagFormState);
  };

  const handleEditTag = (tag: any) => {
    setEditingTagId(tag.id);
    setTagFormState({ name: tag.name, color: tag.color || '#3b82f6', category: tag.category || 'general', categoryValue: tag.categoryValue || '', description: tag.description || '' });
  };

  const handleCreateTagsFromColumn = () => {
    if (!columnTagFormState.columnName || columnTagFormState.selectedValues.length === 0 || !columnTagFormState.tagName.trim()) {
      alert('Please select a column, enter a tag name, and select at least one value');
      return;
    }
    createTagMutation.mutate({
      endpoint: 'from-column',
      data: { tableName: columnTagFormState.tableName, columnName: columnTagFormState.columnName, phoneColumn: 'phone', tagName: columnTagFormState.tagName, selectedValues: columnTagFormState.selectedValues },
    });
  };

  const openConnectDialog = (crmType: CRMType) => {
    setFormState({ crmType, authType: '', credentials: {} });
    setOauthCredentials({ client_id: '', client_secret: '', region: 'US' });
    setConnectionMessage(null);
    if (crmType === 'twilio') {
      setTwilioCreds({ account_sid: '', auth_token: '', phone_number: '', assistant_id: '' });
      setShowTwilioDialog(true);
      return;
    }
    // Directly open OAuth dialog instead of the credentials selection dialog
    setShowOAuthDialog(true);
  };

  const handleSaveTwilio = async () => {
    if (!twilioCreds.account_sid || !twilioCreds.auth_token || !twilioCreds.phone_number) {
      setConnectionMessage({ type: 'error', text: 'Account SID, Auth Token, and Phone Number are required' });
      return;
    }
    try {
      const credentials: Record<string, string> = {
        account_sid: twilioCreds.account_sid.trim(),
        auth_token: twilioCreds.auth_token.trim(),
        phone_number: twilioCreds.phone_number.trim(),
      };
      if (twilioCreds.assistant_id.trim()) credentials.assistant_id = twilioCreds.assistant_id.trim();

      await saveMutation.mutateAsync({
        crmType: 'twilio',
        authType: 'Account Credentials',
        credentials,
      });
      setShowTwilioDialog(false);
    } catch {
      // error is surfaced via saveMutation.onError -> connectionMessage
    }
  };

  const openManageDialog = (configId: string) => {
    setSelectedConfigForTags(configId);
    setShowTagsDialog(true);
  };

  // ── Derived ──────────────────────────────────────────────────────────────
  const crmType = formState.crmType as CRMType;
  const currentCRM = crmType && CRM_CONFIGS[crmType] ? CRM_CONFIGS[crmType] : null;
  const authFields = currentCRM && formState.authType ? (currentCRM.fields as Record<string, any[]>)[formState.authType] || [] : [];

  const tabs = [
    { key: 'general', label: t('settings.general', { defaultValue: 'General' }) },
    { key: 'integrations', label: t('settings.channels', { defaultValue: 'Integrations' }) },
    { key: 'security', label: t('settings.security', { defaultValue: 'Security' }) },
  ] as const;

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar items={sidebarItems} compact={!sidebarOpen} onNavigate={(href) => setLocation(href)} onLogout={() => setLocation('/login')} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar
          breadcrumbs={[{ label: t('nav.settings', { defaultValue: 'Settings' }), href: '/settings' }, { label: t('settings.crm.crmIntegrations', { defaultValue: 'CRM Integrations' }) }]}
          showMenuToggle
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <div className="flex-1 overflow-auto py-6">
          <div className="flex flex-col gap-4 px-6">

            <h1 className="font-['IBM_Plex_Sans'] text-[24px] font-semibold leading-[1.3] text-[#0f172a]">{t('settings.title', { defaultValue: 'Settings' })}</h1>

            {/* ── Tabs ── */}
            <div className="flex items-center">
              <div className="flex h-[34px] items-center rounded-[10px] bg-[#f5f5f5] p-[3px]">
                {tabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      if (tab.key === 'general') { setLocation('/settings'); return; }
                      if (tab.key === 'security') { setLocation('/settingsSecurity'); return; }
                    }}
                    className={`flex h-7 items-center justify-center rounded-[8px] px-3 font-['IBM_Plex_Sans'] text-[14px] leading-[1.5] text-[#0a0a0a] transition-all ${
                      activeTab === tab.key
                        ? 'border border-[#e5e5e5] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]'
                        : 'hover:bg-white/60'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── ALL INTEGRATIONS ── */}
            <div className="flex flex-col gap-4">
              <p className="font-['IBM_Plex_Sans'] text-[14px] font-semibold uppercase leading-[21px] tracking-[0.1996px] text-[#0a0a0a]">{t('settings.crm.allIntegrations', { defaultValue: 'All Integrations' })}</p>
              <div className="flex flex-wrap gap-6">
                {/* Salesforce */}
                <IntegrationCard
                  logo={<img src={imgSalesforce} alt="Salesforce" className="h-5 w-[29px] object-contain" />}
                  name="Salesforce"
                  description="Connect customer data and feedback insights"
                  tags={['CRM', 'Sales', 'Analytics']}
                  active={crmConfigs.some(c => c.crmType === 'salesforce')}
                  connected={crmConfigs.some(c => c.crmType === 'salesforce')}
                  onConnect={() => openConnectDialog('salesforce')}
                  onManage={() => { const c = crmConfigs.find(c => c.crmType === 'salesforce'); if (c) openManageDialog(c.id); }}
                />
                {/* HubSpot */}
                <IntegrationCard
                  logo={<img src={imgHubspot} alt="HubSpot" className="h-5 w-[17px] object-contain" />}
                  name="HubSpot"
                  description="Sync contacts and track engagement metrics"
                  tags={['CRM', 'Marketing', 'Automation']}
                  active={crmConfigs.some(c => c.crmType === 'hubspot')}
                  connected={crmConfigs.some(c => c.crmType === 'hubspot')}
                  onConnect={() => openConnectDialog('hubspot')}
                  onManage={() => { const c = crmConfigs.find(c => c.crmType === 'hubspot'); if (c) openManageDialog(c.id); }}
                />
                {/* Zoho */}
                <IntegrationCard
                  logo={<img src={imgZoho} alt="Zoho CRM" className="h-7 w-7 object-contain" />}
                  name="Zoho CRM"
                  description="Manage leads and customer relationships"
                  tags={['CRM', 'Sales Pipeline']}
                  active={crmConfigs.some(c => c.crmType === 'zoho')}
                  connected={crmConfigs.some(c => c.crmType === 'zoho')}
                  onConnect={() => openConnectDialog('zoho')}
                  onManage={() => { const c = crmConfigs.find(c => c.crmType === 'zoho'); if (c) openManageDialog(c.id); }}
                />
                {/* Pipedrive */}
                <IntegrationCard
                  logo={<span className="text-[20px] leading-none">📊</span>}
                  name="Pipedrive"
                  description="Visual sales pipeline management"
                  tags={['Sales', 'Pipeline']}
                  active={crmConfigs.some(c => c.crmType === 'pipedrive')}
                  connected={crmConfigs.some(c => c.crmType === 'pipedrive')}
                  onConnect={() => openConnectDialog('pipedrive')}
                  onManage={() => { const c = crmConfigs.find(c => c.crmType === 'pipedrive'); if (c) openManageDialog(c.id); }}
                />
                {/* Microsoft Dynamics 365 */}
                <IntegrationCard
                  logo={<img src={imgMicrosoftDynamics} alt="Microsoft Dynamics 365" className="h-6 w-6 object-contain" />}
                  name="Microsoft Dynamics 365"
                  description="Enterprise CRM and business applications"
                  tags={['Enterprise', 'CRM']}
                  active={crmConfigs.some(c => c.crmType === 'microsoftDynamics')}
                  connected={crmConfigs.some(c => c.crmType === 'microsoftDynamics')}
                  onConnect={() => openConnectDialog('microsoftDynamics')}
                  onManage={() => { const c = crmConfigs.find(c => c.crmType === 'microsoftDynamics'); if (c) openManageDialog(c.id); }}
                />
                {/* Freshsales */}
                <IntegrationCard
                  logo={<span className="text-[20px] leading-none">🌟</span>}
                  name="Freshsales"
                  description="AI-powered sales CRM for growing teams"
                  tags={['CRM', 'AI', 'Sales']}
                  active={crmConfigs.some(c => c.crmType === 'freshsales')}
                  connected={crmConfigs.some(c => c.crmType === 'freshsales')}
                  onConnect={() => openConnectDialog('freshsales')}
                  onManage={() => { const c = crmConfigs.find(c => c.crmType === 'freshsales'); if (c) openManageDialog(c.id); }}
                />
                {/* Gmail */}
                <IntegrationCard
                  logo={<span className="text-[22px] leading-none">📧</span>}
                  name="Gmail"
                  description="Send survey invites from your Google Workspace / Gmail account"
                  tags={['Email', 'Google', 'OAuth2']}
                  active={crmConfigs.some(c => c.crmType === 'gmail')}
                  connected={crmConfigs.some(c => c.crmType === 'gmail')}
                  onConnect={() => openConnectDialog('gmail')}
                  onManage={() => { const c = crmConfigs.find(c => c.crmType === 'gmail'); if (c) openManageDialog(c.id); }}
                />
                {/* Outlook / Microsoft 365 */}
                <IntegrationCard
                  logo={<span className="text-[22px] leading-none">📨</span>}
                  name="Outlook / Microsoft 365"
                  description="Send survey invites from your Outlook or Microsoft 365 mailbox"
                  tags={['Email', 'Microsoft', 'OAuth2']}
                  active={crmConfigs.some(c => c.crmType === 'outlook')}
                  connected={crmConfigs.some(c => c.crmType === 'outlook')}
                  onConnect={() => openConnectDialog('outlook')}
                  onManage={() => { const c = crmConfigs.find(c => c.crmType === 'outlook'); if (c) openManageDialog(c.id); }}
                />
                {/* Twilio (VAPI telephony) */}
                <IntegrationCard
                  logo={<Phone className="h-5 w-5 text-[#F22F46]" />}
                  name="Twilio"
                  description="Use your Twilio number as the outbound caller ID for voice surveys"
                  tags={['Telephony', 'VAPI', 'Voice']}
                  active={crmConfigs.some(c => c.crmType === 'twilio')}
                  connected={crmConfigs.some(c => c.crmType === 'twilio')}
                  onConnect={() => openConnectDialog('twilio')}
                  onManage={() => { const c = crmConfigs.find(c => c.crmType === 'twilio'); if (c) openManageDialog(c.id); }}
                />
              </div>
            </div>

            {/* ── YOUR CONNECTIONS ── */}
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <p className="font-['IBM_Plex_Sans'] text-[20px] font-semibold leading-[30px] tracking-[-0.4492px] text-[#0a0a0a]">{t('settings.crm.yourConnections', { defaultValue: 'Your Connections' })}</p>
                <p className="font-['IBM_Plex_Sans'] text-[14px] font-normal leading-[21px] tracking-[-0.1504px] text-[#717182]">{t('settings.crm.yourConnectionsDesc', { defaultValue: 'Manage your connected CRM integrations' })}</p>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-[#717182]" />
                </div>
              ) : crmConfigs.length === 0 ? (
                <div className="overflow-hidden rounded-[10px] border border-[rgba(0,0,0,0.1)] bg-white px-6 py-10 text-center">
                  <p className="font-['IBM_Plex_Sans'] text-[14px] text-[#717182]">{t('settings.crm.noCrmConnections', { defaultValue: 'No CRM connections yet. Connect one above to get started.' })}</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-[10px] border border-[rgba(0,0,0,0.1)] bg-white">
                  {crmConfigs.map((config, idx) => (
                    <ConnectionRow
                      key={config.id}
                      logo={getCrmLogo(config.crmType, 'sm')}
                      name={CRM_CONFIGS[config.crmType]?.name ?? config.crmType}
                      authMethod={config.authType}
                      connectedOn={`Connected on ${new Date(config.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                      borderBottom={idx < crmConfigs.length - 1}
                      onManage={() => openManageDialog(config.id)}
                      onDelete={() => {
                        if (confirm(`Delete ${CRM_CONFIGS[config.crmType]?.name ?? config.crmType} connection?`)) {
                          deleteMutation.mutate(config.id);
                        }
                      }}
                      deleting={deleteMutation.isPending}
                    />
                  ))}
                </div>
              )}

              <div className="flex items-center gap-[8px]">
                <ExternalLink className="h-3.5 w-3.5 text-[#717182]" />
                <p className="font-['IBM_Plex_Sans'] text-[13px] font-normal leading-[19.5px] tracking-[-0.0762px] text-[#717182]">
                  Need help configuring your integrations?{' '}
                  <span className="cursor-pointer text-[#030213] hover:underline">View integration documentation</span>
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          Connect / Credentials Dialog
      ══════════════════════════════════════════════════════════════════ */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => { if (e.target === e.currentTarget) { setIsDialogOpen(false); setConnectionMessage(null); } }}>
          <div className="relative bg-white rounded-[14px] shadow-[0px_8px_30px_0px_rgba(0,0,0,0.15)] w-full max-w-[560px] max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-5">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-['IBM_Plex_Sans'] text-[17px] font-semibold text-[#0a0a0a]">
                  Connect {currentCRM ? currentCRM.name : 'CRM'}
                </h3>
                <p className="font-['IBM_Plex_Sans'] text-[13px] text-[#717182] mt-0.5">{currentCRM?.description ?? 'Select a CRM platform to connect'}</p>
              </div>
              <button onClick={() => { setIsDialogOpen(false); setConnectionMessage(null); }} className="flex items-center justify-center h-7 w-7 rounded-md text-[#717182] hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* CRM Type */}
            <div className="flex flex-col gap-1.5">
              <label className="font-['IBM_Plex_Sans'] text-[13px] font-medium text-[#0a0a0a]">CRM Platform</label>
              <select
                value={formState.crmType}
                onChange={e => setFormState({ crmType: e.target.value as CRMType, authType: '', credentials: {} })}
                className="h-9 w-full rounded-lg border border-[#e5e5e5] bg-white px-3 text-[14px] text-[#0a0a0a] outline-none focus:ring-2 focus:ring-slate-900/20"
              >
                <option value="">Select a CRM</option>
                <option value="zoho">Zoho CRM</option>
                <option value="salesforce">Salesforce</option>
                <option value="hubspot">HubSpot</option>
              </select>
            </div>

            {/* Connect with OAuth2 */}
            {currentCRM && (
              <div className="rounded-xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50 p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600">
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-['IBM_Plex_Sans'] text-[15px] font-bold text-blue-900">Connect with OAuth2</p>
                    <p className="font-['IBM_Plex_Sans'] text-[13px] text-blue-700 mt-0.5">
                      Securely connect your {currentCRM.name} account using OAuth2. Provide your credentials and we'll guide you through the authorization.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setOauthCredentials({ client_id: '', client_secret: '', region: 'US' }); setShowOAuthDialog(true); setIsDialogOpen(false); }}
                  className="flex h-9 w-full items-center justify-center rounded-lg bg-blue-600 font-['IBM_Plex_Sans'] text-[14px] font-semibold text-white hover:bg-blue-700"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Connect with OAuth2
                </button>
              </div>
            )}

            {/* Divider */}
            {currentCRM && (
              <div className="relative flex items-center">
                <div className="flex-1 border-t border-[#e5e5e5]" />
                <span className="mx-3 font-['IBM_Plex_Sans'] text-[11px] uppercase tracking-widest text-[#717182]">Or configure manually</span>
                <div className="flex-1 border-t border-[#e5e5e5]" />
              </div>
            )}

            {/* Auth method */}
            {currentCRM && (
              <div className="flex flex-col gap-1.5">
                <label className="font-['IBM_Plex_Sans'] text-[13px] font-medium text-[#0a0a0a]">Authentication Method</label>
                <select
                  value={formState.authType}
                  onChange={e => setFormState({ ...formState, authType: e.target.value, credentials: {} })}
                  className="h-9 w-full rounded-lg border border-[#e5e5e5] bg-white px-3 text-[14px] text-[#0a0a0a] outline-none focus:ring-2 focus:ring-slate-900/20"
                >
                  <option value="">Select authentication method</option>
                  {Object.keys(currentCRM.fields).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <p className="font-['IBM_Plex_Sans'] text-[12px] text-[#717182]">For advanced users who want to manually configure credentials</p>
              </div>
            )}

            {/* Credential fields */}
            {authFields.length > 0 && (
              <div className="flex flex-col gap-3 rounded-lg bg-slate-50 p-4">
                {authFields.map((field: any) => (
                  <div key={field.key} className="flex flex-col gap-1.5">
                    <label className="font-['IBM_Plex_Sans'] text-[13px] font-medium text-[#0a0a0a]">{field.label}</label>
                    {field.type === 'textarea' ? (
                      <textarea
                        placeholder={field.placeholder}
                        value={formState.credentials[field.key] || ''}
                        onChange={e => setFormState({ ...formState, credentials: { ...formState.credentials, [field.key]: e.target.value } })}
                        className="h-24 w-full rounded-lg border border-[#e5e5e5] bg-white p-2 font-mono text-[13px] text-[#0a0a0a] outline-none focus:ring-2 focus:ring-slate-900/20 resize-none"
                      />
                    ) : field.type === 'select' ? (
                      <select
                        value={formState.credentials[field.key] || ''}
                        onChange={e => setFormState({ ...formState, credentials: { ...formState.credentials, [field.key]: e.target.value } })}
                        className="h-9 w-full rounded-lg border border-[#e5e5e5] bg-white px-3 text-[14px] text-[#0a0a0a] outline-none focus:ring-2 focus:ring-slate-900/20"
                      >
                        <option value="">{field.placeholder}</option>
                        {field.options?.map((o: string) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <div className="relative">
                        <input
                          type={field.type === 'password' && !showPasswords[field.key] ? 'password' : 'text'}
                          placeholder={field.placeholder}
                          value={formState.credentials[field.key] || ''}
                          onChange={e => setFormState({ ...formState, credentials: { ...formState.credentials, [field.key]: e.target.value } })}
                          className="h-9 w-full rounded-lg border border-[#e5e5e5] bg-white px-3 pr-10 text-[14px] text-[#0a0a0a] outline-none focus:ring-2 focus:ring-slate-900/20"
                        />
                        {field.type === 'password' && (
                          <button type="button" onClick={() => setShowPasswords(p => ({ ...p, [field.key]: !p[field.key] }))} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#717182]">
                            {showPasswords[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Status message */}
            {connectionMessage && (
              <div className={`flex items-start gap-2 rounded-lg border p-3 text-[13px] ${connectionMessage.type === 'success' ? 'border-[#b9f8cf] bg-[#f0fdf4] text-[#008236]' : 'border-red-200 bg-red-50 text-red-700'}`}>
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {connectionMessage.text}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleTestConnection}
                disabled={testingConnection || saveMutation.isPending}
                className="flex h-9 flex-1 items-center justify-center rounded-lg border border-[#e5e5e5] bg-white font-['IBM_Plex_Sans'] text-[14px] font-medium text-[#0a0a0a] hover:bg-slate-50 disabled:opacity-50"
              >
                {testingConnection && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Test Connection
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={testingConnection || saveMutation.isPending}
                className="flex h-9 flex-1 items-center justify-center rounded-lg bg-[#030213] font-['IBM_Plex_Sans'] text-[14px] font-medium text-white hover:bg-[#1a1a2e] disabled:opacity-50"
              >
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {saveMutation.isPending ? 'Connecting...' : 'Save Connection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          OAuth2 Credentials Dialog
      ══════════════════════════════════════════════════════════════════ */}
      {showOAuthDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => { if (e.target === e.currentTarget) setShowOAuthDialog(false); }}>
          <div className="relative bg-white rounded-[14px] shadow-[0px_8px_30px_0px_rgba(0,0,0,0.15)] w-full max-w-[460px] p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-['IBM_Plex_Sans'] text-[17px] font-semibold text-[#0a0a0a]">
                  Connect with {formState.crmType ? CRM_CONFIGS[formState.crmType as CRMType]?.name : 'CRM'} via OAuth2
                </h3>
                <p className="font-['IBM_Plex_Sans'] text-[13px] text-[#717182] mt-0.5">Enter your OAuth2 credentials to authorize and connect your CRM account</p>
              </div>
              <button onClick={() => setShowOAuthDialog(false)} className="flex h-7 w-7 items-center justify-center rounded-md text-[#717182] hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* CRM selection if not pre-selected */}
            {!formState.crmType && (
              <div className="flex flex-col gap-1.5">
                <label className="font-['IBM_Plex_Sans'] text-[13px] font-medium text-[#0a0a0a]">Select CRM *</label>
                <select
                  value={formState.crmType}
                  onChange={e => setFormState({ ...formState, crmType: e.target.value as CRMType, authType: 'OAuth2' })}
                  className="h-9 w-full rounded-lg border border-[#e5e5e5] bg-white px-3 text-[14px] text-[#0a0a0a] outline-none focus:ring-2 focus:ring-slate-900/20"
                >
                  <option value="">Choose CRM platform…</option>
                  <option value="zoho">Zoho CRM</option>
                  <option value="salesforce">Salesforce</option>
                  <option value="hubspot">HubSpot</option>
                  <option value="pipedrive">Pipedrive</option>
                  <option value="microsoftDynamics">Microsoft Dynamics 365</option>
                  <option value="freshsales">Freshsales</option>
                </select>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="font-['IBM_Plex_Sans'] text-[13px] font-medium text-[#0a0a0a]">Client ID *</label>
              <input
                placeholder="Enter your Client ID"
                value={oauthCredentials.client_id}
                onChange={e => setOauthCredentials(o => ({ ...o, client_id: e.target.value }))}
                className="h-9 w-full rounded-lg border border-[#e5e5e5] bg-white px-3 text-[14px] text-[#0a0a0a] outline-none focus:ring-2 focus:ring-slate-900/20"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-['IBM_Plex_Sans'] text-[13px] font-medium text-[#0a0a0a]">Client Secret *</label>
              <input
                type="password"
                placeholder="Enter your Client Secret"
                value={oauthCredentials.client_secret}
                onChange={e => setOauthCredentials(o => ({ ...o, client_secret: e.target.value }))}
                className="h-9 w-full rounded-lg border border-[#e5e5e5] bg-white px-3 text-[14px] text-[#0a0a0a] outline-none focus:ring-2 focus:ring-slate-900/20"
              />
            </div>

            {formState.crmType === 'zoho' && (
              <div className="flex flex-col gap-1.5">
                <label className="font-['IBM_Plex_Sans'] text-[13px] font-medium text-[#0a0a0a]">Region</label>
                <select
                  value={oauthCredentials.region}
                  onChange={e => setOauthCredentials(o => ({ ...o, region: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-[#e5e5e5] bg-white px-3 text-[14px] text-[#0a0a0a] outline-none focus:ring-2 focus:ring-slate-900/20"
                >
                  <option value="US">United States</option>
                  <option value="EU">Europe</option>
                  <option value="IN">India</option>
                  <option value="AU">Australia</option>
                  <option value="CN">China</option>
                  <option value="JP">Japan</option>
                </select>
              </div>
            )}

            {/* Instructions */}
            <div className="rounded-lg bg-slate-50 p-3 text-[12px] text-[#717182]">
              <p className="mb-1.5 font-medium text-[#0a0a0a]">How to get OAuth credentials:</p>
              <ul className="list-inside list-disc space-y-0.5">
                {formState.crmType === 'zoho' && (<><li>Go to Zoho API Console</li><li>Create a Self Client or Server-based Application</li><li>Copy Client ID and Client Secret</li></>)}
                {formState.crmType === 'salesforce' && (<><li>Go to Salesforce Setup → App Manager</li><li>Create a Connected App with OAuth enabled</li><li>Copy Consumer Key and Consumer Secret</li></>)}
                {formState.crmType === 'hubspot' && (<><li>Go to HubSpot Developer Account</li><li>Create a Public or Private App</li><li>Copy Client ID and Client Secret</li></>)}
                {formState.crmType === 'pipedrive' && (<><li>Go to Pipedrive Settings → Tools & Integrations → Integrations</li><li>Create a new OAuth app</li><li>Copy Client ID and Client Secret</li></>)}
                {formState.crmType === 'microsoftDynamics' && (<><li>Go to Azure Portal → App registrations</li><li>Create a new application registration</li><li>Copy Client ID, Client Secret, and Tenant ID</li><li>Set your Instance URL (e.g., https://your-org.crm.dynamics.com)</li></>)}
                {formState.crmType === 'freshsales' && (<><li>Go to Freshsales → Settings → Integrations API</li><li>Create a new OAuth app</li><li>Copy Client ID and Client Secret</li></>)}
              </ul>
            </div>

            {connectionMessage && (
              <div className={`flex items-start gap-2 rounded-lg border p-3 text-[13px] ${connectionMessage.type === 'success' ? 'border-[#b9f8cf] bg-[#f0fdf4] text-[#008236]' : 'border-red-200 bg-red-50 text-red-700'}`}>
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {connectionMessage.text}
              </div>
            )}

            <button
              onClick={handleOAuthSubmit}
              disabled={!formState.crmType || !oauthCredentials.client_id || !oauthCredentials.client_secret}
              className="flex h-9 w-full items-center justify-center rounded-lg bg-[#030213] font-['IBM_Plex_Sans'] text-[14px] font-medium text-white hover:bg-[#1a1a2e] disabled:opacity-50"
            >
              Authorize & Connect to {formState.crmType ? CRM_CONFIGS[formState.crmType as CRMType]?.name : 'CRM'}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          Twilio Credentials Dialog (VAPI telephony)
      ══════════════════════════════════════════════════════════════════ */}
      {showTwilioDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => { if (e.target === e.currentTarget) { setShowTwilioDialog(false); setConnectionMessage(null); } }}>
          <div className="relative bg-white rounded-[14px] shadow-[0px_8px_30px_0px_rgba(0,0,0,0.15)] w-full max-w-[480px] p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-['IBM_Plex_Sans'] text-[17px] font-semibold text-[#0a0a0a]">Connect Twilio</h3>
                <p className="font-['IBM_Plex_Sans'] text-[13px] text-[#717182] mt-0.5">
                  Your Twilio number will be imported into VAPI and used as the outbound caller ID for voice surveys.
                </p>
              </div>
              <button onClick={() => { setShowTwilioDialog(false); setConnectionMessage(null); }} className="flex h-7 w-7 items-center justify-center rounded-md text-[#717182] hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-['IBM_Plex_Sans'] text-[13px] font-medium text-[#0a0a0a]">Account SID *</label>
              <input
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={twilioCreds.account_sid}
                onChange={e => setTwilioCreds(c => ({ ...c, account_sid: e.target.value }))}
                className="h-9 w-full rounded-lg border border-[#e5e5e5] bg-white px-3 text-[14px] text-[#0a0a0a] outline-none focus:ring-2 focus:ring-slate-900/20"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-['IBM_Plex_Sans'] text-[13px] font-medium text-[#0a0a0a]">Auth Token *</label>
              <div className="relative">
                <input
                  type={twilioShowToken ? 'text' : 'password'}
                  placeholder="Your Twilio Auth Token"
                  value={twilioCreds.auth_token}
                  onChange={e => setTwilioCreds(c => ({ ...c, auth_token: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-[#e5e5e5] bg-white px-3 pr-10 text-[14px] text-[#0a0a0a] outline-none focus:ring-2 focus:ring-slate-900/20"
                />
                <button type="button" onClick={() => setTwilioShowToken(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#717182]">
                  {twilioShowToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-['IBM_Plex_Sans'] text-[13px] font-medium text-[#0a0a0a]">Phone Number (E.164) *</label>
              <input
                placeholder="+15551234567"
                value={twilioCreds.phone_number}
                onChange={e => setTwilioCreds(c => ({ ...c, phone_number: e.target.value }))}
                className="h-9 w-full rounded-lg border border-[#e5e5e5] bg-white px-3 text-[14px] text-[#0a0a0a] outline-none focus:ring-2 focus:ring-slate-900/20"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-['IBM_Plex_Sans'] text-[13px] font-medium text-[#0a0a0a]">VAPI Assistant ID (optional)</label>
              <input
                placeholder="Leave blank to keep the default voice agent"
                value={twilioCreds.assistant_id}
                onChange={e => setTwilioCreds(c => ({ ...c, assistant_id: e.target.value }))}
                className="h-9 w-full rounded-lg border border-[#e5e5e5] bg-white px-3 text-[14px] text-[#0a0a0a] outline-none focus:ring-2 focus:ring-slate-900/20"
              />
            </div>

            {connectionMessage && (
              <div className={`flex items-start gap-2 rounded-lg border p-3 text-[13px] ${connectionMessage.type === 'success' ? 'border-[#b9f8cf] bg-[#f0fdf4] text-[#008236]' : 'border-red-200 bg-red-50 text-red-700'}`}>
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {connectionMessage.text}
              </div>
            )}

            <button
              onClick={handleSaveTwilio}
              disabled={saveMutation.isPending}
              className="flex h-9 w-full items-center justify-center rounded-lg bg-[#030213] font-['IBM_Plex_Sans'] text-[14px] font-medium text-white hover:bg-[#1a1a2e] disabled:opacity-50"
            >
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saveMutation.isPending ? 'Connecting…' : 'Connect Twilio & Import to VAPI'}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          Tags Management Dialog
      ══════════════════════════════════════════════════════════════════ */}
      {showTagsDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => { if (e.target === e.currentTarget) setShowTagsDialog(false); }}>
          <div className="relative bg-white rounded-[14px] shadow-[0px_8px_30px_0px_rgba(0,0,0,0.15)] w-full max-w-[720px] max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-5">

            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <TagIcon className="h-5 w-5 text-[#0a0a0a]" />
                <div>
                  <h3 className="font-['IBM_Plex_Sans'] text-[17px] font-semibold text-[#0a0a0a]">Manage CRM Tags</h3>
                  <p className="font-['IBM_Plex_Sans'] text-[13px] text-[#717182]">Create, edit, and organize tags for your CRM contacts</p>
                </div>
              </div>
              <button onClick={() => setShowTagsDialog(false)} className="flex h-7 w-7 items-center justify-center rounded-md text-[#717182] hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* CRM Config selector */}
            <div className="flex flex-col gap-1.5">
              <label className="font-['IBM_Plex_Sans'] text-[13px] font-medium text-[#0a0a0a]">Select CRM Connection</label>
              <select
                value={selectedConfigForTags}
                onChange={e => setSelectedConfigForTags(e.target.value)}
                className="h-9 w-full rounded-lg border border-[#e5e5e5] bg-white px-3 text-[14px] text-[#0a0a0a] outline-none focus:ring-2 focus:ring-slate-900/20"
              >
                <option value="">Select a CRM connection…</option>
                {crmConfigs.map(c => (
                  <option key={c.id} value={c.id}>{CRM_CONFIGS[c.crmType]?.name ?? c.crmType} — {c.authType}</option>
                ))}
              </select>
            </div>

            {/* Tab selector */}
            <div className="flex h-[34px] items-center rounded-[10px] bg-[#f5f5f5] p-[3px] w-fit">
              {(['manual', 'column'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTagCreationTab(t)}
                  className={`flex h-7 items-center justify-center rounded-[8px] px-4 font-['IBM_Plex_Sans'] text-[14px] text-[#0a0a0a] transition-all ${tagCreationTab === t ? 'border border-[#e5e5e5] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]' : 'hover:bg-white/60'}`}
                >
                  {t === 'manual' ? 'Create Manually' : 'Create from Column'}
                </button>
              ))}
            </div>

            {/* Manual tab */}
            {tagCreationTab === 'manual' && (
              <div className="rounded-[10px] border border-[rgba(0,0,0,0.1)] bg-white p-5 flex flex-col gap-4">
                <h4 className="font-['IBM_Plex_Sans'] text-[15px] font-semibold text-[#0a0a0a]">{editingTagId ? 'Edit Tag' : 'Create New Tag'}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-['IBM_Plex_Sans'] text-[13px] font-medium text-[#0a0a0a]">Tag Name *</label>
                    <input placeholder="e.g., Engineering, California, VIP" value={tagFormState.name} onChange={e => setTagFormState(s => ({ ...s, name: e.target.value }))} className="h-9 w-full rounded-lg border border-[#e5e5e5] bg-white px-3 text-[14px] text-[#0a0a0a] outline-none focus:ring-2 focus:ring-slate-900/20" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-['IBM_Plex_Sans'] text-[13px] font-medium text-[#0a0a0a]">Color</label>
                    <div className="flex gap-2">
                      <input type="color" value={tagFormState.color} onChange={e => setTagFormState(s => ({ ...s, color: e.target.value }))} className="h-9 w-14 rounded-lg border border-[#e5e5e5] cursor-pointer" />
                      <input value={tagFormState.color} onChange={e => setTagFormState(s => ({ ...s, color: e.target.value }))} placeholder="#3b82f6" className="h-9 flex-1 rounded-lg border border-[#e5e5e5] bg-white px-3 text-[14px] text-[#0a0a0a] outline-none focus:ring-2 focus:ring-slate-900/20" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-['IBM_Plex_Sans'] text-[13px] font-medium text-[#0a0a0a]">Category</label>
                    <select value={tagFormState.category} onChange={e => setTagFormState(s => ({ ...s, category: e.target.value }))} className="h-9 w-full rounded-lg border border-[#e5e5e5] bg-white px-3 text-[14px] text-[#0a0a0a] outline-none focus:ring-2 focus:ring-slate-900/20">
                      <option value="general">General</option>
                      <option value="department">Department</option>
                      <option value="location">Location</option>
                    </select>
                  </div>
                  {(tagFormState.category === 'department' || tagFormState.category === 'location') && (
                    <div className="flex flex-col gap-1.5">
                      <label className="font-['IBM_Plex_Sans'] text-[13px] font-medium text-[#0a0a0a]">{tagFormState.category === 'department' ? 'Department Name' : 'Location Name'}</label>
                      <input placeholder={tagFormState.category === 'department' ? 'e.g., Sales, Marketing' : 'e.g., New York, London'} value={tagFormState.categoryValue} onChange={e => setTagFormState(s => ({ ...s, categoryValue: e.target.value }))} className="h-9 w-full rounded-lg border border-[#e5e5e5] bg-white px-3 text-[14px] text-[#0a0a0a] outline-none focus:ring-2 focus:ring-slate-900/20" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-['IBM_Plex_Sans'] text-[13px] font-medium text-[#0a0a0a]">Description (Optional)</label>
                  <input placeholder="Brief description of this tag" value={tagFormState.description} onChange={e => setTagFormState(s => ({ ...s, description: e.target.value }))} className="h-9 w-full rounded-lg border border-[#e5e5e5] bg-white px-3 text-[14px] text-[#0a0a0a] outline-none focus:ring-2 focus:ring-slate-900/20" />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleTagSubmit} disabled={!tagFormState.name.trim() || createTagMutation.isPending || updateTagMutation.isPending} className="flex h-9 items-center rounded-lg bg-[#030213] px-4 font-['IBM_Plex_Sans'] text-[14px] font-medium text-white hover:bg-[#1a1a2e] disabled:opacity-50">
                    {(createTagMutation.isPending || updateTagMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingTagId ? 'Update Tag' : 'Create Tag'}
                  </button>
                  {editingTagId && (
                    <button onClick={() => { setEditingTagId(null); setTagFormState({ name: '', color: '#3b82f6', category: 'general', categoryValue: '', description: '' }); }} className="flex h-9 items-center rounded-lg border border-[#e5e5e5] bg-white px-4 font-['IBM_Plex_Sans'] text-[14px] font-medium text-[#0a0a0a] hover:bg-slate-50">
                      <X className="mr-1.5 h-4 w-4" /> Cancel
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Column tab */}
            {tagCreationTab === 'column' && (
              <div className="rounded-[10px] border border-[rgba(0,0,0,0.1)] bg-white p-5 flex flex-col gap-4">
                <div>
                  <h4 className="font-['IBM_Plex_Sans'] text-[15px] font-semibold text-[#0a0a0a]">Create Tags from CRM Column</h4>
                  <p className="font-['IBM_Plex_Sans'] text-[13px] text-[#717182] mt-0.5">Select a column from your CRM table and choose which values to create tags for.</p>
                </div>
                {!selectedConfigForTags ? (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-700">
                    <AlertCircle className="h-4 w-4 shrink-0" /> Please select a CRM connection above first.
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="font-['IBM_Plex_Sans'] text-[13px] font-medium text-[#0a0a0a]">Tag Name *</label>
                      <input placeholder="e.g., Region, Country, Location" value={columnTagFormState.tagName} onChange={e => setColumnTagFormState(s => ({ ...s, tagName: e.target.value }))} className="h-9 w-full rounded-lg border border-[#e5e5e5] bg-white px-3 text-[14px] text-[#0a0a0a] outline-none focus:ring-2 focus:ring-slate-900/20" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="font-['IBM_Plex_Sans'] text-[13px] font-medium text-[#0a0a0a]">CRM Table *</label>
                      <select value={columnTagFormState.tableName} onChange={e => { setColumnTagFormState(s => ({ ...s, tableName: e.target.value, columnName: '', selectedValues: [] })); setAvailableColumns([]); setColumnValues([]); setColumnSearch(''); }} className="h-9 w-full rounded-lg border border-[#e5e5e5] bg-white px-3 text-[14px] text-[#0a0a0a] outline-none focus:ring-2 focus:ring-slate-900/20">
                        <option value="">Select a table…</option>
                        {crmTables.map((t: any) => <option key={t.name} value={t.name}>{t.name}</option>)}
                      </select>
                    </div>
                    {columnTagFormState.tableName && (
                      <div className="flex flex-col gap-1.5">
                        <label className="font-['IBM_Plex_Sans'] text-[13px] font-medium text-[#0a0a0a]">Column to Create Tags From *</label>
                        <input
                          placeholder="Search columns… (e.g. department, region)"
                          value={columnSearch}
                          onChange={e => setColumnSearch(e.target.value)}
                          className="h-9 w-full rounded-lg border border-[#e5e5e5] bg-white px-3 text-[14px] text-[#0a0a0a] outline-none focus:ring-2 focus:ring-slate-900/20"
                        />
                        <select
                          value={columnTagFormState.columnName}
                          onChange={async (e) => {
                            const value = e.target.value;
                            setColumnSearch('');
                            setColumnTagFormState(s => ({ ...s, columnName: value, selectedValues: [] }));
                            setColumnValues([]);
                            setLoadingValues(true);
                            try {
                              const res = await fetch(`/api/crm-configs/${selectedConfigForTags}/tables/${encodeURIComponent(columnTagFormState.tableName)}/columns/${encodeURIComponent(value)}/values`);
                              if (res.ok) { const r = await res.json(); setColumnValues(r.data || []); }
                            } catch (_) {} finally { setLoadingValues(false); }
                          }}
                          size={Math.min(8, (columnSearch
                            ? availableColumns.filter((c: any) => c.name.toLowerCase().includes(columnSearch.toLowerCase()) || (c.label || '').toLowerCase().includes(columnSearch.toLowerCase()))
                            : availableColumns).length + 1)}
                          className="w-full rounded-lg border border-[#e5e5e5] bg-white px-3 py-1 text-[14px] text-[#0a0a0a] outline-none focus:ring-2 focus:ring-slate-900/20"
                        >
                          <option value="">{loadingColumns ? 'Loading columns…' : 'Select a column…'}</option>
                          {(columnSearch
                            ? availableColumns.filter((c: any) => c.name.toLowerCase().includes(columnSearch.toLowerCase()) || (c.label || '').toLowerCase().includes(columnSearch.toLowerCase()))
                            : availableColumns
                          ).map((c: any) => (
                            <option key={c.name} value={c.name}>{c.label ? `${c.label} (${c.name})` : c.name}</option>
                          ))}
                        </select>
                        {columnTagFormState.columnName && (
                          <p className="text-[12px] text-[#717182]">Selected: <span className="font-medium text-[#0a0a0a]">{columnTagFormState.columnName}</span></p>
                        )}
                      </div>
                    )}
                    {loadingValues && (
                      <div className="flex items-center gap-2 text-[13px] text-[#717182]">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading values…
                      </div>
                    )}
                    {columnValues.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        <label className="font-['IBM_Plex_Sans'] text-[13px] font-medium text-[#0a0a0a]">Select Values to Create Tags For</label>
                        <div className="max-h-48 overflow-y-auto rounded-lg border border-[#e5e5e5] bg-slate-50 p-3 space-y-2">
                          {columnValues.map((v: string) => (
                            <label key={v} className="flex items-center gap-2 cursor-pointer text-[13px] text-[#0a0a0a]">
                              <input
                                type="checkbox"
                                checked={columnTagFormState.selectedValues.includes(v)}
                                onChange={e => setColumnTagFormState(s => ({ ...s, selectedValues: e.target.checked ? [...s.selectedValues, v] : s.selectedValues.filter(x => x !== v) }))}
                                className="h-4 w-4"
                              />
                              {v}
                            </label>
                          ))}
                        </div>
                        <p className="font-['IBM_Plex_Sans'] text-[12px] text-[#717182]">{columnTagFormState.selectedValues.length} of {columnValues.length} selected</p>
                      </div>
                    )}
                    <button
                      onClick={handleCreateTagsFromColumn}
                      disabled={!columnTagFormState.columnName || !columnTagFormState.tagName.trim() || columnTagFormState.selectedValues.length === 0 || createTagMutation.isPending}
                      className="flex h-9 w-full items-center justify-center rounded-lg bg-[#030213] font-['IBM_Plex_Sans'] text-[14px] font-medium text-white hover:bg-[#1a1a2e] disabled:opacity-50"
                    >
                      {createTagMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create {columnTagFormState.selectedValues.length} Tag{columnTagFormState.selectedValues.length !== 1 ? 's' : ''}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Existing tags list */}
            {selectedConfigForTags && (
              <div className="rounded-[10px] border border-[rgba(0,0,0,0.1)] bg-white p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-['IBM_Plex_Sans'] text-[15px] font-semibold text-[#0a0a0a]">Existing Tags</h4>
                  <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="h-8 rounded-lg border border-[#e5e5e5] bg-white px-3 text-[13px] text-[#0a0a0a] outline-none focus:ring-2 focus:ring-slate-900/20">
                    <option value="all">All Categories</option>
                    <option value="general">General</option>
                    <option value="department">Department</option>
                    <option value="location">Location</option>
                  </select>
                </div>
                {configTags.length === 0 ? (
                  <p className="text-center font-['IBM_Plex_Sans'] text-[13px] text-[#717182] py-4">No tags created yet for this CRM connection.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {configTags
                      .filter((tag: any) => filterCategory === 'all' || tag.category === filterCategory)
                      .map((tag: any) => (
                        <div key={tag.id} className="flex items-center gap-3 rounded-lg border border-[#e5e5e5] p-3 hover:bg-slate-50">
                          <div className="h-4 w-4 shrink-0 rounded" style={{ backgroundColor: tag.color }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-['IBM_Plex_Sans'] text-[14px] font-medium text-[#0a0a0a]">{tag.name}</span>
                              <span className="inline-flex items-center rounded-[6px] bg-[#eceef2] px-2 py-0.5 text-[11px] text-[#717182]">{tag.category}</span>
                              {tag.categoryValue && <span className="inline-flex items-center rounded-[6px] bg-slate-100 px-2 py-0.5 text-[11px] text-[#717182]">{tag.categoryValue}</span>}
                            </div>
                            {tag.description && <p className="font-['IBM_Plex_Sans'] text-[12px] text-[#717182] mt-0.5">{tag.description}</p>}
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleEditTag(tag)} className="flex h-7 w-7 items-center justify-center rounded-md text-[#717182] hover:bg-slate-100">
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => { if (confirm(`Delete tag "${tag.name}"?`)) deleteTagMutation.mutate(tag.id); }}
                              disabled={deleteTagMutation.isPending}
                              className="flex h-7 w-7 items-center justify-center rounded-md text-[#e11d48] hover:bg-red-50 disabled:opacity-50"
                            >
                              {deleteTagMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* All tags preview */}
            {allTags.length > 0 && (
              <div className="rounded-[10px] border border-[rgba(0,0,0,0.1)] bg-white p-5 flex flex-col gap-3">
                <h4 className="font-['IBM_Plex_Sans'] text-[14px] font-semibold text-[#0a0a0a]">All Tags ({allTags.length})</h4>
                <div className="flex flex-wrap gap-2">
                  {allTags.slice(0, 12).map((tag: any) => (
                    <span key={tag.id} className="inline-flex items-center rounded-[8px] px-3 py-1 text-[13px] font-medium text-white" style={{ backgroundColor: tag.color }}>
                      {tag.name}
                      {tag.category !== 'general' && <span className="ml-1 opacity-75">({tag.category})</span>}
                    </span>
                  ))}
                  {allTags.length > 12 && <span className="inline-flex items-center rounded-[8px] border border-[#e5e5e5] px-3 py-1 text-[13px] text-[#717182]">+{allTags.length - 12} more</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
