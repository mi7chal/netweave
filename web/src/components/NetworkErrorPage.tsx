import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const NetworkErrorPage = () => {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center p-4">
            <div className="flex max-w-md flex-col gap-6 text-center">
                <div className="flex justify-center">
                    <div className="flex items-center justify-center">
                        <AlertTriangle />
                    </div>
                </div>
                <h1>Connection Lost</h1>
                <p>
                    Cannot establish a connection to the Homelab Manager backend.
                    Please ensure the backend server is running and accessible.
                </p>
                <Button
                    size="lg"
                    onClick={() => window.location.reload()}
                >
                    <RefreshCw />
                    Retry Connection
                </Button>
            </div>
        </div>
    );
};
