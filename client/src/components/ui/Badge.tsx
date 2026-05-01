import { clsx } from 'clsx';
import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'safe' | 'caution' | 'high_risk' | 'info' | 'critical' | 'medium' | 'low' | 'high';
  className?: string;
}

const variantMap: Record<string, string> = {
  safe: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
  high: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
  caution: 'bg-amber-50 text-amber-600 border border-amber-200',
  medium: 'bg-amber-50 text-amber-600 border border-amber-200',
  high_risk: 'bg-red-50 text-red-600 border border-red-200',
  critical: 'bg-red-50 text-red-600 border border-red-200',
  low: 'bg-blue-50 text-blue-600 border border-blue-200',
  info: 'bg-blue-50 text-blue-600 border border-blue-200',
};

export function Badge({ children, variant = 'info', className }: BadgeProps) {
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold', variantMap[variant] || variantMap['info'], className)}>
      {children}
    </span>
  );
}
