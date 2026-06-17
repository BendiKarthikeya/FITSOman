import React from 'react';
import { Calendar } from 'lucide-react';

interface DateRangePickerProps {
  label?: string;
  value: string;
  onClick?: () => void;
  onChange?: (value: string) => void;
  className?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  label,
  value,
  onClick,
  onChange,
  className = '',
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {label && <p className="mb-2 text-sm font-medium text-slate-700">{label}</p>}
      <div className="relative">
        <input
          type="date"
          value={value}
          onChange={handleChange}
          onClick={onClick}
          className="flex w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
        />
        <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
      </div>
    </div>
  );
};
