import { Button, Card, CardBody, CardHeader, Chip, useDisclosure } from "@heroui/react";
import { Plus, Trash2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { AppLayout } from "../components/AppLayout";
import { AddIntegrationModal } from "../components/AddIntegrationModal";

interface Integration {
    id: string;
    name: string;
    provider_type: string;
    status: string;
    last_sync_at: string | null;
}

export const Integrations = () => {
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const { isOpen, onOpen, onOpenChange } = useDisclosure();

    const fetchIntegrations = async () => {
        try {
            const res = await fetch('/api/integrations');
            if (res.ok) {
                const data = await res.json();
                setIntegrations(data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure?")) return;
        await fetch(`/api/integrations/${id}`, { method: 'DELETE' });
        fetchIntegrations();
    };

    const handleSync = async (id: string) => {
        try {
            await fetch(`/api/integrations/${id}/sync`, { method: 'POST' });
            fetchIntegrations();
            alert("Sync started!");
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchIntegrations();
    }, []);

    return (
        <AppLayout>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
                    <p className="text-default-500">Manage external connections (AdGuard, Unifi, Kea).</p>
                </div>
                <Button color="primary" variant="shadow" startContent={<Plus size={18} />} onPress={onOpen}>
                    Add Integration
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {integrations.map((int) => (
                    <Card key={int.id} className="bg-default-50 border border-white/5">
                        <CardHeader className="flex justify-between">
                            <div className="flex gap-3">
                                <div className="flex flex-col">
                                    <p className="text-md font-bold">{int.name}</p>
                                    <p className="text-small text-default-500 capitalize">{int.provider_type}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {int.status.startsWith("ERROR") ? (
                                    <div title={int.status}>
                                        <Chip color="danger" variant="flat" size="sm" className="cursor-help">ERROR</Chip>
                                    </div>
                                ) : (
                                    <Chip color={int.status === "ACTIVE" ? "success" : "warning"} variant="flat" size="sm">
                                        {int.status || "PENDING"}
                                    </Chip>
                                )}
                            </div>
                        </CardHeader>
                        <CardBody className="pt-0">
                            <div className="flex justify-between items-center mt-2">
                                <p className="text-tiny text-default-400">
                                    Last Sync: {int.last_sync_at ? new Date(int.last_sync_at).toLocaleString() : "Never"}
                                </p>
                                <div className="flex gap-2">
                                    <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(int.id)}>
                                        <Trash2 size={16} />
                                    </Button>
                                    <Button isIconOnly size="sm" variant="light" color="primary" onPress={() => handleSync(int.id)}>
                                        <RefreshCw size={16} />
                                    </Button>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                ))}
            </div>

            <AddIntegrationModal isOpen={isOpen} onOpenChange={onOpenChange} onSaved={fetchIntegrations} />
        </AppLayout>
    );
};
