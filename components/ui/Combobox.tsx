import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { Z } from './zLayers';
import { capitalizeFirst } from '../../utils/text';

interface Option {
  value: string;
  label: string;
  description?: string;
}

interface ComboboxProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
}

export const Combobox: React.FC<ComboboxProps> = ({ 
  options, 
  value, 
  onChange, 
  placeholder = "Seleccionar...", 
  label,
  error,
  disabled = false
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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

  // Focus input on open
  useEffect(() => {
    if (open && inputRef.current) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const filteredOptions = options.filter(option => {
    const label = String(option.label || '');
    const val = String(option.value || '');
    const desc = String(option.description || '');
    const search = searchTerm.toLowerCase();
    return label.toLowerCase().includes(search) ||
           val.toLowerCase().includes(search) ||
           desc.toLowerCase().includes(search);
  });

  const selectedOption = options.find(op => op.value === value);

  const handleToggle = () => {
    if (disabled) return;
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
    <div className="w-full relative" ref={containerRef}>
      {/* The kit's field label, DESIGN.md:554 — same element the Input renders.
          It used to be text-sm/semibold with mb-1.5, which sat 6px taller and
          pushed this control below any Input beside it in a grid. */}
      {label && <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>}
      
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`w-full flex items-center justify-between rounded-md border bg-card px-3 py-2.5 h-10 text-sm transition-all duration-200 focus:outline-none shadow-sm ${
          disabled 
            ? 'bg-muted text-muted-foreground cursor-not-allowed border-border opacity-60' 
            : `hover:border-ring focus:border-primary focus:ring-2 focus:ring-ring/20 ${error ? 'border-red-500' : 'border-border'} ${open ? 'border-primary ring-2 ring-ring/20' : ''}`
        }`}
      >
        <span className={`block truncate ${selectedOption ? "text-foreground font-medium" : "text-muted-foreground"}`}>
          {selectedOption 
            ? capitalizeFirst(selectedOption.label)
            : placeholder}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground opacity-50" />
      </button>

      {open && createPortal(
        <div 
            ref={dropdownRef}
            className="fixed overflow-hidden rounded-md bg-card shadow-xl ring-1 ring-border border border-border flex flex-col animate-in fade-in zoom-in-95 duration-100"
            style={{
                zIndex: Z.popover,
                top: position.top, 
                left: position.left, 
                // width, not minWidth: the panel matches the trigger exactly. With
                // minWidth a single long option stretched it past the field it
                // belongs to. Every option already truncates, so nothing is lost.
                width: position.width,
                maxHeight: '300px'
            }}
        >
          {/* Clean Search Input */}
          <div className="flex items-center px-3 border-b border-border sticky top-0 bg-card z-10">
             <Search className="h-4 w-4 shrink-0 text-muted-foreground mr-2" />
             <input
                ref={inputRef}
                type="text"
                className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 font-medium"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoComplete="off"
             />
          </div>
          
          <div className="overflow-y-auto flex-1 p-1 custom-scrollbar">
            {filteredOptions.length === 0 ? (
                <div className="relative cursor-default select-none py-3 px-4 text-center text-muted-foreground text-sm">
                No se encontraron resultados.
                </div>
            ) : (
                filteredOptions.map((option, index) => (
                <div
                    key={`${option.value}-${index}`}
                    className={`relative cursor-pointer select-none rounded-md py-2.5 px-3 transition-colors ${
                        value === option.value ? 'bg-muted text-foreground' : 'hover:bg-accent text-foreground'
                    }`}
                    onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                        setSearchTerm("");
                    }}
                >
                    <div className="flex items-center gap-2">
                        <div className="flex min-w-0 flex-1 flex-col">
                            <span className={`min-w-0 flex-1 truncate text-sm ${value === option.value ? 'font-semibold' : 'font-medium'}`}>
                                {capitalizeFirst(option.label)}
                            </span>
                            {option.description && (
                                <span className="block truncate text-xs text-muted-foreground mt-0.5">
                                    {option.description}
                                </span>
                            )}
                        </div>
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
