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
        'rounded-xl border border-gray-100 bg-white p-5 shadow-sm',
        glowing && 'shadow-md ring-1 ring-gray-200',
        className
      )}
    >
      {children}
    </div>
  );
}
