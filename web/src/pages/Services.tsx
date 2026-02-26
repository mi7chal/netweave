import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { GlassCard } from "@/components/ui/glass-card";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { Plus, Trash2, Edit2, ExternalLink } from "lucide-react";
import { useState, useMemo } from "react";
import useSWR from "swr";
import { AppLayout } from "../layouts/AppLayout";
import { fetchApi } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SearchInput } from "@/components/SearchInput";
import { PageHeader } from "@/components/PageHeader";
import type { Service, DeviceListView } from "../types/api";

export const Services = () => {
    const { data, error: dashboardError, isLoading, mutate } = useSWR<{ services: Service[] }>("/api/dashboard", fetchApi, { refreshInterval: 10000 });
    const { data: devices = [], error: devicesError } = useSWR<DeviceListView[]>("/api/devices", fetchApi);
    const services = data?.services || [];
    const error = dashboardError || devicesError;

    const [search, setSearch] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [formData, setFormData] = useState<Partial<Service>>({});
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

    const filteredServices = useMemo(() => {
        if (!search.trim()) return services;
        const q = search.toLowerCase();
        return services.filter(s => s.name.toLowerCase().includes(q) || s.base_url.toLowerCase().includes(q));
    }, [services, search]);

    const handleDelete = async (id: string, name: string) => {
        try {
            await fetchApi(`/api/services/${id}`, { method: "DELETE" });
            setDeleteConfirm(null);
            mutate();
            toast.success("Service deleted", { description: `${name} has been removed.` });
        } catch (e) { console.error(e); }
    };

    const handleSave = async () => {
        try {
            const url = selectedService ? `/api/services/${selectedService.id}` : "/api/services";
            await fetchApi(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            mutate();
            setIsDialogOpen(false);
            toast.success("Service saved", { description: `Successfully saved ${formData.name || "service"}` });
        } catch (e) { console.error(e); }
    };

    const openEdit = (service: Service) => { setSelectedService(service); setFormData(service); setIsDialogOpen(true); };
    const openCreate = () => { setSelectedService(null); setFormData({ is_public: false }); setIsDialogOpen(true); };

    return (
        <AppLayout>
            <div className="flex flex-col space-y-6">
                <PageHeader title="Services" description="Manage your dashboard applications and their status.">
                    <SearchInput value={search} onChange={setSearch} placeholder="Search services..." className="w-full md:w-64" />
                    <Button onClick={openCreate} className="gap-2 shadow-sm rounded-full h-10 px-5 flex-shrink-0 hover:scale-105 transition-all duration-300">
                        <Plus className="h-4 w-4" /> Add Service
                    </Button>
                </PageHeader>

                {isLoading ? <LoadingState /> : error ? <ErrorState message={error.message} onRetry={() => mutate()} /> : services.length === 0 ? (
                    <EmptyState icon={Plus} title="No services found" description="Add your first service to track its status." />
                ) : (
                    <GlassCard>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-border/30 hover:bg-transparent">
                                        <TableHead>Name</TableHead>
                                        <TableHead>URL</TableHead>
                                        <TableHead>Visibility</TableHead>
                                        <TableHead>Uptime</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredServices.map((item) => (
                                        <TableRow key={item.id} className="border-border/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                            <TableCell className="font-medium">{item.name}</TableCell>
                                            <TableCell>
                                                <a href={item.base_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                                                    {item.base_url} <ExternalLink size={12} />
                                                </a>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={item.is_public ? "outline" : "secondary"} className="shadow-sm">{item.is_public ? "Public" : "Private"}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <span className={cn(
                                                    "text-sm font-medium",
                                                    (item.uptime_percentage ?? 100) >= 99 ? "text-green-500" : (item.uptime_percentage ?? 100) >= 95 ? "text-amber-500" : "text-destructive"
                                                )}>
                                                    {(item.uptime_percentage ?? 100).toFixed(1)}%
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={item.status === "UP" ? "outline" : item.status === "UNKNOWN" ? "secondary" : "destructive"} className={cn(
                                                    "shadow-sm",
                                                    item.status === "UP" && "bg-green-500/10 text-green-500 border-green-500/20",
                                                    item.status === "UNKNOWN" && "bg-secondary text-muted-foreground"
                                                )}>
                                                    {item.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)} className="h-8 w-8 hover:bg-primary/20 hover:text-primary transition-colors">
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm({ id: item.id, name: item.name })} className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </GlassCard>
                )}

                {/* Create/Edit Service Dialog */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent className="sm:max-w-[425px] bg-card/80 backdrop-blur-2xl border-border/40 shadow-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">{selectedService ? "Edit Service" : "New Service"}</DialogTitle>
                            <DialogDescription className="text-muted-foreground/80">Configure service details and monitoring.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-6">
                            <div className="grid gap-2">
                                <Label htmlFor="name" className="text-sm font-medium">Name</Label>
                                <Input id="name" placeholder="Plex" value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="bg-secondary/40 border-border/40 focus-visible:ring-primary/40 focus-visible:border-primary/50 transition-all rounded-lg" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="url" className="text-sm font-medium">URL</Label>
                                <Input id="url" placeholder="http://192.168.1.50:32400" value={formData.base_url || ""} onChange={(e) => setFormData({ ...formData, base_url: e.target.value })} className="bg-secondary/40 border-border/40 focus-visible:ring-primary/40 focus-visible:border-primary/50 transition-all rounded-lg" />
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-sm font-medium">Link to Device</Label>
                                <Select value={formData.device_id || "none"} onValueChange={(val) => setFormData({ ...formData, device_id: val === "none" ? undefined : val })}>
                                    <SelectTrigger className="bg-secondary/40 border-border/40 focus:ring-primary/40 focus:border-primary/50 transition-all rounded-lg"><SelectValue placeholder="Select a device (Optional)" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        {devices.map(device => <SelectItem key={device.id} value={device.id}>{device.hostname}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center justify-between rounded-lg border border-border/40 bg-secondary/20 p-4 transition-all hover:bg-secondary/40">
                                <div className="space-y-0.5">
                                    <Label className="text-base font-medium">Publicly Visible</Label>
                                    <p className="text-sm text-muted-foreground/80">Show this service on the public dashboard.</p>
                                </div>
                                <Switch checked={formData.is_public} onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })} />
                            </div>
                        </div>
                        <DialogFooter className="border-t border-border/20 pt-4 mt-2">
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="hover:bg-secondary/60">Cancel</Button>
                            <Button onClick={handleSave}>Save</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <ConfirmDialog
                    open={!!deleteConfirm}
                    onOpenChange={(open) => !open && setDeleteConfirm(null)}
                    onConfirm={() => deleteConfirm && handleDelete(deleteConfirm.id, deleteConfirm.name)}
                    title="Delete Service?"
                    description={<>This will permanently remove <span className="font-semibold text-foreground">{deleteConfirm?.name}</span> and its monitoring history. This action cannot be undone.</>}
                    confirmLabel="Delete Service"
                />
            </div>
        </AppLayout>
    );
};
