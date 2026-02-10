import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { fetchApi } from "@/lib/api-client";
import { type DeviceDetails, DeviceType } from "@/types/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Server, Monitor, Laptop, Router, Network, Wifi, Container, Plus, Trash2, Cpu, HardDrive, MemoryStick } from "lucide-react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const DeviceDetailsPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [device, setDevice] = useState<DeviceDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [isInterfaceDialogOpen, setIsInterfaceDialogOpen] = useState(false);
    const [interfaceName, setInterfaceName] = useState("");
    const [interfaceMac, setInterfaceMac] = useState("");

    const fetchDevice = async () => {
        setIsLoading(true);
        try {
            const data = await fetchApi<DeviceDetails>(`/api/devices/${id}`);
            setDevice(data);
        } catch (e) {
            console.error(e);
            toast.error("Failed to load device details");
            navigate('/devices');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchDevice();
    }, [id]);

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
            fetchDevice();
        } catch (e) {
            console.error(e);
        }
    };

    const handleDeleteInterface = async (interfaceId: string) => {
        if (!confirm("Delete this interface?")) return;
        try {
            await fetchApi(`/api/devices/${id}/interfaces/${interfaceId}`, {
                method: 'DELETE'
            });
            toast.success("Interface deleted");
            fetchDevice();
        } catch (e) {
            console.error(e);
        }
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

    if (isLoading) return <AppLayout>Loading...</AppLayout>;
    if (!device) return <AppLayout>Device not found</AppLayout>;

    return (
        <AppLayout>
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/devices')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-md">
                            {getDeviceIcon(device.device_type)}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">{device.hostname}</h1>
                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                <Badge variant="outline">{device.device_type}</Badge>
                                <span>•</span>
                                <span>{device.os_info || "Unknown OS"}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    <Card className="md:col-span-1 h-fit">
                        <CardHeader>
                            <CardTitle>Hardware Specs</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Cpu className="h-4 w-4" /> CPU Cores
                                </div>
                                <span className="font-medium">{device.cpu_cores || "-"}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <MemoryStick className="h-4 w-4" /> RAM
                                </div>
                                <span className="font-medium">{device.ram_gb ? `${device.ram_gb} GB` : "-"}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <HardDrive className="h-4 w-4" /> Storage
                                </div>
                                <span className="font-medium">{device.storage_gb ? `${device.storage_gb} GB` : "-"}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="md:col-span-2">
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
                                    {device.interfaces.map(iface => (
                                        <Card key={iface.id}>
                                            <CardHeader className="py-3 px-4 bg-muted/30">
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
                                                            iface.ips.map(ip => (
                                                                <TableRow key={ip.id} className="hover:bg-transparent">
                                                                    <TableCell className="py-2">{ip.ip_address}</TableCell>
                                                                    <TableCell className="py-2">
                                                                        <Badge variant={ip.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-[10px] h-5">
                                                                            {ip.status}
                                                                        </Badge>
                                                                    </TableCell>
                                                                    <TableCell className="py-2 text-xs text-muted-foreground">
                                                                        {ip.is_static ? "Static" : "Dynamic"}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </TabsContent>
                            <TabsContent value="services">
                                <div className="p-4 border rounded-md bg-muted/10 text-center text-muted-foreground">
                                    Service linking coming soon...
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>

                <Dialog open={isInterfaceDialogOpen} onOpenChange={setIsInterfaceDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Interface</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Interface Name</Label>
                                <Input
                                    placeholder="eth1"
                                    value={interfaceName}
                                    onChange={(e) => setInterfaceName(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>MAC Address</Label>
                                <Input
                                    placeholder="00:00:00:00:00:00"
                                    value={interfaceMac}
                                    onChange={(e) => setInterfaceMac(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsInterfaceDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleAddInterface}>Add Interface</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
};
