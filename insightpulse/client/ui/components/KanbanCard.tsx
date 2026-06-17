import React from 'react';
import { Badge } from './Badge';

interface KanbanCardProps {
  title: string;
  description: string;
  owner: string;
  dueDate: string;
  priority?: 'high' | 'medium' | 'low';
}

export const KanbanCard: React.FC<KanbanCardProps> = ({
  title,
  description,
  owner,
  dueDate,
  priority = 'medium',
}) => {
  const priorityVariant =
    priority === 'high' ? 'error' : priority === 'low' ? 'success' : 'warning';

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
        <Badge variant={priorityVariant}>{priority}</Badge>
      </div>
      <p className="mb-4 text-sm text-slate-600">{description}</p>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{owner}</span>
        <span>{dueDate}</span>
      </div>
    </div>
  );
};
