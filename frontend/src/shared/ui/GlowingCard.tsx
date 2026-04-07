import type { ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

interface GlowingCardProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  glowColor?: 'orange' | 'blue' | 'green' | 'purple';
  delay?: number;
}

const glowStyles = {
  orange: 'border-[rgba(232,161,67,0.2)] shadow-[0_18px_48px_rgba(79,50,25,0.22)]',
  blue: 'border-[rgba(255,235,206,0.08)] shadow-[0_18px_44px_rgba(0,0,0,0.22)]',
  green: 'border-[rgba(201,121,43,0.14)] shadow-[0_18px_46px_rgba(79,50,25,0.18)]',
  purple: 'border-[rgba(255,255,255,0.06)] shadow-[0_18px_44px_rgba(0,0,0,0.28)]',
};

export function GlowingCard({
  children,
  className = '',
  glowColor = 'orange',
  delay = 0,
  ...props
}: GlowingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      whileHover={{ y: -1 }}
      className={`group relative overflow-hidden rounded-[20px] border bg-[var(--surface-strong)] backdrop-blur-xl ${glowStyles[glowColor]} ${className}`}
      {...props}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,161,67,0.07),transparent_32%),linear-gradient(180deg,rgba(255,247,234,0.03),transparent_18%,transparent_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(255,239,214,0.12)] to-transparent" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
