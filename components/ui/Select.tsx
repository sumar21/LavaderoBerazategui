import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  className?: string;
}

export const Select: React.FC<SelectProps> = ({ 
  options, 
  value, 
  onChange, 
  placeholder = "Seleccionar...", 
  label,
  error,
  className = ""
}) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Calculate position and handle scroll/resize
  useLayoutEffect(() => {
    if (open && containerRef.current) {
       const updatePosition = () => {
         if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setPosition({
                top: rect.bottom + 6,
                left: rect.left,
                width: rect.width
            });
         }
       };

       updatePosition();
       
       window.addEventListener('scroll', updatePosition, true);
       window.addEventListener('resize', updatePosition);
       
       return () => {
           window.removeEventListener('scroll', updatePosition, true);
           window.removeEventListener('resize', updatePosition);
       };
    }
  }, [open]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current && 
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    
    if (open) {
        document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const selectedOption = options.find(op => op.value === value);

  const handleToggle = () => {
    if (!open && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setPosition({
            top: rect.bottom + 6,
            left: rect.left,
            width: rect.width
        });
    }
    setOpen(!open);
  };

  return (
    <div className={`w-full relative ${className}`} ref={containerRef}>
      {label && <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">{label}</label>}
      
      <button
        type="button"
        onClick={handleToggle}
        className={`w-full flex items-center justify-between rounded-xl border bg-white px-3 py-2 h-10 text-sm transition-all duration-200 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 shadow-sm hover:border-slate-400 ${
          error ? 'border-red-500' : 'border-slate-300'
        } ${open ? 'border-slate-900 ring-2 ring-slate-900/20' : ''}`}
      >
        <span className={`block truncate ${selectedOption ? "text-slate-900 font-medium" : "text-slate-400"}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`ml-2 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && createPortal(
        <div 
            ref={dropdownRef}
            className="fixed z-[9999] overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-slate-200 border border-slate-200 flex flex-col animate-in fade-in zoom-in-95 duration-100"
            style={{ 
                top: position.top, 
                left: position.left, 
                minWidth: position.width,
                maxWidth: '90vw',
                maxHeight: '300px'
            }}
        >
          <div className="overflow-y-auto flex-1 p-1 custom-scrollbar">
            {options.length === 0 ? (
                <div className="relative cursor-default select-none py-3 px-4 text-center text-slate-500 text-sm">
                No hay opciones.
                </div>
            ) : (
                options.map((option) => (
                <div
                    key={option.value}
                    className={`relative cursor-pointer select-none rounded-lg py-2.5 px-3 transition-colors ${
                        value === option.value ? 'bg-slate-50 text-slate-900' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                    onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                    }}
                >
                    <div className="flex items-center justify-between">
                        <span className={`block truncate text-sm ${value === option.value ? 'font-semibold' : 'font-medium'}`}>
                            {option.label}
                        </span>
                        {value === option.value && (
                            <Check className="h-4 w-4 text-slate-900" />
                        )}
                    </div>
                </div>
                ))
            )}
          </div>
        </div>,
        document.body
      )}
      {error && <p className="mt-1 text-xs text-red-500 font-medium flex items-center gap-1 ml-1">{error}</p>}
    </div>
  );
};
