import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  value,
  onChange,
  className = '',
  id,
  ...props
}) => {
  const selectId = id || `select-${Math.random()}`;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="mb-2 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={`w-full appearance-none rounded-md border border-slate-300 bg-white px-3 py-2 pr-10 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 ${className}`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      </div>
    </div>
  );
};
