import type { ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

interface GlowingCardProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  glowColor?: 'orange' | 'blue' | 'green' | 'purple';
  delay?: number;
}

export function GlowingCard({
  children,
  className = '',
  glowColor = 'orange',
  delay = 0,
  ...props
}: GlowingCardProps) {
  const glowColors = {
    orange: 'hover:shadow-orange-500/30',
    blue: 'hover:shadow-blue-500/30',
    green: 'hover:shadow-green-500/30',
    purple: 'hover:shadow-purple-500/30',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -6 }}
      className={`relative overflow-hidden rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 hover:border-orange-500/30 transition-all duration-300 shadow-xl ${glowColors[glowColor]} ${className}`}
      {...props}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}
