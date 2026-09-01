import React from 'react';
import { Loader2 } from 'lucide-react';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-theme-primary/50 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-theme-primary text-theme-text-inverse hover:bg-theme-primary-hover shadow-lg shadow-theme-primary/20',
    secondary: 'bg-theme-secondary text-white hover:bg-theme-secondary-hover',
    outline: 'border-2 border-theme-border-default text-theme-text-primary hover:border-theme-primary hover:text-theme-primary bg-transparent',
    ghost: 'text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-bg-hover',
    danger: 'bg-theme-error text-white hover:bg-red-600',
    success: 'bg-theme-success text-white hover:bg-green-600',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
    icon: 'p-2.5',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
};

export default Button;