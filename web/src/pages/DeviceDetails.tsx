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

import { Server, Monitor, Laptop, Router, Network, Wifi, Container, Plus, Trash2, Cpu, HardDrive, MemoryStick, Edit2 } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";

import { InterfaceDialog } from "@/components/InterfaceDialog";
import { AssignStaticIpDialog } from "@/components/AssignStaticIpDialog";
import { EditDeviceDialog } from "@/components/EditDeviceDialog";

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

    const [isEditInterfaceDialogOpen, setIsEditInterfaceDialogOpen] = useState(false);
    const [selectedInterfaceId, setSelectedInterfaceId] = useState<string | null>(null);
    const [editInterfaceName, setEditInterfaceName] = useState("");
    const [editInterfaceMac, setEditInterfaceMac] = useState("");

    const [isMakeStaticDialogOpen, setIsMakeStaticDialogOpen] = useState(false);
    const [makeStaticIpData, setMakeStaticIpData] = useState<{ id: string, ip: string, mac: string | null, networkId: string } | null>(null);
    const [customStaticIp, setCustomStaticIp] = useState("");

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editFormData, setEditFormData] = useState<Partial<CreateDevicePayload>>({});

    const handleAddInterface = async (name: string, mac: string) => {
        try {
            await fetchApi(`/api/devices/${id}/interfaces`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name,
                    mac_address: mac || null,
                    interface_type: 'ethernet'
                })
            });
            toast.success("Interface added");
            setIsInterfaceDialogOpen(false);
            mutate();
        } catch (error) {
            console.error(error);
            toast.error("Failed to add interface");
        }
    };

    const handleEditInterface = async (name: string, mac: string) => {
        if (!selectedInterfaceId) return;
        try {
            await fetchApi(`/api/devices/${id}/interfaces/${selectedInterfaceId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name,
                    mac_address: mac || null,
                    interface_type: 'ethernet'
                })
            });
            toast.success("Interface updated");
            setIsEditInterfaceDialogOpen(false);
            mutate();
        } catch (error) {
            console.error(error);
            toast.error("Failed to update interface");
        }
    };

    const openEditInterface = (iface: DeviceDetails['interfaces'][0]) => {
        setSelectedInterfaceId(iface.id);
        setEditInterfaceName(iface.name);
        setEditInterfaceMac(iface.mac_address || "");
        setIsEditInterfaceDialogOpen(true);
    };

    const openMakeStaticDialog = (ipId: string, currentIp: string, currentMac: string | null, networkId: string | undefined) => {
        if (!networkId) {
            toast.error("Cannot make static: missing network ID on IP.");
            return;
        }
        setMakeStaticIpData({ id: ipId, ip: currentIp, mac: currentMac, networkId });
        setCustomStaticIp(currentIp); // Default to current IP
        setIsMakeStaticDialogOpen(true);
    };

    const handleConfirmMakeStatic = async (targetIp: string) => {
        if (!makeStaticIpData) return;
        const { id: ipId, mac: currentMac } = makeStaticIpData;

        try {
            // Update the IP assignment to static
            await fetchApi(`/api/devices/${id}/ips/${ipId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ip_address: targetIp,
                    mac_address: currentMac,
                    is_static: "true",
                    status: 'ACTIVE'
                })
            });

            toast.success(`IP ${targetIp} is now statically assigned`);
            setIsMakeStaticDialogOpen(false);
            setMakeStaticIpData(null);
            mutate();
        } catch (error) {
            console.error(error);
            toast.error("Failed to make IP static");
        }
    };

    const handleReleaseStatic = async (ipId: string) => {
        try {
            await fetchApi(`/api/devices/${id}/ips/${ipId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    is_static: "false",
                    status: 'ACTIVE'
                })
            });

            toast.success("Static IP released and is now back to dynamic");
            mutate();
        } catch (error) {
            console.error(error);
            toast.error("Failed to release static IP");
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

    const handleSaveDevice = async (data: Partial<CreateDevicePayload>) => {
        try {
            await fetchApi(`/api/devices/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
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
            device_type: device.device_type || DeviceType.Other,
            os_info: device.os_info || "",
            cpu_cores: device.cpu_cores || undefined,
            ram_gb: device.ram_gb || undefined,
            storage_gb: device.storage_gb || undefined,
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
                                                        <div className="flex gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                                onClick={() => openEditInterface(iface)}
                                                            >
                                                                <Edit2 className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                                onClick={() => handleDeleteInterface(iface.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="py-3">
                                                    <div className="space-y-4">
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow className="hover:bg-transparent">
                                                                    <TableHead className="h-8">IP Address</TableHead>
                                                                    <TableHead className="h-8">Type</TableHead>
                                                                    <TableHead className="h-8">State</TableHead>
                                                                    <TableHead className="h-8 text-right">Actions</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {iface.ips.length === 0 ? (
                                                                    <TableRow className="hover:bg-transparent">
                                                                        <TableCell colSpan={4} className="text-muted-foreground text-xs h-8 py-2 text-center">
                                                                            No IP addresses assigned.
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ) : (
                                                                    iface.ips.map((ip) => (
                                                                        <TableRow key={ip.id} className="hover:bg-transparent">
                                                                            <TableCell className="py-2.5 font-mono text-sm">{ip.ip_address}</TableCell>
                                                                            <TableCell className="py-2.5">
                                                                                {ip.is_static ? (
                                                                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] h-5 shadow-sm uppercase font-semibold tracking-wider">
                                                                                        STATIC
                                                                                    </Badge>
                                                                                ) : (
                                                                                    <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px] h-5 shadow-sm uppercase font-semibold tracking-wider">
                                                                                        DYNAMIC
                                                                                    </Badge>
                                                                                )}
                                                                            </TableCell>
                                                                            <TableCell className="py-2.5">
                                                                                <Badge variant="outline" className={cn(
                                                                                    "text-[10px] h-5 shadow-sm uppercase font-semibold tracking-wider",
                                                                                    ip.status === 'ACTIVE' && ip.is_static ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                                                                                        ip.status === 'ACTIVE' && !ip.is_static ? "bg-green-500/10 text-green-600 border-green-500/20" :
                                                                                            ip.status === 'RESERVED' ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                                                                                                "bg-secondary/50 text-muted-foreground border-border/50"
                                                                                )}>
                                                                                    {ip.status === 'RESERVED' ? 'DHCP RSV' : ip.status === 'ACTIVE' ? (ip.is_static ? 'ACTIVE' : 'DHCP DYN') : ip.status}
                                                                                </Badge>
                                                                            </TableCell>
                                                                            <TableCell className="py-2.5 text-right flex justify-end gap-2">
                                                                                {ip.is_static ? (
                                                                                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleReleaseStatic(ip.id)}>
                                                                                        Make Dynamic
                                                                                    </Button>
                                                                                ) : (
                                                                                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openMakeStaticDialog(ip.id, ip.ip_address, iface.mac_address, ip.network_id)}>
                                                                                        Make Static
                                                                                    </Button>
                                                                                )}
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))
                                                                )}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
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

                <InterfaceDialog
                    open={isInterfaceDialogOpen}
                    onOpenChange={setIsInterfaceDialogOpen}
                    onSubmit={handleAddInterface}
                    mode="add"
                />

                <InterfaceDialog
                    open={isEditInterfaceDialogOpen}
                    onOpenChange={setIsEditInterfaceDialogOpen}
                    onSubmit={handleEditInterface}
                    initialName={editInterfaceName}
                    initialMac={editInterfaceMac}
                    mode="edit"
                />

                <AssignStaticIpDialog
                    open={isMakeStaticDialogOpen}
                    onOpenChange={setIsMakeStaticDialogOpen}
                    onSubmit={handleConfirmMakeStatic}
                    defaultIp={customStaticIp}
                    macLabel={makeStaticIpData?.mac || undefined}
                />

                <EditDeviceDialog
                    open={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                    onSubmit={handleSaveDevice}
                    initialData={editFormData}
                />
            </div>
        </AppLayout>
    );
};
