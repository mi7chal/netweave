import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GlassCard } from "@/components/ui/glass-card";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { ServiceDialog } from "@/components/ServiceDialog";
import { Plus, Trash2, Edit2, ExternalLink } from "lucide-react";
import { useState, useMemo } from "react";
import useSWR from "swr";
import { AppLayout } from "../layouts/AppLayout";
import { fetchApi } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SearchInput } from "@/components/SearchInput";
import { PageHeader } from "@/components/PageHeader";
import type { Service } from "../types/api";

export const Services = () => {
    const { data, error, isLoading, mutate } = useSWR<{ services: Service[] }>("/api/dashboard", fetchApi, { refreshInterval: 10000 });
    const services = data?.services || [];

    const [search, setSearch] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

    const filteredServices = useMemo(() => {
        if (!search.trim()) return services;
        const q = search.toLowerCase();
        return services.filter(s => s.name.toLowerCase().includes(q) || s.base_url.toLowerCase().includes(q));
    }, [services, search]);

    const handleDelete = async (id: string, name: string) => {
        try {
            await fetchApi(`/api/services/${id}`, { method: "DELETE" });
            setDeleteConfirm(null);
            mutate();
            toast.success("Service deleted", { description: `${name} has been removed.` });
        } catch (e) { console.error(e); }
    };

    const openEdit = (service: Service) => { setSelectedService(service); setIsDialogOpen(true); };
    const openCreate = () => { setSelectedService(null); setIsDialogOpen(true); };

    return (
        <AppLayout>
            <div className="flex flex-col space-y-6">
                <PageHeader title="Services" description="Manage your dashboard applications and their status.">
                    <SearchInput value={search} onChange={setSearch} placeholder="Search services..." className="w-full md:w-64" />
                    <Button onClick={openCreate} className="gap-2 shadow-sm rounded-full h-10 px-5 flex-shrink-0 hover:scale-105 transition-all duration-300">
                        <Plus className="h-4 w-4" /> Add Service
                    </Button>
                </PageHeader>

                {isLoading ? <LoadingState /> : error ? <ErrorState message={error.message} onRetry={() => mutate()} /> : services.length === 0 ? (
                    <EmptyState icon={Plus} title="No services found" description="Add your first service to track its status." />
                ) : (
                    <GlassCard>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-border/30 hover:bg-transparent">
                                        <TableHead>Name</TableHead>
                                        <TableHead>URL</TableHead>
                                        <TableHead>Visibility</TableHead>
                                        <TableHead>Uptime</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredServices.map((item) => (
                                        <TableRow key={item.id} className="border-border/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                            <TableCell className="font-medium">{item.name}</TableCell>
                                            <TableCell>
                                                <a href={item.base_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                                                    {item.base_url} <ExternalLink size={12} />
                                                </a>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={item.is_public ? "outline" : "secondary"} className="shadow-sm">{item.is_public ? "Public" : "Private"}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <span className={cn(
                                                    "text-sm font-medium",
                                                    (item.uptime_percentage ?? 100) >= 99 ? "text-green-500" : (item.uptime_percentage ?? 100) >= 95 ? "text-amber-500" : "text-destructive"
                                                )}>
                                                    {(item.uptime_percentage ?? 100).toFixed(1)}%
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <StatusBadge status={item.status} />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)} className="h-8 w-8 hover:bg-primary/20 hover:text-primary transition-colors">
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

                <ServiceDialog
                    open={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    onSaved={() => mutate()}
                    initialData={selectedService}
                />

                <ConfirmDialog
                    open={!!deleteConfirm}
                    onOpenChange={(open) => !open && setDeleteConfirm(null)}
                    onConfirm={() => deleteConfirm && handleDelete(deleteConfirm.id, deleteConfirm.name)}
                    title="Delete Service?"
                    description={<>This will permanently remove <span className="font-semibold text-foreground">{deleteConfirm?.name}</span> and its monitoring history. This action cannot be undone.</>}
                    confirmLabel="Delete Service"
                />
            </div>
        </AppLayout>
    );
};
