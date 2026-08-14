
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
}

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  description, 
  children, 
  footer,
  maxWidth = 'lg' 
}) => {
  const [show, setShow] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setShow(true);
      document.body.style.overflow = 'hidden';
    } else {
      const timer = setTimeout(() => setShow(false), 200);
      document.body.style.overflow = 'unset';
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!show) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${maxWidthClasses[maxWidth]} max-h-[95vh] sm:max-h-[90vh] transform rounded-2xl bg-white p-4 sm:p-6 shadow-2xl transition-transform duration-200 ease-out ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'} flex flex-col`}>
        <div className="flex items-start justify-between mb-4 shrink-0">
          <div className="pr-8">
            <h3 className="text-lg font-bold leading-tight text-slate-900">{title}</h3>
            {description && <p className="mt-1 text-xs sm:text-sm text-slate-500">{description}</p>}
          </div>
          <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-2 hover:bg-slate-100 transition-colors bg-slate-50">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>
        <div className="mt-2 flex-1 overflow-y-auto custom-scrollbar min-h-0 px-1">
          {children}
        </div>
        {footer && (
          <div className="mt-6 flex flex-col sm:flex-row justify-end gap-2 sm:space-x-3 border-t pt-4 border-slate-100 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
