import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GlassCard } from "@/components/ui/glass-card";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { TableLoadingSkeleton } from "@/components/LoadingSkeletons";
import { DataFetcher } from "@/components/DataFetcher";
import { Plus, Trash2, Edit2, Network as NetworkIcon } from "lucide-react";
import { useState } from "react";
import { useCRUDList, useTableSearch } from "@/hooks";
import { toast } from "sonner";
import { AppLayout } from "../layouts/AppLayout";
import { SearchInput } from "@/components/SearchInput";
import { PageHeader } from "@/components/PageHeader";
import { NetworkDialog, type Network } from "@/components/NetworkDialog";

export const Networks = () => {
    const { data: networks, error, isLoading, mutate, remove } = useCRUDList<Network>({
        endpoint: "/api/networks",
        onError: (e) => toast.error("Failed to load networks", { description: e.message }),
    });

    const { searchTerm: search, setSearchTerm: setSearch, filteredData: filteredNetworks } = useTableSearch(networks, {
        searchableFields: ["name", "cidr", "description"],
    });

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

    const handleDelete = async (id: string, name: string) => {
        try {
            await remove(id);
            setDeleteConfirm(null);
            toast.success("Network deleted", { description: `${name} has been removed successfully.` });
        } catch (e) {
            console.error(e);
            toast.error("Failed to delete network", { description: "An error occurred while deleting the network." });
        }
    };

    return (
        <AppLayout>
            <div className="flex flex-col space-y-6">
                <PageHeader title="Networks" description="Manage IP blocks, VLANs and Subnets.">
                    <SearchInput value={search} onChange={setSearch} placeholder="Search networks..." className="w-full md:w-64" />
                    <Button onClick={() => { setSelectedNetwork(null); setIsDialogOpen(true); }} className="gap-2 shadow-sm rounded-full h-10 px-5 flex-shrink-0 hover:scale-105 transition-all duration-300">
                        <Plus className="h-4 w-4" /> Add Network
                    </Button>
                </PageHeader>

                <DataFetcher
                    data={networks}
                    isLoading={isLoading}
                    error={error}
                    onRetry={mutate}
                    loadingComponent={
                        <GlassCard>
                            <CardContent className="p-6">
                                <TableLoadingSkeleton rows={5} columns={6} />
                            </CardContent>
                        </GlassCard>
                    }
                    errorComponent={(err, retry) => (
                        <ErrorState message={err.message} onRetry={retry} />
                    )}
                    emptyComponent={() => (
                        <EmptyState icon={NetworkIcon} title="No networks found" description="Create your first network to start managing subnets." />
                    )}
                >
                    {() => (
                        <GlassCard>
                            <CardContent className="p-0">
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
                                                <TableCell><Badge variant="outline" className="shadow-sm">{item.cidr}</Badge></TableCell>
                                                <TableCell>{item.vlan_id || "-"}</TableCell>
                                                <TableCell>{item.gateway || "-"}</TableCell>
                                                <TableCell className="text-muted-foreground text-sm">{item.description || "-"}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button variant="ghost" size="icon" onClick={() => { setSelectedNetwork(item); setIsDialogOpen(true); }} className="h-8 w-8 hover:bg-primary/20 hover:text-primary transition-colors">
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
                </DataFetcher>

                <NetworkDialog
                    open={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    onSaved={() => { mutate(); setIsDialogOpen(false); }}
                    initialData={selectedNetwork}
                />

                <ConfirmDialog
                    open={!!deleteConfirm}
                    onOpenChange={(open) => !open && setDeleteConfirm(null)}
                    onConfirm={() => deleteConfirm && handleDelete(deleteConfirm.id, deleteConfirm.name)}
                    title="Delete Network?"
                    description={<>This will permanently delete the <span className="font-semibold text-foreground">{deleteConfirm?.name}</span> network and all associated IP assignments. This action cannot be undone.</>}
                    confirmLabel="Delete Network"
                />
            </div>
        </AppLayout>
    );
};
