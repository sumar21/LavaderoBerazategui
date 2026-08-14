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

  // Logic for variant 'dark' (used on light backgrounds like Login):
  // 1. invert(1): Turns White text to Black.
  // 2. hue-rotate(180deg): Adjusts the inverted colors to look decent on white.
  const imageStyle: React.CSSProperties = variant === 'dark' 
    ? { filter: 'invert(1) hue-rotate(180deg)' } 
    : {};

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img 
        src={Images.GAMMA_LOGO_WHITE} 
        alt="Lavadero Berazategui" 
        className={`object-contain ${sizeClasses[size]}`}
        style={imageStyle}
      />
    </div>
  );
};