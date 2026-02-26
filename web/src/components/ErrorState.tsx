import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
    message?: string;
    onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
    return (
        <div className="text-center py-20 bg-destructive/5 backdrop-blur-md border border-destructive/20 rounded-3xl mt-6 shadow-sm">
            <AlertCircle className="h-12 w-12 text-destructive/40 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground">Something went wrong</h3>
            <p className="text-sm text-muted-foreground mt-1">
                There was a problem communicating with the server.{message && ` ${message}`}
            </p>
            {onRetry && (
                <Button variant="ghost" className="mt-4 gap-2 text-primary" onClick={onRetry}>
                    <RefreshCw className="h-4 w-4" /> Try again
                </Button>
            )}
        </div>
    );
}
