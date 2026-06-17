import React from 'react';
import { ChevronRight, ChevronsUpDown, User, LogOut } from 'lucide-react';
import { auth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';

// Maps English sidebar labels to i18n keys so all pages benefit automatically
const NAV_KEY_MAP: Record<string, string> = {
  'Dashboard': 'nav.dashboard',
  'Surveys': 'nav.surveys',
  'Analytics': 'nav.analytics',
  'Team Insights': 'nav.leadership',
  'Action Planning': 'nav.actionPlans',
  'Reports': 'nav.monitoring',
  'Settings': 'nav.settings',
};

interface NavItem {
  label: string;
  icon?: React.ReactNode;
  href?: string;
  children?: NavItem[];
  expanded?: boolean;
}

interface SidebarProps {
  items: NavItem[];
  onNavigate?: (href: string) => void;
  compact?: boolean;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ items, onNavigate, compact = false, onLogout }) => {
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set());
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  const user = auth.getUser();

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleExpanded = (label: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(label)) {
      newExpanded.delete(label);
    } else {
      newExpanded.add(label);
    }
    setExpandedItems(newExpanded);
  };

  const renderNavItem = (item: NavItem, depth: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.label);

    return (
      <div key={item.label}>
        <button
          onClick={() => {
            if (hasChildren) {
              toggleExpanded(item.label);
            } else if (item.href) {
              onNavigate?.(item.href);
            }
          }}
          className={`w-full flex items-center gap-2 h-8 px-2 rounded-lg text-[14px] text-slate-950 hover:bg-slate-100 transition-colors ${depth > 0 ? 'ml-4' : ''}`}
        >
          {item.icon && (
            <span className="w-4 h-4 shrink-0 flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4">
              {item.icon}
            </span>
          )}
          {!compact && <span className="flex-1 text-left truncate">{t(NAV_KEY_MAP[item.label] ?? item.label, { defaultValue: item.label })}</span>}
          {!compact && hasChildren && (
            <ChevronRight className={`w-4 h-4 shrink-0 text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          )}
        </button>
        {hasChildren && isExpanded && !compact && (
          <div className="bg-slate-50">
            {item.children?.map((child) => renderNavItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      className={`${compact ? 'w-16' : 'w-[255px]'} bg-[#fafafa] border-r border-slate-200 flex flex-col h-full shrink-0 transition-all`}
    >
      {/* ── Header: IP logo + brand name ── */}
      <div className="shrink-0 p-2">
        <div className="flex items-center gap-2 p-2">
          {/* IP logo */}
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white text-[14px] font-semibold leading-none select-none">IP</span>
          </div>
          {!compact && (
            <div className="flex flex-col min-w-0">
              <span className="text-[14px] font-medium text-slate-950 leading-[1.5] truncate">
                InsightPulse
              </span>
              <span className="text-[12px] font-medium text-slate-950 leading-[1.4] tracking-[0.03px] truncate">
                Enterprise
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Navigation ── */}
      <div className="flex-1 overflow-y-auto p-2">
        {!compact && (
          <div className="flex items-center h-8 px-2 opacity-70 mb-0">
            <p className="text-[14px] text-slate-950 truncate">{t('nav.navigation', { defaultValue: 'Navigation' })}</p>
          </div>
        )}
        <div className="flex flex-col gap-1">
          {items.map((item) => renderNavItem(item))}
        </div>
      </div>

      {/* ── Footer: user profile (bottom) ── */}
      <div className="shrink-0 p-2" ref={dropdownRef}>
        {/* Dropdown menu */}
        {dropdownOpen && !compact && (
          <div className="mb-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden">
            <button
              onClick={() => { setDropdownOpen(false); onNavigate?.('/profile'); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-[14px] text-slate-900 hover:bg-slate-50 transition-colors"
            >
              <User className="w-4 h-4 text-slate-500" />
              {t('nav.profile', { defaultValue: 'Profile' })}
            </button>
            <div className="h-px bg-slate-100" />
            <button
              onClick={() => { setDropdownOpen(false); auth.logout(); onLogout?.(); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-[14px] text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {t('nav.logout', { defaultValue: 'Logout' })}
            </button>
          </div>
        )}
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          {/* Avatar */}
          <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
            <User className="w-4 h-4 text-slate-500" />
          </div>
          {!compact && (
            <>
              <div className="flex flex-col items-start flex-1 min-w-0">
                <span className="text-[14px] font-medium text-slate-950 leading-[1.5] truncate w-full">
                  {user?.username ?? 'Guest'}
                </span>
                <span className="text-[12px] font-medium text-slate-950 leading-[1.4] tracking-[0.03px] truncate w-full">
                  {user?.email ?? ''}
                </span>
              </div>
              <ChevronsUpDown className="w-4 h-4 text-slate-600 shrink-0" />
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
