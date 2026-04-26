import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CrudPage } from "@/components/CrudPage";
import { Trash2, Edit2, Network as NetworkIcon } from "lucide-react";
import { useState } from "react";
import { useCRUDList, useDeleteWithConfirm, useTableSearch } from "@/hooks";
import { toast } from "sonner";
import { NetworkDialog, type Network } from "@/components/NetworkDialog";

export const Networks = () => {
    const { data: networks, error, isLoading, mutate, remove } = useCRUDList<Network>({
        endpoint: "/api/networks",
        onLoadError: (e) => toast.error("Failed to load networks", { description: e.message }),
    });

    const { searchTerm: search, setSearchTerm: setSearch, filteredData: filteredNetworks } =
        useTableSearch(networks, { searchableFields: ["name", "cidr", "description"] });

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null);

    const handleDelete = async (id: string, name: string) => {
        try {
            await remove(id);
            toast.success("Network deleted", { description: `${name} has been removed successfully.` });
        } catch (e) {
            console.error(e);
            toast.error("Failed to delete network", { description: "An error occurred while deleting the network." });
            throw e;
        }
    };
    const { deleteConfirm, isDeleting, promptDelete, clearDeleteConfirm, confirmDelete } =
        useDeleteWithConfirm(handleDelete);

    const openCreate = () => { setSelectedNetwork(null); setIsDialogOpen(true); };

    return (
        <>
            <CrudPage
                title="Networks"
                description="Manage IP blocks, VLANs and Subnets."
                emptyIcon={NetworkIcon}
                emptyTitle="No networks found"
                emptyDescription="Create your first network to start managing subnets."
                addLabel="Add Network"
                data={networks}
                filteredData={filteredNetworks}
                isLoading={isLoading}
                error={error}
                onRetry={mutate}
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search networks..."
                onAdd={openCreate}
                skeletonColumns={6}
            >
                {(items) => (
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
                            {items.map((item) => (
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
                                            <Button variant="ghost" size="icon" onClick={() => promptDelete(item.id, item.name)} className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CrudPage>

            <NetworkDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSaved={() => { mutate(); setIsDialogOpen(false); }}
                initialData={selectedNetwork}
            />

            <ConfirmDialog
                open={!!deleteConfirm}
                onOpenChange={(open) => !open && clearDeleteConfirm()}
                onConfirm={confirmDelete}
                isSubmitting={isDeleting}
                submittingLabel="Deleting..."
                title="Delete Network?"
                description={<>This will permanently delete the <span className="font-semibold text-foreground">{deleteConfirm?.label}</span> network and all associated IP assignments. This action cannot be undone.</>}
                confirmLabel="Delete Network"
            />
        </>
    );
};
