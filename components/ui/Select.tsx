import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { Z } from './zLayers';
import { capitalizeFirst } from '../../utils/text';

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
      {label && <label className="block text-sm font-semibold text-foreground mb-1.5 ml-1">{label}</label>}
      
      <button
        type="button"
        onClick={handleToggle}
        className={`w-full flex items-center justify-between rounded-md border bg-card px-3 py-2 h-10 text-sm transition-all duration-200 focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring/20 shadow-sm hover:border-ring ${
          error ? 'border-red-500' : 'border-border'
        } ${open ? 'border-primary ring-2 ring-ring/20' : ''}`}
      >
        <span className={`block truncate ${selectedOption ? "text-foreground font-medium" : "text-muted-foreground"}`}>
          {selectedOption ? capitalizeFirst(selectedOption.label) : placeholder}
        </span>
        <ChevronDown className={`ml-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && createPortal(
        <div 
            ref={dropdownRef}
            className="fixed overflow-hidden rounded-md bg-card shadow-xl ring-1 ring-border border border-border flex flex-col animate-in fade-in zoom-in-95 duration-100"
            style={{
                zIndex: Z.popover,
                top: position.top, 
                left: position.left, 
                // width, not minWidth — see the same note in Combobox.tsx.
                width: position.width,
                maxHeight: '300px'
            }}
        >
          <div className="overflow-y-auto flex-1 p-1 custom-scrollbar">
            {options.length === 0 ? (
                <div className="relative cursor-default select-none py-3 px-4 text-center text-muted-foreground text-sm">
                No hay opciones.
                </div>
            ) : (
                options.map((option) => (
                <div
                    key={option.value}
                    className={`relative cursor-pointer select-none rounded-lg py-2.5 px-3 transition-colors ${
                        value === option.value ? 'bg-muted text-foreground' : 'hover:bg-accent text-foreground'
                    }`}
                    onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                    }}
                >
                    <div className="flex items-center gap-2">
                        <span className={`min-w-0 flex-1 truncate text-sm ${value === option.value ? 'font-semibold' : 'font-medium'}`}>
                            {capitalizeFirst(option.label)}
                        </span>
                        {/* Fixed slot, always rendered: every label truncates at the same x, and shrink-0 keeps a long neighbour from squashing the tick — a flex item without it is compressed below its own w-4. */}
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                                {value === option.value && <Check className="h-4 w-4 text-foreground" />}
                            </span>
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
