import { cn } from '@/lib/utils';
import { type ButtonHTMLAttributes, type HTMLAttributes, forwardRef } from 'react';

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl border border-white/5 bg-bg-card p-5 shadow-lg shadow-black/20',
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40',
        {
          'bg-accent text-white hover:bg-accent/90 shadow-lg shadow-accent/20':
            variant === 'primary',
          'bg-white/5 text-gray-100 hover:bg-white/10 border border-white/10':
            variant === 'secondary',
          'text-gray-400 hover:text-gray-100 hover:bg-white/5': variant === 'ghost',
          'bg-red-500/90 text-white hover:bg-red-500': variant === 'danger',
        },
        {
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-4 py-2 text-sm': size === 'md',
          'px-6 py-3 text-base': size === 'lg',
        },
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';

export function Badge({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-medium text-gray-300',
        className,
      )}
      {...props}
    />
  );
}
