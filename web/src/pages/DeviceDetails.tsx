import { useState } from "react";
import useSWR from "swr";
import { cn } from "@/lib/utils";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { fetchApi } from "@/lib/api-client";
import { type DeviceDetails, DeviceType, type CreateDevicePayload } from "@/types/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Server, Monitor, Laptop, Router, Network, Wifi, Container, Plus, Trash2, Cpu, HardDrive, MemoryStick, Edit2 } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

export const DeviceDetailsPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: device, isLoading, mutate } = useSWR<DeviceDetails>(
        id ? `/api/devices/${id}` : null,
        fetchApi,
        {
            onError: () => {
                toast.error("Failed to load device details");
                navigate('/devices');
            }
        }
    );

    const [isInterfaceDialogOpen, setIsInterfaceDialogOpen] = useState(false);
    const [interfaceName, setInterfaceName] = useState("");
    const [interfaceMac, setInterfaceMac] = useState("");

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editFormData, setEditFormData] = useState<Partial<CreateDevicePayload>>({});

    const handleAddInterface = async () => {
        try {
            await fetchApi(`/api/devices/${id}/interfaces`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: interfaceName,
                    mac_address: interfaceMac || null,
                    interface_type: 'ethernet'
                })
            });
            toast.success("Interface added");
            setInterfaceName("");
            setInterfaceMac("");
            setIsInterfaceDialogOpen(false);
            mutate();
        } catch (error) {
            console.error(error);
            toast.error("Failed to add interface");
        }
    };

    const handleDeleteInterface = async (interfaceId: string) => {
        if (!confirm("Are you sure you want to delete this interface?")) return;
        try {
            await fetchApi(`/api/devices/${id}/interfaces/${interfaceId}`, {
                method: 'DELETE'
            });
            toast.success("Interface deleted", { description: "The interface has been successfully removed." });
            mutate();
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete interface");
        }
    };

    const handleDeleteDevice = async () => {
        if (!confirm("Are you sure you want to delete this device?")) return;
        try {
            await fetchApi(`/api/devices/${id}`, { method: 'DELETE' });
            toast.success("Device deleted");
            navigate('/devices');
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete device");
        }
    };

    const handleSaveDevice = async () => {
        try {
            await fetchApi(`/api/devices/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editFormData)
            });
            setIsEditDialogOpen(false);
            toast.success("Device updated");
            mutate();
        } catch (error) {
            console.error(error);
            toast.error("Failed to update device");
        }
    };

    const openEditDevice = () => {
        if (!device) return;
        setEditFormData({
            hostname: device.hostname,
            device_type: device.device_type,
            os_info: device.os_info || "",
            cpu_cores: device.cpu_cores || undefined,
            ram_gb: device.ram_gb || undefined,
            storage_gb: device.storage_gb || undefined,
            // mac_address is only really editable easily on the main list or via interface tab, but keep it null for payload unless they want to edit eth0
        });
        setIsEditDialogOpen(true);
    };

    const getDeviceIcon = (type: DeviceType) => {
        switch (type) {
            case DeviceType.Physical: return <Server className="h-6 w-6" />;
            case DeviceType.Vm: return <Monitor className="h-6 w-6" />;
            case DeviceType.Lxc: return <Container className="h-6 w-6" />;
            case DeviceType.Container: return <Container className="h-6 w-6" />;
            case DeviceType.Switch: return <Network className="h-6 w-6" />;
            case DeviceType.Router: return <Router className="h-6 w-6" />;
            case DeviceType.Ap: return <Wifi className="h-6 w-6" />;
            default: return <Laptop className="h-6 w-6" />;
        }
    }

    if (isLoading) return (
        <AppLayout>
            <div className="flex items-center justify-center h-[50vh]">
                <div className="text-center text-muted-foreground animate-pulse font-medium">Loading device details...</div>
            </div>
        </AppLayout>
    );
    if (!device) return (
        <AppLayout>
            <div className="flex items-center justify-center h-[50vh]">
                <div className="text-center text-muted-foreground font-medium">Device not found</div>
            </div>
        </AppLayout>
    );

    return (
        <AppLayout>
            <div className="space-y-6">
                <div className="mb-2">
                    <Button variant="ghost" className="-ml-3 mb-2 text-muted-foreground hover:text-foreground" onClick={() => navigate('/devices')}>
                        ← Back to Devices
                    </Button>
                </div>
                <div className="flex justify-between items-end mb-2 relative z-10 px-1 w-full flex-col md:flex-row gap-4">
                    <div className="flex items-center gap-4 w-full">
                        <div className="p-3.5 bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 rounded-xl shadow-[0_0_15px_rgba(120,119,198,0.2)] relative flex-shrink-0">
                            <div className="absolute inset-0 bg-primary/20 rounded-xl blur-md opacity-50" />
                            <div className="relative z-10 text-primary">
                                {getDeviceIcon(device.device_type)}
                            </div>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">{device.hostname}</h1>
                            <div className="flex items-center gap-3 mt-1.5 text-muted-foreground text-sm">
                                <Badge variant="outline" className="border-border/50 bg-secondary/30 shadow-sm font-medium">{device.device_type}</Badge>
                                <span>•</span>
                                <span>{device.os_info || "Unknown OS"}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
                        <Button variant="outline" className="gap-2 shadow-sm rounded-full h-10 px-5 flex-shrink-0 hover:scale-105 transition-all duration-300" onClick={openEditDevice}>
                            <Edit2 className="h-4 w-4" /> Edit
                        </Button>
                        <Button variant="outline" className="gap-2 shadow-sm rounded-full h-10 px-5 flex-shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive hover:scale-105 transition-all duration-300" onClick={handleDeleteDevice}>
                            <Trash2 className="h-4 w-4" /> Delete
                        </Button>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-3 relative z-10 mt-6">
                    <Card className="md:col-span-1 h-fit border-black/5 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-2xl shadow-lg overflow-hidden">
                        <CardHeader className="relative z-10 pb-4 border-b border-border/30">
                            <CardTitle className="text-lg">Hardware Specs</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5 pt-6 relative z-10">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground">
                                    <Cpu className="h-4 w-4 text-primary/80" /> CPU Cores
                                </div>
                                <span className="font-semibold text-foreground/90 bg-secondary/40 px-2 py-0.5 rounded-md">{device.cpu_cores || "-"}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground">
                                    <MemoryStick className="h-4 w-4 text-primary/80" /> RAM
                                </div>
                                <span className="font-semibold text-foreground/90 bg-secondary/40 px-2 py-0.5 rounded-md">{device.ram_gb ? `${device.ram_gb} GB` : "-"}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground">
                                    <HardDrive className="h-4 w-4 text-primary/80" /> Storage
                                </div>
                                <span className="font-semibold text-foreground/90 bg-secondary/40 px-2 py-0.5 rounded-md">{device.storage_gb ? `${device.storage_gb} GB` : "-"}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="md:col-span-2 space-y-4">
                        <Tabs defaultValue="interfaces">
                            <TabsList>
                                <TabsTrigger value="interfaces">Interfaces & IPs</TabsTrigger>
                                <TabsTrigger value="services">Services</TabsTrigger>
                            </TabsList>
                            <TabsContent value="interfaces" className="space-y-4 mt-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-medium">Network Interfaces</h3>
                                    <Button size="sm" onClick={() => setIsInterfaceDialogOpen(true)}>
                                        <Plus className="h-4 w-4 mr-2" /> Add Interface
                                    </Button>
                                </div>

                                <div className="grid gap-4">
                                    {device.interfaces.length === 0 ? (
                                        <div className="text-center py-12 bg-white/40 dark:bg-white/5 backdrop-blur-md border border-black/5 dark:border-white/10 rounded-xl mt-2 shadow-sm">
                                            <Network className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                                            <h3 className="text-base font-semibold text-foreground">No interfaces found</h3>
                                            <p className="text-xs text-muted-foreground mt-1">Add a network interface to start mapping IP addresses.</p>
                                        </div>
                                    ) : (
                                        device.interfaces.map((iface) => (
                                            <Card key={iface.id} className="border-black/5 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                                                <CardHeader className="py-3 px-4 bg-black/5 dark:bg-white/5">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Network className="h-4 w-4 text-muted-foreground" />
                                                            <span className="font-medium font-mono">{iface.name}</span>
                                                            <Badge variant="secondary" className="text-xs font-normal">
                                                                {iface.mac_address || "No MAC"}
                                                            </Badge>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                            onClick={() => handleDeleteInterface(iface.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="py-3">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow className="hover:bg-transparent">
                                                                <TableHead className="h-8">IP Address</TableHead>
                                                                <TableHead className="h-8">State</TableHead>
                                                                <TableHead className="h-8">Type</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {iface.ips.length === 0 ? (
                                                                <TableRow className="hover:bg-transparent">
                                                                    <TableCell colSpan={3} className="text-muted-foreground text-sm h-8 py-2">
                                                                        No IPs assigned.
                                                                    </TableCell>
                                                                </TableRow>
                                                            ) : (
                                                                iface.ips.map((ip) => (
                                                                    <TableRow key={ip.id} className="hover:bg-transparent">
                                                                        <TableCell className="py-2.5 font-mono text-sm">{ip.ip_address}</TableCell>
                                                                        <TableCell className="py-2.5">
                                                                            <Badge variant="outline" className={cn(
                                                                                "text-[11px] h-5 shadow-sm uppercase font-semibold tracking-wider",
                                                                                ip.status === 'ACTIVE' && ip.is_static ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                                                                                    ip.status === 'ACTIVE' ? "bg-green-500/10 text-green-600 border-green-500/20" :
                                                                                        ip.status === 'RESERVED' ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                                                                                            "bg-secondary/50 text-muted-foreground border-border/50"
                                                                            )}>
                                                                                {ip.status === 'ACTIVE' && ip.is_static ? 'STATIC' :
                                                                                    ip.status === 'RESERVED' ? 'DHCP RSV' :
                                                                                        ip.status === 'ACTIVE' ? 'DHCP DYN' : ip.status}
                                                                            </Badge>
                                                                        </TableCell>
                                                                        <TableCell className="py-2.5 text-xs text-muted-foreground flex items-center gap-1.5">
                                                                            <div className={cn(
                                                                                "w-1.5 h-1.5 rounded-full",
                                                                                ip.is_static ? "bg-amber-500" : "bg-blue-500"
                                                                            )} />
                                                                            {ip.is_static ? "Device Defined" : "Router Authored"}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))
                                                            )}
                                                        </TableBody>
                                                    </Table>
                                                </CardContent>
                                            </Card>
                                        ))
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="services" className="space-y-4 mt-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-medium">Associated Services</h3>
                                    <Button size="sm" onClick={() => navigate('/services')}>
                                        <Plus className="h-4 w-4 mr-2" /> Add Service
                                    </Button>
                                </div>

                                {device.services.length === 0 ? (
                                    <div className="text-center py-12 bg-white/40 dark:bg-white/5 backdrop-blur-md border border-black/5 dark:border-white/10 rounded-xl mt-2 shadow-sm">
                                        <Server className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                                        <h3 className="text-base font-semibold text-foreground">No services found</h3>
                                        <p className="text-xs text-muted-foreground mt-1">There are no services associated with this device yet.</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-4">
                                        {device.services.map((service) => {
                                            const uptime = service.total_checks > 0
                                                ? (service.successful_checks / service.total_checks) * 100
                                                : 100;

                                            // Mocking the current status just based on uptime since we don't have the real-time cache here,
                                            // or we can fetch it but for the details page, showing uptime is enough.
                                            let statusBadge = uptime >= 99 ? "UP" : "DOWN";
                                            if (service.total_checks === 0) statusBadge = "UNKNOWN";

                                            return (
                                                <Card key={service.id} className="border border-white/40 dark:border-white/10 bg-gradient-to-br from-white/60 to-white/30 dark:from-white/10 dark:to-white/5 backdrop-blur-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                                                    <div className="absolute inset-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] pointer-events-none z-20 rounded-xl" />
                                                    <CardContent className="p-4 relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-semibold text-lg">{service.name}</h4>
                                                                <Badge variant={service.is_public ? "outline" : "secondary"} className="text-[10px] h-5 px-1.5 font-normal shadow-sm">
                                                                    {service.is_public ? "Public" : "Private"}
                                                                </Badge>
                                                            </div>
                                                            <a href={service.base_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline mt-1 flex items-center gap-1">
                                                                {service.base_url}
                                                            </a>
                                                        </div>
                                                        <div className="flex items-center gap-4 sm:ml-auto">
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">Uptime</span>
                                                                <span className={cn(
                                                                    "font-semibold text-sm",
                                                                    uptime >= 99 ? "text-green-500" :
                                                                        uptime >= 95 ? "text-amber-500" : "text-destructive"
                                                                )}>
                                                                    {uptime.toFixed(1)}%
                                                                </span>
                                                            </div>
                                                            <div className="h-8 w-px bg-border/50 mx-2 hidden sm:block" />
                                                            <Badge variant={statusBadge === "UP" ? "outline" : statusBadge === "UNKNOWN" ? "secondary" : "destructive"} className={cn(
                                                                "shadow-sm min-w-16 justify-center",
                                                                statusBadge === "UP" && "bg-green-500/10 text-green-500 border-green-500/20",
                                                                statusBadge === "UNKNOWN" && "bg-secondary text-muted-foreground"
                                                            )}>
                                                                {statusBadge}
                                                            </Badge>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>

                <Dialog open={isInterfaceDialogOpen} onOpenChange={setIsInterfaceDialogOpen}>
                    {/* ... (existing interface dialog) ... */}
                    <DialogContent className="sm:max-w-[425px] bg-card/80 backdrop-blur-2xl border-border/40 shadow-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Add Interface</DialogTitle>
                            <DialogDescription className="text-muted-foreground/80">
                                Add a new network interface to this device.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-6">
                            <div className="grid gap-2">
                                <Label className="text-sm font-medium">Interface Name</Label>
                                <Input
                                    placeholder="eth1"
                                    value={interfaceName}
                                    onChange={(e) => setInterfaceName(e.target.value)}
                                    className="bg-secondary/40 border-border/40 focus-visible:ring-primary/40 focus-visible:border-primary/50 transition-all rounded-lg"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-sm font-medium">MAC Address</Label>
                                <Input
                                    placeholder="00:00:00:00:00:00"
                                    value={interfaceMac}
                                    onChange={(e) => setInterfaceMac(e.target.value)}
                                    className="bg-secondary/40 border-border/40 focus-visible:ring-primary/40 focus-visible:border-primary/50 transition-all rounded-lg"
                                />
                            </div>
                        </div>
                        <DialogFooter className="border-t border-border/20 pt-4 mt-2">
                            <Button variant="outline" onClick={() => setIsInterfaceDialogOpen(false)} className="hover:bg-secondary/60">Cancel</Button>
                            <Button onClick={handleAddInterface}>Add Interface</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent className="sm:max-w-[425px] bg-card/80 backdrop-blur-2xl border-border/40 shadow-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Edit Device</DialogTitle>
                            <DialogDescription className="text-muted-foreground/80">
                                Update device configuration.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-6 max-h-[60vh] overflow-y-auto scrollbar-hide px-1">
                            <div className="grid gap-2">
                                <Label htmlFor="hostname" className="text-sm font-medium">Hostname</Label>
                                <Input
                                    id="hostname"
                                    placeholder="server-01"
                                    value={editFormData.hostname || ""}
                                    onChange={(e) => setEditFormData({ ...editFormData, hostname: e.target.value })}
                                    className="bg-secondary/40 border-border/40"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="os" className="text-sm font-medium">Operating System</Label>
                                <Input
                                    id="os"
                                    placeholder="Ubuntu 24.04"
                                    value={editFormData.os_info || ""}
                                    onChange={(e) => setEditFormData({ ...editFormData, os_info: e.target.value })}
                                    className="bg-secondary/40 border-border/40"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-sm font-medium">Device Type</Label>
                                <Select value={editFormData.device_type} onValueChange={(v) => setEditFormData({ ...editFormData, device_type: v as DeviceType })}>
                                    <SelectTrigger className="bg-secondary/40 border-border/40">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.values(DeviceType).map(t => (
                                            <SelectItem key={t} value={t}>{t}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="cpu" className="text-xs font-medium">CPU Cores</Label>
                                    <Input id="cpu" type="number" value={editFormData.cpu_cores?.toString() || ""} onChange={(e) => setEditFormData({ ...editFormData, cpu_cores: parseInt(e.target.value) || undefined })} className="bg-secondary/40 border-border/40 h-8 text-sm" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="ram" className="text-xs font-medium">RAM (GB)</Label>
                                    <Input id="ram" type="number" step="0.5" value={editFormData.ram_gb?.toString() || ""} onChange={(e) => setEditFormData({ ...editFormData, ram_gb: parseFloat(e.target.value) || undefined })} className="bg-secondary/40 border-border/40 h-8 text-sm" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="storage" className="text-xs font-medium">Storage (GB)</Label>
                                    <Input id="storage" type="number" step="1" value={editFormData.storage_gb?.toString() || ""} onChange={(e) => setEditFormData({ ...editFormData, storage_gb: parseFloat(e.target.value) || undefined })} className="bg-secondary/40 border-border/40 h-8 text-sm" />
                                </div>
                            </div>
                        </div>
                        <DialogFooter className="border-t border-border/20 pt-4 mt-2">
                            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="hover:bg-secondary/60">Cancel</Button>
                            <Button onClick={handleSaveDevice}>Save Changes</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
};
