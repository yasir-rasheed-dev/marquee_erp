import React from 'react';

const Card = ({ children, className = '', padding = 'normal', hover = false }) => {
  const paddings = { none: '', small: 'p-3', normal: 'p-5', large: 'p-6' };

  return (
    <div className={`
      bg-theme-bg-card 
      border border-theme-border-default 
      rounded-2xl 
      shadow-theme-card
      ${paddings[padding]}
      ${hover ? 'hover:border-theme-primary hover:shadow-theme-primary-glow hover:-translate-y-0.5 transition-all duration-300 cursor-pointer' : ''}
      ${className}
    `}>
      {children}
    </div>
  );
};

export const CardHeader = ({ title, subtitle, action, icon: Icon }) => (
  <div className="flex items-start justify-between mb-5">
    <div className="flex items-center gap-3">
      {Icon && (
        <div className="w-10 h-10 rounded-xl bg-theme-primary-light flex items-center justify-center shadow-sm">
          <Icon className="w-5 h-5 text-theme-primary" />
        </div>
      )}
      <div>
        <h3 className="text-lg font-bold text-theme-text-primary">{title}</h3>
        {subtitle && <p className="text-sm text-theme-text-muted mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {action && <div>{action}</div>}
  </div>
);

export const CardBody = ({ children, className = '' }) => (
  <div className={`text-theme-text-secondary ${className}`}>{children}</div>
);

export default Card;