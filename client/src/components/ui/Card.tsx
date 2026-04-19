import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
  glowing?: boolean;
}

export function Card({ children, className, glowing }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-white/8 bg-[#0d2044]/60 backdrop-blur-sm p-5',
        glowing && 'shadow-[0_0_30px_rgba(26,158,255,0.12)]',
        className
      )}
    >
      {children}
    </div>
  );
}
