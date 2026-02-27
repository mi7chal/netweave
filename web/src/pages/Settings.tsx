import { useEffect, useState } from 'react';
import { AppLayout } from '@/layouts/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { fetchApi } from '@/lib/api-client';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';

export function Settings() {
    const [homepagePublic, setHomepagePublic] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchApi<Record<string, string>>('/api/settings')
            .then(data => setHomepagePublic(data.homepage_public === 'true'))
            .finally(() => setLoading(false));
    }, []);

    const handleToggle = async (checked: boolean) => {
        setHomepagePublic(checked);
        try {
            await fetchApi('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ homepage_public: checked }),
            });
            toast.success('Settings updated');
        } catch {
            setHomepagePublic(!checked);
            toast.error('Failed to update settings');
        }
    };

    if (loading) return <AppLayout><div /></AppLayout>;

    return (
        <AppLayout>
            <PageHeader title="Settings" description="Application configuration" />
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl mt-6"
            >
                <div className="bg-card/60 backdrop-blur-xl border border-border/40 rounded-2xl p-6 space-y-6">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                                <Globe className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <Label htmlFor="homepage-public" className="text-base font-semibold">
                                    Public Homepage
                                </Label>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    Allow unauthenticated users to view the dashboard homepage
                                </p>
                            </div>
                        </div>
                        <Switch
                            id="homepage-public"
                            checked={homepagePublic}
                            onCheckedChange={handleToggle}
                        />
                    </div>
                </div>
            </motion.div>
        </AppLayout>
    );
}
