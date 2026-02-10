import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle2, XCircle, ExternalLink, Activity } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AppLayout } from "../layouts/AppLayout"; // Correct path
import { AddServiceDialog } from "../components/AddServiceDialog";
import type { DashboardResponse, Service } from "../types/api";
import { fetchApi } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export const Dashboard = () => {
    const [data, setData] = useState<DashboardResponse | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const json = await fetchApi<DashboardResponse>('/api/dashboard');
            setData(json);
        } catch (e) {
            console.error(e);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const services = data?.services || [];
    const upCount = services.filter(s => s.status === 'UP').length;
    const downCount = services.filter(s => s.status === 'DOWN').length;

    return (
        <AppLayout>
            <div className="flex flex-col space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                        <p className="text-muted-foreground">Overview of your homelab services.</p>
                    </div>
                    <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" /> Add Service
                    </Button>
                </div>

                {/* Metrics / Overview - Bento Grid Top Row */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Services</CardTitle>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{services.length}</div>
                            <p className="text-xs text-muted-foreground">Monitored endpoints</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Healthy</CardTitle>
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-500">{upCount}</div>
                            <p className="text-xs text-muted-foreground">Services Operational</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Issues</CardTitle>
                            <XCircle className="h-4 w-4 text-destructive" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-destructive">{downCount}</div>
                            <p className="text-xs text-muted-foreground">Services Down</p>
                        </CardContent>
                    </Card>
                    {/* Placeholder for more stats */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">99.9%</div>
                            <p className="text-xs text-muted-foreground">Last 30 days</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Services Grid */}
                <h2 className="text-xl font-semibold tracking-tight">Services</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {services.map((service) => (
                        <ServiceCard key={service.id} service={service} />
                    ))}
                </div>

                <AddServiceDialog
                    isOpen={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    onServiceAdded={fetchData}
                />
            </div>
        </AppLayout>
    );
}

function ServiceCard({ service }: { service: Service }) {
    return (
        <Card className={cn(
            "transition-all hover:shadow-md",
            service.status === 'DOWN' && "border-destructive/50"
        )}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium truncate pr-2">
                    {service.name}
                </CardTitle>
                <img
                    src={`https://www.google.com/s2/favicons?domain=${service.base_url}&sz=32`}
                    alt="icon"
                    className="h-6 w-6 rounded-sm opacity-80"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between mb-2">
                    <Badge variant={
                        service.status === 'UP' ? 'default' :
                            service.status === 'DOWN' ? 'destructive' :
                                'secondary'
                    } className={cn(
                        service.status === 'UP' && "bg-green-500 hover:bg-green-600",
                        service.status === 'MAINTENANCE' && "bg-yellow-500 hover:bg-yellow-600"
                    )}>
                        {service.status}
                    </Badge>
                    {service.last_check && (
                        <span className="text-xs text-muted-foreground">
                            {new Date(service.last_check).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                </div>

                <div className="text-xs text-muted-foreground truncate mb-4">
                    {service.base_url}
                </div>

                <a
                    href={service.base_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm font-medium text-primary hover:underline"
                >
                    Open <ExternalLink className="ml-1 h-3 w-3" />
                </a>
            </CardContent>
        </Card>
    );
}
