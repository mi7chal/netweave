import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/ui/glass-card";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { DeviceIcon } from "@/lib/device-utils";
import { useDebounce } from "@/hooks/useDebounce";
import { Plus, Trash2, Edit2, Server } from "lucide-react";
import { useState } from "react";
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
    const debouncedSearch = useDebounce(search);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<CreateDevicePayload>>({});
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; hostname: string } | null>(null);

    const { data: devices = [], error, isLoading, mutate } = useSWR<DeviceListView[]>(
        debouncedSearch ? `/api/devices?q=${debouncedSearch}` : "/api/devices",
        fetchApi
    );

    const handleDelete = async (id: string, hostname: string) => {
        try {
            await fetchApi(`/api/devices/${id}`, { method: "DELETE" });
            mutate();
            setDeleteConfirm(null);
            toast.success("Device deleted", { description: `${hostname} has been removed successfully.` });
        } catch (e) { console.error(e); }
    };

    const handleSave = async () => {
        try {
            await fetchApi("/api/devices", {
                method: "POST",
                body: JSON.stringify(formData),
            });
            mutate();
            setIsDialogOpen(false);
            setFormData({});
            toast.success("Device created", { description: "The new device has been added to the registry." });
        } catch (e) { console.error(e); }
    };

    const sortedDevices = [...devices].sort((a, b) => {
        const group = (d: DeviceListView) => (d.is_static === true ? 0 : d.is_static === false ? 1 : 2);
        const diff = group(a) - group(b);
        if (diff !== 0) return diff;
        // Within the same group, sort by IP numerically
        const ipToNum = (ip?: string | null) => {
            if (!ip) return Infinity;
            return ip.split(".").reduce((acc, octet) => acc * 256 + Number(octet), 0);
        };
        return ipToNum(a.primary_ip) - ipToNum(b.primary_ip);
    });

    return (
        <AppLayout>
            <div className="flex flex-col space-y-6">
                <PageHeader title="Devices" description="Manage infrastructure hardware and virtual machines.">
                    <SearchInput value={search} onChange={setSearch} placeholder="Search devices..." className="w-full md:w-64" />
                    <Button onClick={() => { setFormData({ device_type: DeviceType.Other }); setIsDialogOpen(true); }} className="gap-2 shadow-sm rounded-full h-10 px-5 flex-shrink-0 hover:scale-105 transition-all duration-300">
                        <Plus className="h-4 w-4" /> Add Device
                    </Button>
                </PageHeader>

                {isLoading ? <LoadingState /> : error ? <ErrorState message={error.message} onRetry={() => mutate()} /> : devices.length === 0 ? (
                    <EmptyState icon={Server} title="No devices found" description="Add your first hardware device or VM." />
                ) : (
                    <GlassCard>
                        <CardContent className="p-0">
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
                                    {sortedDevices.map((device) => (
                                        <TableRow key={device.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/devices/${device.id}`)}>
                                            <TableCell className="font-medium">{device.hostname}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="gap-1 hover:bg-secondary">
                                                    <DeviceIcon type={device.device_type} />
                                                    {device.device_type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {device.primary_ip ? (
                                                    <div className="flex items-center gap-2">
                                                        <TooltipProvider delayDuration={200}>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Badge variant="outline" className={device.is_static
                                                                        ? "bg-amber-500/10 text-amber-600 border-amber-500/20 text-[9px] h-4 px-1.5 shadow-sm uppercase font-semibold tracking-wider cursor-help"
                                                                        : "bg-blue-500/10 text-blue-500 border-blue-500/20 text-[9px] h-4 px-1.5 shadow-sm uppercase font-semibold tracking-wider opacity-50 cursor-help"
                                                                    }>
                                                                        {device.is_static ? "S" : "D"}
                                                                    </Badge>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="top" className="max-w-[200px]">
                                                                    {device.is_static
                                                                        ? "Static reservation — this IP is manually assigned and will not change."
                                                                        : "Dynamic lease — this IP was assigned by DHCP and may change on renewal."}
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                        <span className="font-mono text-sm">{device.primary_ip}</span>
                                                    </div>
                                                ) : <span className="text-muted-foreground">-</span>}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">{device.mac_address || <span className="text-muted-foreground">-</span>}</TableCell>
                                            <TableCell>{device.os_info || <span className="text-muted-foreground">-</span>}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/20 hover:text-primary transition-colors">
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ id: device.id, hostname: device.hostname }); }} className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors">
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

                {/* Create Device Dialog */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent className="sm:max-w-[425px] bg-card/80 backdrop-blur-2xl border-border/40 shadow-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Add New Device</DialogTitle>
                            <DialogDescription className="text-muted-foreground/80">Create a new device. You can add detailed interfaces later.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-6">
                            <div className="grid gap-2">
                                <Label htmlFor="hostname" className="text-sm font-medium">Hostname</Label>
                                <Input id="hostname" value={formData.hostname || ""} onChange={(e) => setFormData({ ...formData, hostname: e.target.value })} className="bg-secondary/40 border-border/40 focus-visible:ring-primary/40 focus-visible:border-primary/50 transition-all rounded-lg" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="type" className="text-sm font-medium">Type</Label>
                                <Select value={formData.device_type} onValueChange={(val) => setFormData({ ...formData, device_type: val as DeviceType })}>
                                    <SelectTrigger className="bg-secondary/40 border-border/40 focus:ring-primary/40 rounded-lg transition-all"><SelectValue placeholder="Select type" /></SelectTrigger>
                                    <SelectContent className="bg-card/90 backdrop-blur-xl border-border/40 shadow-xl">
                                        {Object.values(DeviceType).map((t) => <SelectItem key={t} value={t} className="hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer rounded-md mx-1 my-0.5">{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="mac" className="text-sm font-medium">Initial MAC Address (eth0)</Label>
                                <Input id="mac" placeholder="00:00:00:00:00:00" value={formData.mac_address || ""} onChange={(e) => setFormData({ ...formData, mac_address: e.target.value })} className="bg-secondary/40 border-border/40 focus-visible:ring-primary/40 focus-visible:border-primary/50 transition-all rounded-lg" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="os" className="text-sm font-medium">OS Info</Label>
                                <Input id="os" placeholder="e.g. Ubuntu 22.04" value={formData.os_info || ""} onChange={(e) => setFormData({ ...formData, os_info: e.target.value })} className="bg-secondary/40 border-border/40 focus-visible:ring-primary/40 focus-visible:border-primary/50 transition-all rounded-lg" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="ip" className="text-sm font-medium">Static IP Address (optional)</Label>
                                <Input id="ip" placeholder="192.168.1.100" value={formData.ip_address || ""} onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })} className="bg-secondary/40 border-border/40 focus-visible:ring-primary/40 focus-visible:border-primary/50 transition-all rounded-lg" />
                            </div>
                        </div>
                        <DialogFooter className="border-t border-border/20 pt-4 mt-2">
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="hover:bg-secondary/60">Cancel</Button>
                            <Button onClick={handleSave}>Create Device</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <ConfirmDialog
                    open={!!deleteConfirm}
                    onOpenChange={(open) => !open && setDeleteConfirm(null)}
                    onConfirm={() => deleteConfirm && handleDelete(deleteConfirm.id, deleteConfirm.hostname)}
                    title="Delete Device?"
                    description={<>This will permanently delete <span className="font-semibold text-foreground">{deleteConfirm?.hostname}</span> and all its associated data. This action cannot be undone.</>}
                    confirmLabel="Delete Device"
                />
            </div>
        </AppLayout>
    );
};
