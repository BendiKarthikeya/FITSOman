import React from 'react';
import { FileCheck, BarChart3, Plus, FileText, Zap } from 'lucide-react';

interface QuickActionsProps {
  onNavigate?: (path: string) => void;
}

const actions = [
  { label: 'View Analytics', path: '/analytics', icon: BarChart3 },
  { label: 'Create Survey', path: '/surveys', icon: Plus },
  { label: 'Export Report', path: '/reports', icon: FileText },
  { label: 'Action Board', path: '/actionPlanningBoard', icon: Zap },
];

export const QuickActions: React.FC<QuickActionsProps> = ({ onNavigate }) => {
  const handleActionClick = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Title */}
      <p className="font-medium text-[14px] leading-[1.5] text-slate-900">
        Quick Actions
      </p>

      {/* Action buttons */}
      <div className="flex gap-4 h-[45px] items-center w-full">
        {actions.map((action) => {
          const IconComponent = action.icon;
          return (
            <div
              key={action.label}
              className="flex flex-row items-center self-stretch"
            >
              <button
                onClick={() => handleActionClick(action.path)}
                className="bg-white border border-slate-100 flex gap-0 h-full items-center justify-center p-3 rounded-lg shadow-sm cursor-pointer hover:bg-slate-50 transition-colors active:bg-slate-100"
                data-name="Card"
              >
                <div className="flex gap-3 items-center px-1">
                  <IconComponent className="w-[18px] h-[18px] text-slate-500" />
                  <p className="font-medium leading-[1.5] text-[14px] text-slate-500 whitespace-nowrap">
                    {action.label}
                  </p>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
