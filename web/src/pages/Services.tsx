import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Edit2, ExternalLink } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AppLayout } from "../layouts/AppLayout";
import { fetchApi } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface Service {
    id: string;
    name: string;
    base_url: string;
    icon_url?: string;
    is_public: boolean;
    monitor_interval_seconds?: number;
    status: string;
}

export const Services = () => {
    const [services, setServices] = useState<Service[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [formData, setFormData] = useState<Partial<Service>>({});

    const fetchServices = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await fetchApi<{ services: Service[] }>('/api/dashboard');
            setServices(data.services || []);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchServices();
        const interval = setInterval(fetchServices, 10000);
        return () => clearInterval(interval);
    }, [fetchServices]);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure?")) return;
        try {
            await fetchApi(`/api/services/${id}`, { method: 'DELETE' });
            fetchServices();
        } catch (e) {
            console.error(e);
        }
    };

    const handleSave = async () => {
        try {
            const url = selectedService ? `/api/services/${selectedService.id}` : '/api/services';

            await fetchApi(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            fetchServices();
            setIsDialogOpen(false);
        } catch (e) {
            console.error(e);
        }
    };

    const openEdit = (service: Service) => {
        setSelectedService(service);
        setFormData(service);
        setIsDialogOpen(true);
    };

    const openCreate = () => {
        setSelectedService(null);
        setFormData({ is_public: false });
        setIsDialogOpen(true);
    };

    return (
        <AppLayout>
            <div className="flex flex-col space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Services</h1>
                        <p className="text-muted-foreground">Manage dashboard shortcuts and monitoring.</p>
                    </div>
                    <Button onClick={openCreate}>
                        <Plus className="mr-2 h-4 w-4" /> Add Service
                    </Button>
                </div>

                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>URL</TableHead>
                                    <TableHead>Visibility</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">Loading...</TableCell>
                                    </TableRow>
                                ) : services.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">No services found.</TableCell>
                                    </TableRow>
                                ) : (
                                    services.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.name}</TableCell>
                                            <TableCell>
                                                <a href={item.base_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                                                    {item.base_url} <ExternalLink size={12} />
                                                </a>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={item.is_public ? "default" : "secondary"}>
                                                    {item.is_public ? "Public" : "Private"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={item.status === "UP" ? "default" : "destructive"} className={cn(
                                                    item.status === "UP" && "bg-green-500 hover:bg-green-600"
                                                )}>
                                                    {item.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="text-destructive hover:text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{selectedService ? "Edit Service" : "New Service"}</DialogTitle>
                            <DialogDescription>
                                Configure service details and monitoring.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    placeholder="Plex"
                                    value={formData.name || ""}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="url">URL</Label>
                                <Input
                                    id="url"
                                    placeholder="http://192.168.1.50:32400"
                                    value={formData.base_url || ""}
                                    onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                                />
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Publicly Visible</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Show this service on the public dashboard.
                                    </p>
                                </div>
                                <Switch
                                    checked={formData.is_public}
                                    onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleSave}>Save</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
};
