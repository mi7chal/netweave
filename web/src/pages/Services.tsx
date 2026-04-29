import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CrudPage } from "@/components/CrudPage";
import { ServiceDialog } from "@/components/ServiceDialog";
import { Plus, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useDeleteWithConfirm, useServices, useTableSearch } from "@/hooks";
import type { Service } from "../types/api";
import { CrudRowActions } from "@/components/CrudRowActions";

export const Services = () => {
    const { services, error, isLoading, mutate, remove } = useServices({
        onLoadError: (e) => toast.error("Failed to load services", { description: e.message }),
    });

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedService, setSelectedService] = useState<Service | null>(null);

    const { filteredData: filteredServices, setSearchTerm: setSearch, searchTerm: search } =
        useTableSearch(services, { searchableFields: ["name", "base_url"] });

    const handleDelete = async (id: string, name: string) => {
        try {
            await remove(id);
            toast.success("Service deleted", { description: `${name} has been removed.` });
        } catch (e) {
            console.error(e);
            toast.error("Failed to delete service");
            throw e;
        }
    };
    const { deleteConfirm, isDeleting, promptDelete, clearDeleteConfirm, confirmDelete } =
        useDeleteWithConfirm(handleDelete);

    const openEdit = (service: Service) => { setSelectedService(service); setIsDialogOpen(true); };
    const openCreate = () => { setSelectedService(null); setIsDialogOpen(true); };

    return (
        <>
            <CrudPage
                title="Services"
                description="Manage your dashboard applications and their status."
                emptyIcon={Plus}
                emptyTitle="No services found"
                emptyDescription="Add your first service to track its status."
                addLabel="Add Service"
                data={services}
                filteredData={filteredServices}
                isLoading={isLoading}
                error={error}
                onRetry={mutate}
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search services..."
                onAdd={openCreate}
                skeletonColumns={6}
            >
                {(items) => (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>URL</TableHead>
                                <TableHead>Visibility</TableHead>
                                <TableHead>Uptime</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell>
                                        <a href={item.base_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                                            {item.base_url} <ExternalLink size={12} />
                                        </a>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={item.is_public ? "outline" : "secondary"}>
                                            {item.is_public ? "Public" : "Private"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{(item.uptime_percentage ?? 100).toFixed(1)}%</TableCell>
                                    <TableCell>
                                        <StatusBadge status={item.status} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <CrudRowActions
                                          onEdit={() => openEdit(item)}
                                          onDelete={() => promptDelete(item.id, item.name)}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CrudPage>

            <ServiceDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSaved={() => mutate()}
                initialData={selectedService}
            />

            <ConfirmDialog
                open={!!deleteConfirm}
                onOpenChange={(open) => !open && clearDeleteConfirm()}
                onConfirm={confirmDelete}
                isSubmitting={isDeleting}
                submittingLabel="Deleting..."
                title="Delete Service?"
                description={<>This will permanently remove <span className="font-semibold">{deleteConfirm?.label}</span> and its monitoring history. This action cannot be undone.</>}
                confirmLabel="Delete Service"
            />
        </>
    );
};
