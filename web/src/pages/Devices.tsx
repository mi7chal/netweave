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
import { Plus, Trash2, Search, Edit2, Server, Monitor, Laptop, Router, Network, Wifi, Container } from "lucide-react";
import { useEffect, useState } from "react";
import { AppLayout } from "../layouts/AppLayout";
import { fetchApi } from "@/lib/api-client";
import { type DeviceListView, DeviceType, type CreateDevicePayload } from "@/types/api";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";


export const Devices = () => {
    const navigate = useNavigate();
    const [devices, setDevices] = useState<DeviceListView[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<CreateDevicePayload>>({});

    const fetchDevices = async (query = "") => {
        setIsLoading(true);
        try {
            const url = query ? `/api/devices?q=${query}` : '/api/devices';
            const data = await fetchApi<DeviceListView[]>(url);
            setDevices(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchDevices(search);
        }, 300);
        return () => clearTimeout(timeout);
    }, [search]);

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this device?")) return;
        try {
            await fetchApi(`/api/devices/${id}`, { method: 'DELETE' });
            toast.success("Device deleted");
            fetchDevices(search);
        } catch (e) {
            console.error(e);
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

            toast.success("Device created");
            fetchDevices(search);
            setIsDialogOpen(false);
        } catch (e) {
            console.error(e);
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
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Devices</h1>
                        <p className="text-muted-foreground">Manage infrastructure hardware and virtual machines.</p>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto items-center">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search devices..."
                                className="pl-8"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Button onClick={openCreate}>
                            <Plus className="h-4 w-4 mr-2" /> Add Device
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Hostname</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Primary IP</TableHead>
                                    <TableHead>MAC Address</TableHead>
                                    <TableHead>OS</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            Loading...
                                        </TableCell>
                                    </TableRow>
                                ) : devices.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            No devices found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    devices.map((device) => (
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
                                                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); navigate(`/devices/${device.id}`); }}>
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={(e) => handleDelete(e, device.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
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
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Add New Device</DialogTitle>
                            <DialogDescription>
                                Create a new device. You can add detailed interfaces later.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="hostname">Hostname</Label>
                                <Input
                                    id="hostname"
                                    value={formData.hostname || ""}
                                    onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="type">Type</Label>
                                <Select
                                    value={formData.device_type}
                                    onValueChange={(val) => setFormData({ ...formData, device_type: val as DeviceType })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.values(DeviceType).map((type) => (
                                            <SelectItem key={type} value={type}>
                                                {type}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="mac">Initial MAC Address (eth0)</Label>
                                <Input
                                    id="mac"
                                    placeholder="00:00:00:00:00:00"
                                    value={formData.mac_address || ""}
                                    onChange={(e) => setFormData({ ...formData, mac_address: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="os">OS Info</Label>
                                <Input
                                    id="os"
                                    placeholder="e.g. Ubuntu 22.04"
                                    value={formData.os_info || ""}
                                    onChange={(e) => setFormData({ ...formData, os_info: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleSave}>Create Device</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
};
