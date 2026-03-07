import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export function AuthCallback() {
    const [searchParams] = useSearchParams();

    useEffect(() => {
        // The OIDC provider redirected us to the root /auth/callback but the backend handles it at /api/auth/callback.
        // We forward the user to the backend so it can set the session cookies and redirect to /.
        window.location.href = `/api/auth/callback?${searchParams.toString()}`;
    }, [searchParams]);

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground text-sm font-medium">Completing authentication...</p>
        </div>
    );
}
