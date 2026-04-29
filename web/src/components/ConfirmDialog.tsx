import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ReactNode } from "react";

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void | Promise<void>;
    title: string;
    description: ReactNode;
    confirmLabel?: string;
    isSubmitting?: boolean;
    submittingLabel?: string;
}

export function ConfirmDialog({
    open,
    onOpenChange,
    onConfirm,
    title,
    description,
    confirmLabel = "Confirm",
    isSubmitting = false,
    submittingLabel = "Working...",
}: ConfirmDialogProps) {
    return (
        <AlertDialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (isSubmitting && !nextOpen) return;
                onOpenChange(nextOpen);
            }}
        >
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        disabled={isSubmitting}
                        onClick={(event) => {
                            event.preventDefault();
                            void Promise.resolve(onConfirm()).catch(() => {
                                // Callers handle user-facing errors (toasts/messages).
                            });
                        }}
                    >
                        {isSubmitting ? submittingLabel : confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
