/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from 'react';

export interface UseFormOptions<T> {
  onSubmit: (data: T) => Promise<void>;
  onError?: (error: Error) => void;
  initialValues?: Partial<T>;
}

export interface UseFormResult<T> {
  values: T;
  errors: Record<string, string>;
  isSubmitting: boolean;
  setFieldValue: (field: keyof T, value: any) => void;
  setFieldError: (field: string, error: string) => void;
  clearFieldError: (field: string) => void;
  resetForm: () => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

/**
 * Reusable hook for form state management
 * Handles field values, errors, and submission
 */
export function useForm<T extends Record<string, any>>(
  options: UseFormOptions<T>
): UseFormResult<T> {
  const { onSubmit, onError, initialValues } = options;

  const [values, setValues] = useState<T>(
    (initialValues as T) || ({} as T)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setFieldValue = useCallback((field: keyof T, value: any) => {
    setValues((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when user starts typing
    setErrors((prev) => {
      const next = { ...prev };
      delete next[String(field)];
      return next;
    });
  }, []);

  const setFieldError = useCallback((field: string, error: string) => {
    setErrors((prev) => ({
      ...prev,
      [field]: error,
    }));
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const resetForm = useCallback(() => {
    setValues((initialValues as T) || ({} as T));
    setErrors({});
  }, [initialValues]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);

      try {
        await onSubmit(values);
        resetForm();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        if (onError) onError(error);
        console.error('Form submission error:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, onSubmit, resetForm, onError]
  );

  return {
    values,
    errors,
    isSubmitting,
    setFieldValue,
    setFieldError,
    clearFieldError,
    resetForm,
    handleSubmit,
  };
}
