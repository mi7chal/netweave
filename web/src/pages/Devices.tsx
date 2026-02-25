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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Edit2, Server, Monitor, Laptop, Router, Network, Wifi, Container } from "lucide-react";
import { useState, useEffect } from "react";
import useSWR from "swr";
import { AppLayout } from "../layouts/AppLayout";
import { fetchApi } from "@/lib/api-client";
import { type DeviceListView, DeviceType, type CreateDevicePayload } from "@/types/api";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { SearchInput } from "@/components/SearchInput";
import { PageHeader } from "@/components/PageHeader";


export const Devices = () => {
    const navigate = useNavigate();
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<CreateDevicePayload>>({});

    useEffect(() => {
        const timeout = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(timeout);
    }, [search]);

    const { data: devices = [], isLoading, mutate } = useSWR<DeviceListView[]>(
        debouncedSearch ? `/api/devices?q=${debouncedSearch}` : '/api/devices',
        fetchApi
    );

    const handleDelete = async (e: React.MouseEvent, id: string, hostname: string) => {
        e.stopPropagation();
        if (!confirm(`Are you sure you want to delete ${hostname}?`)) return;
        try {
            await fetchApi(`/api/devices/${id}`, { method: 'DELETE' });
            mutate();
            toast.success("Device deleted", { description: `${hostname} has been removed successfully.` });
        } catch (error) {
            console.error(error);
        }
    };

    const handleSave = async () => {
        try {
            // Only create for now from this dialog, editing happens in details page or we can add edit here too 
            // but for now let's assume this is mostly for creation or basic edit
            // Simplified: If it has an ID we can't edit it easily with CreateDevicePayload unless we map it back
            // For now, let's treat this dialog as "Quick Create"

            await fetchApi('/api/devices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            mutate();
            setIsDialogOpen(false);
            setFormData({});
            toast.success("Device created", { description: "The new device has been added to the registry." });
        } catch (error) {
            console.error(error);
        }
    };

    const openCreate = () => {
        setFormData({ device_type: DeviceType.Other });
        setIsDialogOpen(true);
    };

    const getDeviceIcon = (type: DeviceType) => {
        switch (type) {
            case DeviceType.Physical: return <Server className="h-4 w-4" />;
            case DeviceType.Vm: return <Monitor className="h-4 w-4" />;
            case DeviceType.Lxc: return <Container className="h-4 w-4" />;
            case DeviceType.Container: return <Container className="h-4 w-4" />;
            case DeviceType.Switch: return <Network className="h-4 w-4" />;
            case DeviceType.Router: return <Router className="h-4 w-4" />;
            case DeviceType.Ap: return <Wifi className="h-4 w-4" />;
            default: return <Laptop className="h-4 w-4" />;
        }
    }

    return (
        <AppLayout>
            <div className="flex flex-col space-y-6">
                <PageHeader
                    title="Devices"
                    description="Manage infrastructure hardware and virtual machines."
                >
                    <SearchInput
                        value={search}
                        onChange={setSearch}
                        placeholder="Search devices..."
                        className="w-full md:w-64"
                    />
                    <Button onClick={openCreate} className="gap-2 shadow-sm rounded-full h-10 px-5 flex-shrink-0 hover:scale-105 transition-all duration-300">
                        <Plus className="h-4 w-4" /> Add Device
                    </Button>
                </PageHeader>

                {isLoading ? (
                    <div className="text-center py-10 text-muted-foreground animate-pulse font-medium">Loading...</div>
                ) : devices.length === 0 ? (
                    <div className="text-center py-20 bg-white/40 dark:bg-white/5 backdrop-blur-md border border-black/5 dark:border-white/10 rounded-3xl mt-6 shadow-sm">
                        <Server className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-foreground">No devices found</h3>
                        <p className="text-sm text-muted-foreground mt-1">Add your first hardware device or VM.</p>
                    </div>
                ) : (
                    <Card className="border border-white/40 dark:border-white/10 bg-gradient-to-br from-white/60 to-white/30 dark:from-white/10 dark:to-white/5 backdrop-blur-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] overflow-hidden relative">
                        {/* Glass Reflection Highlight */}
                        <div className="absolute inset-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] pointer-events-none z-20 rounded-xl" />
                        <CardContent className="p-0 relative z-10">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-border/30 hover:bg-transparent">
                                        <TableHead>Hostname</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Primary IP</TableHead>
                                        <TableHead>MAC Address</TableHead>
                                        <TableHead>OS</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {devices.map((device) => (
                                        <TableRow
                                            key={device.id}
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => navigate(`/devices/${device.id}`)}
                                        >
                                            <TableCell className="font-medium">
                                                {device.hostname}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="gap-1 hover:bg-secondary">
                                                    {getDeviceIcon(device.device_type)}
                                                    {device.device_type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{device.primary_ip || <span className="text-muted-foreground">-</span>}</TableCell>
                                            <TableCell className="font-mono text-xs">{device.mac_address || <span className="text-muted-foreground">-</span>}</TableCell>
                                            <TableCell>{device.os_info || <span className="text-muted-foreground">-</span>}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/20 hover:text-primary transition-colors">
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={(e) => handleDelete(e, device.id, device.hostname)} className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent className="sm:max-w-[425px] bg-card/80 backdrop-blur-2xl border-border/40 shadow-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Add New Device</DialogTitle>
                            <DialogDescription className="text-muted-foreground/80">
                                Create a new device. You can add detailed interfaces later.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-6">
                            <div className="grid gap-2">
                                <Label htmlFor="hostname" className="text-sm font-medium">Hostname</Label>
                                <Input
                                    id="hostname"
                                    value={formData.hostname || ""}
                                    onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
                                    className="bg-secondary/40 border-border/40 focus-visible:ring-primary/40 focus-visible:border-primary/50 transition-all rounded-lg"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="type" className="text-sm font-medium">Type</Label>
                                <Select
                                    value={formData.device_type}
                                    onValueChange={(val) => setFormData({ ...formData, device_type: val as DeviceType })}
                                >
                                    <SelectTrigger className="bg-secondary/40 border-border/40 focus:ring-primary/40 rounded-lg transition-all">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card/90 backdrop-blur-xl border-border/40 shadow-xl">
                                        {Object.values(DeviceType).map((type) => (
                                            <SelectItem key={type} value={type} className="hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer rounded-md mx-1 my-0.5">
                                                {type}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="mac" className="text-sm font-medium">Initial MAC Address (eth0)</Label>
                                <Input
                                    id="mac"
                                    placeholder="00:00:00:00:00:00"
                                    value={formData.mac_address || ""}
                                    onChange={(e) => setFormData({ ...formData, mac_address: e.target.value })}
                                    className="bg-secondary/40 border-border/40 focus-visible:ring-primary/40 focus-visible:border-primary/50 transition-all rounded-lg"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="os" className="text-sm font-medium">OS Info</Label>
                                <Input
                                    id="os"
                                    placeholder="e.g. Ubuntu 22.04"
                                    value={formData.os_info || ""}
                                    onChange={(e) => setFormData({ ...formData, os_info: e.target.value })}
                                    className="bg-secondary/40 border-border/40 focus-visible:ring-primary/40 focus-visible:border-primary/50 transition-all rounded-lg"
                                />
                            </div>
                        </div>
                        <DialogFooter className="border-t border-border/20 pt-4 mt-2">
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="hover:bg-secondary/60">Cancel</Button>
                            <Button onClick={handleSave}>Create Device</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
};
