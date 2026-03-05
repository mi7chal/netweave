import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { Plus, Trash2, RefreshCw, Settings2 } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import { AppLayout } from "../layouts/AppLayout";
import { fetchApi } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { AddIntegrationDialog } from "../components/AddIntegrationDialog";
import { toast } from "sonner";
import type { Integration } from "@/types/api";
import { PageHeader } from "@/components/PageHeader";


export const Integrations = () => {
    const [refreshInterval, setRefreshInterval] = useState(5000);
    const { data: integrations = [], error, isLoading, mutate } = useSWR<Integration[]>("/api/integrations", fetchApi, {
        refreshInterval,
        onSuccess: (data) => {
            const hasActiveWork = data.some(i => i.status === "SYNCING" || i.status === "PENDING");
            setRefreshInterval(hasActiveWork ? 1000 : 5000);
        },
    });
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [syncingId, setSyncingId] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

    const handleDelete = async (id: string) => {
        try {
            await fetchApi(`/api/integrations/${id}`, { method: "DELETE" });
            setDeleteConfirm(null);
            mutate();
        } catch (e) { console.error(e); }
    };

    const handleSync = async (id: string, name: string) => {
        setSyncingId(id);
        const startTime = Date.now();
        try {
            await fetchApi(`/api/integrations/${id}/sync`, { method: "POST" });
            mutate();
        } catch (e) {
            console.error(e);
            toast.error(`Sync failed for ${name}`, { description: "Check server logs for more details." });
        } finally {
            const remaining = Math.max(0, 800 - (Date.now() - startTime));
            setTimeout(() => setSyncingId(null), remaining);
        }
    };

    const handleDialogClose = (open: boolean) => {
        setIsDialogOpen(open);
        if (!open) mutate();
    };

    return (
        <AppLayout>
            <div className="flex flex-col space-y-6">
                <PageHeader title="Integrations" description="Manage external connections (AdGuard, Unifi, Kea).">
                    <Button onClick={() => setIsDialogOpen(true)} className="gap-2 shadow-sm rounded-full h-10 px-5 flex-shrink-0 hover:scale-105 transition-all duration-300">
                        <Plus className="h-4 w-4" /> Add Integration
                    </Button>
                </PageHeader>

                {isLoading ? <LoadingState /> : error ? <ErrorState message={error.message} onRetry={() => mutate()} /> : integrations.length === 0 ? (
                    <EmptyState icon={Settings2} title="No integrations found" description="Add your first provider to start syncing." />
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {integrations.map((int) => {
                            const isSyncing = syncingId === int.id || int.status === "SYNCING";
                            return (
                                <Card key={int.id} className="group relative overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-white/40 dark:border-white/10 bg-gradient-to-br from-white/60 to-white/30 dark:from-white/10 dark:to-white/5 backdrop-blur-2xl hover:-translate-y-1">
                                    <div className="absolute inset-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] pointer-events-none z-20 rounded-xl" />
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                                        <CardTitle className="text-base font-semibold tracking-tight truncate pr-2 group-hover:text-primary transition-colors">{int.name}</CardTitle>
                                        <Badge variant={int.status === "ACTIVE" ? "outline" : int.status.startsWith("ERROR") ? "destructive" : "secondary"} className={cn(
                                            "font-medium border-border/50 shadow-sm transition-colors",
                                            int.status === "ACTIVE" && "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20",
                                            int.status === "SYNCING" && "bg-primary/10 text-primary border-primary/20",
                                        )}>
                                            {int.status === "ACTIVE" && <span className="relative flex h-2 w-2 mr-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" /></span>}
                                            {int.status}
                                        </Badge>
                                    </CardHeader>
                                    <CardContent className="relative z-10">
                                        <div className="text-sm text-foreground/70 capitalize mb-4 font-mono bg-secondary/30 rounded-md px-2 py-1 inline-block border border-border/30">{int.provider_type} Provider</div>
                                        <div className="flex justify-between items-center mt-2">
                                            <p className="text-xs font-medium text-muted-foreground/70">Last Sync: {int.last_sync_at ? new Date(int.last_sync_at).toLocaleString() : "Never"}</p>
                                            <div className="flex gap-2 relative z-30">
                                                <Button variant="ghost" size="icon" onClick={() => handleSync(int.id, int.name)} disabled={isSyncing} title="Sync Now" className="hover:bg-primary/20 hover:text-primary rounded-full h-8 w-8 transition-colors">
                                                    <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin text-primary")} />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm({ id: int.id, name: int.name })} disabled={isSyncing} className="text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-full h-8 w-8 transition-colors" title="Delete">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}

                <AddIntegrationDialog isOpen={isDialogOpen} onOpenChange={handleDialogClose} onSaved={mutate} />

                <ConfirmDialog
                    open={!!deleteConfirm}
                    onOpenChange={(open) => !open && setDeleteConfirm(null)}
                    onConfirm={() => deleteConfirm && handleDelete(deleteConfirm.id)}
                    title="Delete Integration?"
                    description={<>This will permanently remove the <span className="font-semibold text-foreground">{deleteConfirm?.name}</span> integration and its configuration. This action cannot be undone.</>}
                    confirmLabel="Delete Integration"
                />
            </div>
        </AppLayout>
    );
};
