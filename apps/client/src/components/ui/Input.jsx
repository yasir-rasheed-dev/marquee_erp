import React, { forwardRef } from 'react';

const Input = forwardRef(({ label, error, icon: Icon, className = '', ...props }, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-theme-text-secondary mb-1.5">{label}</label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-text-muted" />
        )}
        <input
          ref={ref}
          className={`w-full bg-theme-bg-input text-theme-text-primary placeholder:text-theme-text-muted
            border border-theme-border-default rounded-xl
            focus:outline-none focus:border-theme-border-focus focus:ring-1 focus:ring-theme-border-focus/30
            transition-all duration-200
            ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-2.5
            ${error ? 'border-theme-error focus:border-theme-error focus:ring-theme-error/30' : ''}
            ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-theme-error">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;