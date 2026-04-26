import { useCallback, useState } from "react";

export interface DeleteConfirmState {
  id: string;
  label: string;
}

/**
 * Reusable state machine for delete-confirm dialogs.
 * Keeps pages focused on copy/content instead of modal wiring boilerplate.
 */
export function useDeleteWithConfirm(
  onDelete: (id: string, label: string) => Promise<void>,
) {
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const promptDelete = useCallback((id: string, label: string) => {
    setDeleteConfirm({ id, label });
  }, []);

  const clearDeleteConfirm = useCallback(() => {
    setDeleteConfirm(null);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      await onDelete(deleteConfirm.id, deleteConfirm.label);
      clearDeleteConfirm();
    } finally {
      setIsDeleting(false);
    }
  }, [clearDeleteConfirm, deleteConfirm, onDelete]);

  return {
    deleteConfirm,
    isDeleting,
    promptDelete,
    clearDeleteConfirm,
    confirmDelete,
  };
}
