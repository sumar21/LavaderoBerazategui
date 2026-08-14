
import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'secondary' | 'danger' | 'warning' | 'success' | 'purple' | 'orange' | 'indigo';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: "bg-blue-50 text-blue-700 border border-blue-100",
    secondary: "bg-slate-50 text-slate-700 border border-slate-100",
    outline: "text-slate-700 border border-slate-200 bg-white",
    danger: "bg-red-50 text-red-700 border border-red-100",
    warning: "bg-amber-50 text-amber-700 border border-amber-100",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-100",
    purple: "bg-purple-50 text-purple-700 border border-purple-100",
    orange: "bg-orange-50 text-orange-700 border border-orange-100",
    indigo: "bg-indigo-50 text-indigo-700 border border-indigo-100",
  };

  return (
    <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};
