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
        <div className="flex min-h-svh w-full flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin" />
            <p>Completing authentication...</p>
        </div>
    );
}
