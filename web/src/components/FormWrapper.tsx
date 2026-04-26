import React from 'react';

export interface FormWrapperProps {
  onSubmit: (e: React.FormEvent) => Promise<void>;
  isSubmitting?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Reusable form wrapper that handles common form patterns
 */
export function FormWrapper({
  onSubmit,
  isSubmitting = false,
  children,
  className,
}: FormWrapperProps) {
  return (
    <form onSubmit={onSubmit} className={className}>
      <fieldset disabled={isSubmitting}>{children}</fieldset>
    </form>
  );
}

export interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

/**
 * Reusable form field wrapper with label and error handling
 */
export function FormField({
  label,
  error,
  required,
  children,
}: FormFieldProps) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
