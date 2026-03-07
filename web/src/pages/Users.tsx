import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GlassCard } from "@/components/ui/glass-card";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { DataFetcher } from "@/components/DataFetcher";
import { UserDialog } from "@/components/UserDialog";
import { TableLoadingSkeleton } from "@/components/LoadingSkeletons";
import { Plus, Trash2, Edit2, Users as UsersIcon } from "lucide-react";
import { useState } from "react";
import { AppLayout } from "../layouts/AppLayout";
import { toast } from "sonner";
import { useUsers, useTableSearch } from "@/hooks";
import { SearchInput } from "@/components/SearchInput";
import { PageHeader } from "@/components/PageHeader";
import type { User } from "../types/api";

export const Users = () => {
    const { data: users, error, isLoading, mutate, remove } = useUsers({
        onError: (e) => toast.error("Failed to load users", { description: e.message }),
    });

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; username: string } | null>(null);

    const { filteredData: filteredUsers, setSearchTerm: setSearch, searchTerm: search } = useTableSearch(users, {
        searchableFields: ["username", "email", "role"],
    });

    const handleDelete = async (id: string, username: string) => {
        try {
            await remove(id);
            setDeleteConfirm(null);
            toast.success("User deleted", { description: `${username} has been removed.` });
        } catch (e) {
            console.error(e);
            const err = e as Error;
            toast.error("Error deleting user", { description: err.message });
        }
    };

    const openEdit = (user: User) => { setSelectedUser(user); setIsDialogOpen(true); };
    const openCreate = () => { setSelectedUser(null); setIsDialogOpen(true); };

    return (
        <AppLayout>
            <div className="flex flex-col space-y-6">
                <PageHeader title="Users" description="Manage access and roles for your dashboard.">
                    <SearchInput value={search} onChange={setSearch} placeholder="Search users..." className="w-full md:w-64" />
                    <Button onClick={openCreate} className="gap-2 shadow-sm rounded-full h-10 px-5 flex-shrink-0 hover:scale-105 transition-all duration-300">
                        <Plus className="h-4 w-4" /> Add User
                    </Button>
                </PageHeader>

                <DataFetcher
                    data={users}
                    isLoading={isLoading}
                    error={error}
                    onRetry={mutate}
                    loadingComponent={
                        <GlassCard>
                            <CardContent className="p-6">
                                <TableLoadingSkeleton rows={5} columns={5} />
                            </CardContent>
                        </GlassCard>
                    }
                    errorComponent={(err, retry) => (
                        <ErrorState message={err.message} onRetry={retry} />
                    )}
                    emptyComponent={() => (
                        <EmptyState icon={UsersIcon} title="No users found" description="Add users to grant them access." />
                    )}
                >
                    {() => (
                        <GlassCard>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-border/30 hover:bg-transparent">
                                            <TableHead>Username</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredUsers.map((item) => (
                                            <TableRow key={item.id} className="border-border/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                                <TableCell className="font-medium">{item.username}</TableCell>
                                                <TableCell>{item.email}</TableCell>
                                                <TableCell>
                                                    <Badge variant={item.role === "ADMIN" ? "default" : "secondary"}>
                                                        {item.role === "ADMIN" ? "Admin" : "Viewer"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={item.is_active ? "outline" : "destructive"} className="shadow-sm">
                                                        {item.is_active ? "Active" : "Disabled"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)} className="h-8 w-8 hover:bg-primary/20 hover:text-primary transition-colors">
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm({ id: item.id, username: item.username })} className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors">
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

                <UserDialog
                    open={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    onSaved={() => mutate()}
                    initialData={selectedUser}
                />

                <ConfirmDialog
                    open={!!deleteConfirm}
                    onOpenChange={(open) => !open && setDeleteConfirm(null)}
                    onConfirm={() => deleteConfirm && handleDelete(deleteConfirm.id, deleteConfirm.username)}
                    title="Delete User?"
                    description={<>This will permanently remove <span className="font-semibold text-foreground">{deleteConfirm?.username}</span> and revoke their access. This action cannot be undone.</>}
                    confirmLabel="Delete User"
                />
            </div>
        </AppLayout>
    );
};
