import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const NetworkErrorPage = () => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4">
            <div className="max-w-md text-center space-y-6">
                <div className="flex justify-center">
                    <div className="h-24 w-24 rounded-full bg-destructive/10 flex items-center justify-center">
                        <AlertTriangle className="h-12 w-12 text-destructive" />
                    </div>
                </div>
                <h1 className="text-3xl font-bold tracking-tight">Connection Lost</h1>
                <p className="text-muted-foreground text-lg">
                    Cannot establish a connection to the Homelab Manager backend.
                    Please ensure the backend server is running and accessible.
                </p>
                <Button
                    size="lg"
                    onClick={() => window.location.reload()}
                    className="gap-2"
                >
                    <RefreshCw className="h-4 w-4" />
                    Retry Connection
                </Button>
            </div>
        </div>
    );
};
