import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Server, LogIn, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fetchApi } from '@/lib/api-client';

export function Login() {
    const { login, isAuthenticated } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [oidcEnabled, setOidcEnabled] = useState(false);

    useEffect(() => {
        const checkOidc = async () => {
            try {
                const data = await fetchApi<{ oidc_enabled: boolean }>('/api/auth/check-oidc', { silent: true });
                setOidcEnabled(data.oidc_enabled);
            } catch {
                // Error is handled by api-client toast/backend down detection
            }
        };
        checkOidc();
    }, []);

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            window.location.href = '/dashboard';
        }
    }, [isAuthenticated]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            await login(username, password);
        } catch {
            setError('Invalid username or password');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.2),rgba(255,255,255,0))] pointer-events-none" />
            <div className="absolute inset-0 bg-premium-grid [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-30 pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="w-full max-w-md mx-4 z-10"
            >
                <div className="bg-card/60 backdrop-blur-xl border border-border/40 rounded-2xl shadow-2xl p-8 space-y-8">
                    {/* Logo */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-[0_0_30px_rgba(120,119,198,0.25)]">
                            <div className="absolute inset-0 bg-primary/10 rounded-2xl blur-xl" />
                            <Server className="h-8 w-8 text-primary relative z-10" />
                        </div>
                        <div className="text-center space-y-1">
                            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">
                                NetWeave
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Sign in to your dashboard
                            </p>
                        </div>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="username" className="text-sm font-medium text-muted-foreground">
                                Username
                            </Label>
                            <Input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter your username"
                                required
                                autoFocus
                                className="h-11 bg-background/50 border-border/50 focus:border-primary/50 rounded-xl transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-medium text-muted-foreground">
                                Password
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                                className="h-11 bg-background/50 border-border/50 focus:border-primary/50 rounded-xl transition-all"
                            />
                        </div>

                        {error && (
                            <motion.p
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-sm text-destructive text-center font-medium"
                            >
                                {error}
                            </motion.p>
                        )}

                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30"
                        >
                            <LogIn className="h-4 w-4 mr-2" />
                            {isSubmitting ? 'Signing in...' : 'Sign In'}
                        </Button>
                    </form>

                    {/* OIDC Login */}
                    {oidcEnabled && (
                        <div className="space-y-4">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-border/40" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-card/60 px-3 text-muted-foreground font-medium">or</span>
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => { window.location.href = '/api/auth/login'; }}
                                className="w-full h-11 rounded-xl border-border/50 hover:bg-primary/5 hover:border-primary/30 transition-all"
                            >
                                <Shield className="h-4 w-4 mr-2" />
                                Sign in with SSO
                            </Button>
                        </div>
                    )}
                </div>

                {/* Copyright Footer */}
                <div className="w-full mt-8 pt-8 flex justify-center opacity-30 hover:opacity-100 transition-opacity duration-300">
                    <a
                        href="https://github.com/mi7chal"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/40 hover:bg-background/80 hover:shadow-sm border border-transparent hover:border-border/30 transition-all duration-300 text-muted-foreground hover:text-primary group"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-3.5 w-3.5 group-hover:scale-110 transition-transform duration-300"
                        >
                            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                            <path d="M9 18c-4.51 2-5-2-7-2" />
                        </svg>
                        <span className="text-[11px] font-medium tracking-wide">© 2026 mi7chal</span>
                    </a>
                </div>
            </motion.div>
        </div>
    );
}
