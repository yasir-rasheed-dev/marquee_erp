import React from 'react';

const Badge = ({ children, variant = 'default', size = 'sm', className = '' }) => {
  const variants = {
    default: 'bg-theme-bg-elevated text-theme-text-secondary border-theme-border-default',
    primary: 'bg-theme-primary-light text-theme-primary border-theme-primary/20',
    success: 'bg-theme-success-light text-theme-success border-theme-success/20',
    warning: 'bg-theme-warning-light text-theme-warning border-theme-warning/20',
    error: 'bg-theme-error-light text-theme-error border-theme-error/20',
    info: 'bg-theme-info-light text-theme-info border-theme-info/20',
  };
  const sizes = { sm: 'px-2 py-0.5 text-[10px]', md: 'px-2.5 py-1 text-xs', lg: 'px-3 py-1.5 text-sm' };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-medium ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;