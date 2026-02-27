import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Server, LogIn, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function Login() {
    const { login, isAuthenticated } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [oidcEnabled, setOidcEnabled] = useState(false);

    useEffect(() => {
        fetch('/auth/check-oidc')
            .then(r => r.json())
            .then(data => setOidcEnabled(data.oidc_enabled))
            .catch(() => { });
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
        } catch (err) {
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
                                onClick={() => { window.location.href = '/auth/login'; }}
                                className="w-full h-11 rounded-xl border-border/50 hover:bg-primary/5 hover:border-primary/30 transition-all"
                            >
                                <Shield className="h-4 w-4 mr-2" />
                                Sign in with SSO
                            </Button>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
