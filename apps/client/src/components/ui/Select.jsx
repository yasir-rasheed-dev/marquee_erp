import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

const Select = forwardRef(({ label, error, options, className = '', ...props }, ref) => {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-theme-text-secondary mb-1.5">{label}</label>}
      <div className="relative">
        <select ref={ref}
          className={`w-full appearance-none bg-theme-bg-input text-theme-text-primary
            border border-theme-border-default rounded-xl
            focus:outline-none focus:border-theme-border-focus focus:ring-1 focus:ring-theme-border-focus/30
            transition-all duration-200 pl-4 pr-10 py-2.5
            ${error ? 'border-theme-error focus:border-theme-error' : ''} ${className}`}
          {...props}>
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-theme-bg-card">{opt.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-text-muted pointer-events-none" />
      </div>
      {error && <p className="mt-1 text-xs text-theme-error">{error}</p>}
    </div>
  );
});

Select.displayName = 'Select';
export default Select;