import React from 'react';
import { Images } from '../../assets/images';

interface LogoProps {
  className?: string;
  showText?: boolean;
  variant?: 'light' | 'dark'; // light = for dark backgrounds (default), dark = for light backgrounds
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({ className = "", showText = true, variant = 'light', size = 'md' }) => {
  
  const sizeClasses = {
    sm: "h-8",
    md: "h-12", // Ajustado para mejor proporción en el sidebar
    lg: "h-20"
  };

  // variant 'dark' means "sits on a themed surface": the artwork is white, so it
  // is inverted in light mode and left alone in dark mode. That has to be a
  // class, not an inline style — an inline filter cannot react to the theme, and
  // the inverted mark would disappear into a dark surface.
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src={Images.GAMMA_LOGO_WHITE}
        alt="Lavadero Berazategui"
        className={`object-contain ${sizeClasses[size]} ${variant === 'dark' ? 'brand-art-on-surface' : ''}`}
      />
    </div>
  );
};