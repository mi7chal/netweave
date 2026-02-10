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
import { Plus, Trash2, Edit2, Network as NetworkIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api-client";
import { AppLayout } from "../layouts/AppLayout";

interface Network {
    id: string;
    name: string;
    cidr: string;
    vlan_id?: number;
    gateway?: string;
    description?: string;
}

export const Networks = () => {
    const [networks, setNetworks] = useState<Network[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null);
    const [formData, setFormData] = useState<Partial<Network>>({});

    const fetchNetworks = async () => {
        setIsLoading(true);
        try {
            const data = await fetchApi<Network[]>('/api/networks');
            setNetworks(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchNetworks();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure? This will delete the network and all associated IP assignments.")) return;
        try {
            await fetchApi(`/api/networks/${id}`, { method: 'DELETE' });
            fetchNetworks();
        } catch (e) {
            console.error(e);
        }
    };

    const handleSave = async () => {
        try {
            const method = selectedNetwork ? 'PUT' : 'POST';
            const url = selectedNetwork ? `/api/networks/${selectedNetwork.id}` : '/api/networks';

            await fetchApi(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            fetchNetworks();
            setIsDialogOpen(false);
        } catch (e) {
            console.error(e);
        }
    };

    const openEdit = (network: Network) => {
        setSelectedNetwork(network);
        setFormData(network);
        setIsDialogOpen(true);
    };

    const openCreate = () => {
        setSelectedNetwork(null);
        setFormData({});
        setIsDialogOpen(true);
    };

    return (
        <AppLayout>
            <div className="flex flex-col space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Networks</h1>
                        <p className="text-muted-foreground">Manage IP blocks, VLANs and Subnets.</p>
                    </div>
                    <Button onClick={openCreate}>
                        <Plus className="mr-2 h-4 w-4" /> Add Network
                    </Button>
                </div>

                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>CIDR</TableHead>
                                    <TableHead>VLAN</TableHead>
                                    <TableHead>Gateway</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">Loading...</TableCell>
                                    </TableRow>
                                ) : networks.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">No networks found.</TableCell>
                                    </TableRow>
                                ) : (
                                    networks.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <NetworkIcon className="h-4 w-4 text-muted-foreground" />
                                                    {item.name}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{item.cidr}</Badge>
                                            </TableCell>
                                            <TableCell>{item.vlan_id || "-"}</TableCell>
                                            <TableCell>{item.gateway || "-"}</TableCell>
                                            <TableCell className="text-muted-foreground text-sm">{item.description || "-"}</TableCell>
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
                            <DialogTitle>{selectedNetwork ? "Edit Network" : "New Network"}</DialogTitle>
                            <DialogDescription>
                                Defines a network segment.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    placeholder="Home LAN"
                                    value={formData.name || ""}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="cidr">CIDR</Label>
                                <Input
                                    id="cidr"
                                    placeholder="192.168.1.0/24"
                                    value={formData.cidr || ""}
                                    onChange={(e) => setFormData({ ...formData, cidr: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="vlan">VLAN ID</Label>
                                    <Input
                                        id="vlan"
                                        type="number"
                                        placeholder="10"
                                        value={formData.vlan_id?.toString() || ""}
                                        onChange={(e) => setFormData({ ...formData, vlan_id: parseInt(e.target.value) || undefined })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="gateway">Gateway</Label>
                                    <Input
                                        id="gateway"
                                        placeholder="192.168.1.1"
                                        value={formData.gateway || ""}
                                        onChange={(e) => setFormData({ ...formData, gateway: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="desc">Description</Label>
                                <Input
                                    id="desc"
                                    placeholder="Main trusted network"
                                    value={formData.description || ""}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
