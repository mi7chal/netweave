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

export interface FormInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

/**
 * Reusable form input with label and error
 */
export function FormInput({
  label,
  error,
  required,
  className,
  ...props
}: FormInputProps) {
  return (
    <FormField label={label} error={error} required={required}>
      <input
        className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          error ? 'border-destructive focus-visible:ring-destructive' : ''
        } ${className || ''}`}
        {...props}
      />
    </FormField>
  );
}
