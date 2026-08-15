import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const baseField =
  'w-full h-11 rounded-lg border border-line-dark bg-white px-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-3/70 focus:border-blue focus:ring-[3px] focus:ring-blue/10 disabled:bg-bg-2 disabled:text-ink-3';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(baseField, className)} {...props} />,
);
Input.displayName = 'Input';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(baseField, 'cursor-pointer', className)} {...props}>
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(baseField, 'h-auto min-h-24 resize-y py-2.5', className)} {...props} />
  ),
);
Textarea.displayName = 'Textarea';

export function Label({ children, htmlFor, required }: { children: React.ReactNode; htmlFor?: string; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-ink-2">
      {children}
      {required && <span className="ml-0.5 text-danger">*</span>}
    </label>
  );
}

export function FieldError({ message, id }: { message?: string; id?: string }) {
  if (!message) return null;
  return (
    <p id={id} role={id ? 'alert' : undefined} className="mt-1.5 text-xs text-danger">
      {message}
    </p>
  );
}

export function FormRow({ children, cols = 2 }: { children: React.ReactNode; cols?: 2 | 3 }) {
  const grid = cols === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2';
  return <div className={cn('grid grid-cols-1 gap-4', grid)}>{children}</div>;
}

export function Field({ children }: { children: React.ReactNode }) {
  return <div className="mb-4">{children}</div>;
}