import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";

import { Plus, Trash2, Edit2, Network as NetworkIcon } from "lucide-react";
import { useState, useMemo } from "react";
import useSWR from "swr";
import { fetchApi } from "@/lib/api-client";
import { toast } from "sonner";
import { AppLayout } from "../layouts/AppLayout";
import { SearchInput } from "@/components/SearchInput";
import { PageHeader } from "@/components/PageHeader";

import { NetworkDialog, type Network } from "@/components/NetworkDialog";

export const Networks = () => {
    const { data: networks = [], isLoading, mutate } = useSWR<Network[]>('/api/networks', fetchApi);

    const [search, setSearch] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null);

    const filteredNetworks = useMemo(() => {
        if (!search.trim()) return networks;
        const q = search.toLowerCase();
        return networks.filter(n =>
            n.name.toLowerCase().includes(q) ||
            n.cidr.toLowerCase().includes(q) ||
            (n.description && n.description.toLowerCase().includes(q))
        );
    }, [networks, search]);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete the network "${name}"? This will also remove associated IP assignments.`)) return;
        try {
            await fetchApi(`/api/networks/${id}`, { method: 'DELETE' });
            mutate();
            toast.success("Network deleted", { description: `${name} has been removed successfully.` });
        } catch (e) {
            console.error(e);
            toast.error("Failed to delete network", { description: "An error occurred while deleting the network." });
        }
    };

    const handleSaved = () => {
        mutate();
        setIsDialogOpen(false);
    };

    const openEdit = (network: Network) => {
        setSelectedNetwork(network);
        setIsDialogOpen(true);
    };

    const openCreate = () => {
        setSelectedNetwork(null);
        setIsDialogOpen(true);
    };

    return (
        <AppLayout>
            <div className="flex flex-col space-y-6">
                <PageHeader
                    title="Networks"
                    description="Manage IP blocks, VLANs and Subnets."
                >
                    <SearchInput
                        value={search}
                        onChange={setSearch}
                        placeholder="Search networks..."
                        className="w-full md:w-64"
                    />
                    <Button onClick={openCreate} className="gap-2 shadow-sm rounded-full h-10 px-5 flex-shrink-0 hover:scale-105 transition-all duration-300">
                        <Plus className="h-4 w-4" /> Add Network
                    </Button>
                </PageHeader>

                {isLoading ? (
                    <div className="text-center py-10 text-muted-foreground animate-pulse font-medium">Loading...</div>
                ) : networks.length === 0 ? (
                    <div className="text-center py-20 bg-white/40 dark:bg-white/5 backdrop-blur-md border border-black/5 dark:border-white/10 rounded-3xl mt-6 shadow-sm">
                        <NetworkIcon className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-foreground">No networks found</h3>
                        <p className="text-sm text-muted-foreground mt-1">Create your first network to start managing subnets.</p>
                    </div>
                ) : (
                    <Card className="border border-white/40 dark:border-white/10 bg-gradient-to-br from-white/60 to-white/30 dark:from-white/10 dark:to-white/5 backdrop-blur-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] overflow-hidden relative">
                        {/* Glass Reflection Highlight */}
                        <div className="absolute inset-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] pointer-events-none z-20 rounded-xl" />
                        <CardContent className="p-0 relative z-10">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-border/30 hover:bg-transparent">
                                        <TableHead>Name</TableHead>
                                        <TableHead>CIDR</TableHead>
                                        <TableHead>VLAN</TableHead>
                                        <TableHead>Gateway</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredNetworks.map((item) => (
                                        <TableRow key={item.id} className="border-border/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <NetworkIcon className="h-4 w-4 text-muted-foreground" />
                                                    {item.name}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="shadow-sm">{item.cidr}</Badge>
                                            </TableCell>
                                            <TableCell>{item.vlan_id || "-"}</TableCell>
                                            <TableCell>{item.gateway || "-"}</TableCell>
                                            <TableCell className="text-muted-foreground text-sm">{item.description || "-"}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)} className="h-8 w-8 hover:bg-primary/20 hover:text-primary transition-colors">
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id, item.name)} className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors">
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

                <NetworkDialog
                    open={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    onSaved={handleSaved}
                    initialData={selectedNetwork}
                />
            </div>
        </AppLayout>
    );
};
