import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ErrorStateProps {
    message?: string;
    onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
    return (
        <Alert className="mt-6">
            <AlertCircle />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>
                There was a problem communicating with the server.{message && ` ${message}`}
            </AlertDescription>
            {onRetry && (
                <Button variant="ghost" className="mt-4 gap-2" onClick={onRetry}>
                    <RefreshCw className="h-4 w-4" /> Try again
                </Button>
            )}
        </Alert>
    );
}
