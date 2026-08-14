import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, X, Search } from 'lucide-react';
import { Badge } from './Badge';

interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  className?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({ 
  options, 
  value, 
  onChange, 
  placeholder = "Seleccionar...", 
  label,
  error,
  className = ""
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Focus input on open
  useEffect(() => {
    if (open && inputRef.current) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const handleSelect = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter(v => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  const handleRemove = (e: React.MouseEvent, optionValue: string) => {
    e.stopPropagation();
    onChange(value.filter(v => v !== optionValue));
  };

  const filteredOptions = options.filter(option => {
    const label = String(option.label || '');
    const val = String(option.value || '');
    const search = searchTerm.toLowerCase();
    return label.toLowerCase().includes(search) ||
           val.toLowerCase().includes(search);
  });

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
        className={`w-full flex items-center justify-between rounded-xl border bg-white px-3 py-2 min-h-[40px] text-sm transition-all duration-200 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 shadow-sm hover:border-slate-400 ${
          error ? 'border-red-500' : 'border-slate-300'
        } ${open ? 'border-slate-900 ring-2 ring-slate-900/20' : ''}`}
      >
        <div className="flex flex-wrap gap-1 items-center overflow-hidden">
          {value.length === 0 ? (
            <span className="text-slate-400">{placeholder}</span>
          ) : (
            value.map(v => {
              const option = options.find(o => o.value === v);
              return (
                <span key={v} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                  {option ? option.label : v}
                  <X 
                    className="ml-1 h-3 w-3 cursor-pointer hover:text-slate-500" 
                    onClick={(e) => handleRemove(e, v)}
                  />
                </span>
              );
            })
          )}
        </div>
        <ChevronDown className={`ml-2 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && createPortal(
        <div 
            ref={dropdownRef}
            className="fixed z-[9999] overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-slate-200 border border-slate-200 flex flex-col animate-in fade-in zoom-in-95 duration-100"
            style={{ 
                top: position.top, 
                left: position.left, 
                width: position.width,
                maxHeight: '300px'
            }}
        >
          {/* Search Input */}
          <div className="flex items-center px-3 border-b border-slate-50 sticky top-0 bg-white z-10">
             <Search className="h-4 w-4 shrink-0 text-slate-400 mr-2" />
             <input
                ref={inputRef}
                type="text"
                className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-50 font-medium"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoComplete="off"
             />
          </div>

          <div className="overflow-y-auto flex-1 p-1 custom-scrollbar">
            {filteredOptions.length === 0 ? (
                <div className="relative cursor-default select-none py-3 px-4 text-center text-slate-500 text-sm">
                No hay opciones.
                </div>
            ) : (
                filteredOptions.map((option) => {
                  const isSelected = value.includes(option.value);
                  return (
                    <div
                        key={option.value}
                        className={`relative cursor-pointer select-none rounded-lg py-2.5 px-3 transition-colors ${
                            isSelected ? 'bg-slate-50 text-slate-900' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                        onClick={() => handleSelect(option.value)}
                    >
                        <div className="flex items-center justify-between">
                            <span className={`block truncate text-sm ${isSelected ? 'font-semibold' : 'font-medium'}`}>
                                {option.label}
                            </span>
                            {isSelected && (
                                <Check className="h-4 w-4 text-slate-900" />
                            )}
                        </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>,
        document.body
      )}
      {error && <p className="mt-1 text-xs text-red-500 font-medium flex items-center gap-1 ml-1">{error}</p>}
    </div>
  );
};
