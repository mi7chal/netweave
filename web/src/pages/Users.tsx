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
import { UserDialog } from "@/components/UserDialog";
import { Users as UsersIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useDeleteWithConfirm, useUsers, useTableSearch } from "@/hooks";
import { UserRole, type User } from "../types/api";
import { CrudRowActions } from "@/components/CrudRowActions";

export const Users = () => {
    const { data: users, error, isLoading, mutate, remove } = useUsers({
        onLoadError: (e) => toast.error("Failed to load users", { description: e.message }),
    });

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const { filteredData: filteredUsers, setSearchTerm: setSearch, searchTerm: search } =
        useTableSearch(users, { searchableFields: ["username", "email", "role"] });

    const handleDelete = async (id: string, username: string) => {
        try {
            await remove(id);
            toast.success("User deleted", { description: `${username} has been removed.` });
        } catch (e) {
            console.error(e);
            toast.error("Failed to delete user");
            throw e;
        }
    };
    const { deleteConfirm, isDeleting, promptDelete, clearDeleteConfirm, confirmDelete } =
        useDeleteWithConfirm(handleDelete);

    const openEdit = (user: User) => { setSelectedUser(user); setIsDialogOpen(true); };
    const openCreate = () => { setSelectedUser(null); setIsDialogOpen(true); };

    return (
        <>
            <CrudPage
                title="Users"
                description="Manage access and roles for your dashboard."
                emptyIcon={UsersIcon}
                emptyTitle="No users found"
                emptyDescription="Add users to grant them access."
                addLabel="Add User"
                data={users}
                filteredData={filteredUsers}
                isLoading={isLoading}
                error={error}
                onRetry={mutate}
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search users..."
                onAdd={openCreate}
                skeletonColumns={5}
            >
                {(items) => (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Username</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.username}</TableCell>
                                    <TableCell>{item.email}</TableCell>
                                    <TableCell>
                                        <Badge variant={item.role === UserRole.Admin ? "default" : "secondary"}>
                                            {item.role === UserRole.Admin ? "Admin" : "Viewer"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={item.is_active ? "outline" : "destructive"}>
                                            {item.is_active ? "Active" : "Disabled"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <CrudRowActions
                                          onEdit={() => openEdit(item)}
                                          onDelete={() => promptDelete(item.id, item.username)}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CrudPage>

            <UserDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSaved={() => mutate()}
                initialData={selectedUser}
            />

            <ConfirmDialog
                open={!!deleteConfirm}
                onOpenChange={(open) => !open && clearDeleteConfirm()}
                onConfirm={confirmDelete}
                isSubmitting={isDeleting}
                submittingLabel="Deleting..."
                title="Delete User?"
                description={<>This will permanently remove <span className="font-semibold">{deleteConfirm?.label}</span> and revoke their access. This action cannot be undone.</>}
                confirmLabel="Delete User"
            />
        </>
    );
};
