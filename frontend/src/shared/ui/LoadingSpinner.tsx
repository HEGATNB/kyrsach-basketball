import React from 'react';
import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  fullScreen = false, 
  size = 'md' 
}) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  };

  const spinner = (
    <div className="flex items-center justify-center">
      <motion.div
        className={`${sizes[size]} rounded-full border-4 border-[rgba(232,161,67,0.22)] border-t-[var(--accent)]`}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(9,6,4,0.66)] backdrop-blur-sm">
        {spinner}
      </div>
    );
  }

  return spinner;
};
