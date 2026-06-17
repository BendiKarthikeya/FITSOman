import React from 'react';

interface TabsProps {
  items: string[];
  /** Optional translated display labels (same length as items). Falls back to items[i] if not provided. */
  labels?: string[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ items, labels, value, onChange, className = '' }) => {
  return (
    <div className={`inline-flex items-center rounded-md border border-slate-200 bg-slate-50 p-1 ${className}`}>
      {items.map((item, i) => {
        const active = item === value;
        const displayLabel = labels?.[i] ?? item;
        return (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={`rounded-sm px-3 py-1.5 text-sm transition-colors ${
              active
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {displayLabel}
          </button>
        );
      })}
    </div>
  );
};
