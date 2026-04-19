import { clsx } from 'clsx';
import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'safe' | 'caution' | 'high_risk' | 'info' | 'critical' | 'medium' | 'low' | 'high';
  className?: string;
}

const variantMap: Record<string, string> = {
  safe: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40',
  high: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40',
  caution: 'bg-amber-500/15 text-amber-400 border border-amber-500/40',
  medium: 'bg-amber-500/15 text-amber-400 border border-amber-500/40',
  high_risk: 'bg-red-500/15 text-red-400 border border-red-500/40',
  critical: 'bg-red-500/15 text-red-400 border border-red-500/40',
  low: 'bg-blue-500/15 text-blue-400 border border-blue-500/40',
  info: 'bg-blue-500/15 text-blue-400 border border-blue-500/40',
};

export function Badge({ children, variant = 'info', className }: BadgeProps) {
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold', variantMap[variant] || variantMap['info'], className)}>
      {children}
    </span>
  );
}
