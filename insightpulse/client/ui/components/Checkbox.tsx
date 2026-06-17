import React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';

interface CheckboxProps extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  label?: string;
  id?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({ label, id = `checkbox-${Math.random()}`, ...props }) => {
  return (
    <div className="flex items-center">
      <CheckboxPrimitive.Root
        id={id}
        className="w-4 h-4 rounded border border-slate-300 bg-white data-[state=checked]:bg-slate-900 data-[state=checked]:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition"
        {...props}
      >
        <CheckboxPrimitive.Indicator className="flex items-center justify-center text-white">
          <Check className="w-3 h-3" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {label && (
        <label htmlFor={id} className="ml-2 text-sm text-slate-700 cursor-pointer">
          {label}
        </label>
      )}
    </div>
  );
};
