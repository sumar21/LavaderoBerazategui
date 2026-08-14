
import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">{label}</label>}
        <input
          ref={ref}
          className={`
            flex h-10 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900
            placeholder:text-slate-400 
            focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20
            disabled:cursor-not-allowed disabled:opacity-50
            transition-all duration-200 shadow-sm hover:border-slate-400
            appearance-none
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
            ${className}
          `}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-500 font-medium ml-1">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
