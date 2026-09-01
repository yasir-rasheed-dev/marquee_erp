import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-full mx-4' };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-theme-bg-overlay backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${sizes[size]} bg-theme-bg-card border border-theme-border-default rounded-2xl shadow-theme-modal overflow-hidden`}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border-default">
            <h2 className="text-lg font-semibold text-theme-text-primary">{title}</h2>
            <button onClick={onClose}
              className="p-1.5 rounded-lg text-theme-text-muted hover:text-theme-text-primary hover:bg-theme-bg-hover transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

export default Modal;