import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AppLayout } from "../layouts/AppLayout";
import { fetchApi } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { AddIntegrationDialog } from "../components/AddIntegrationDialog";

interface Integration {
    id: string;
    name: string;
    provider_type: string;
    status: string;
    last_sync_at: string | null;
}

export const Integrations = () => {
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const fetchIntegrations = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await fetchApi<Integration[]>('/api/integrations');
            setIntegrations(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure?")) return;
        try {
            await fetchApi(`/api/integrations/${id}`, { method: 'DELETE' });
            fetchIntegrations();
        } catch (e) {
            console.error(e);
        }
    };

    const handleSync = async (id: string) => {
        try {
            await fetchApi(`/api/integrations/${id}/sync`, { method: 'POST' });
            fetchIntegrations();
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchIntegrations();
    }, [fetchIntegrations]);

    return (
        <AppLayout>
            <div className="flex flex-col space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
                        <p className="text-muted-foreground">Manage external connections (AdGuard, Unifi, Kea).</p>
                    </div>
                    <Button onClick={() => setIsDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Add Integration
                    </Button>
                </div>

                {isLoading ? (
                    <div className="text-center py-10 text-muted-foreground">Loading...</div>
                ) : integrations.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">No integrations found.</div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {integrations.map((int) => (
                            <Card key={int.id}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-base font-medium">
                                        {int.name}
                                    </CardTitle>
                                    <Badge variant={
                                        int.status === 'ACTIVE' ? 'default' :
                                            int.status.startsWith('ERROR') ? 'destructive' : 'secondary'
                                    } className={cn(
                                        int.status === 'ACTIVE' && "bg-green-500 hover:bg-green-600"
                                    )}>
                                        {int.status}
                                    </Badge>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-sm text-muted-foreground capitalize mb-4">
                                        {int.provider_type} Provider
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-xs text-muted-foreground">
                                            Last Sync: {int.last_sync_at ? new Date(int.last_sync_at).toLocaleString() : "Never"}
                                        </p>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleSync(int.id)} title="Sync Now">
                                                <RefreshCw className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(int.id)} className="text-destructive hover:text-destructive" title="Delete">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                <AddIntegrationDialog isOpen={isDialogOpen} onOpenChange={setIsDialogOpen} onSaved={fetchIntegrations} />
            </div>
        </AppLayout>
    );
};
