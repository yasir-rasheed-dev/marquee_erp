import React from 'react';

const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizes = { sm: 'w-5 h-5 border-2', md: 'w-8 h-8 border-[3px]', lg: 'w-12 h-12 border-4', xl: 'w-16 h-16 border-4' };
  return (
    <div className={`inline-block ${sizes[size]} rounded-full border-theme-bg-elevated border-t-theme-primary animate-spin ${className}`} />
  );
};

export default LoadingSpinner;