import { Button, Card, CardBody, Chip, useDisclosure, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Switch } from "@heroui/react";
import { Plus, Trash2, Edit2, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { AppLayout } from "../components/AppLayout";

interface Service {
    id: string;
    name: string;
    base_url: string;
    icon_url?: string;
    is_public: boolean;
    monitor_interval_seconds?: number;
    status: string;
}

export const Services = () => {
    const [services, setServices] = useState<Service[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [formData, setFormData] = useState<Partial<Service>>({});

    const fetchServices = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/dashboard');
            if (res.ok) {
                const data = await res.json();
                setServices(data.services || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchServices();
        const interval = setInterval(fetchServices, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure?")) return;
        try {
            await fetch(`/api/services/${id}`, { method: 'DELETE' });
            fetchServices();
        } catch (e) {
            console.error(e);
        }
    };

    const handleSave = async (onClose: () => void) => {
        try {
            const url = selectedService ? `/api/services/${selectedService.id}` : '/api/services';

            const res = await fetch(url, {
                method: 'POST', // Backend handlers use POST for both currently in router for update? Let's check router. API says: POST handlers::update_service
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                fetchServices();
                onClose();
            } else {
                alert("Failed to save service");
            }
        } catch (e) {
            console.error(e);
        }
    };

    const openEdit = (service: Service) => {
        setSelectedService(service);
        setFormData(service);
        onOpen();
    };

    const openCreate = () => {
        setSelectedService(null);
        setFormData({ is_public: false });
        onOpen();
    };

    return (
        <AppLayout>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Services</h1>
                    <p className="text-default-500">Manage dashboard shortcuts and monitoring.</p>
                </div>
                <div className="flex gap-2">
                    <Button color="primary" variant="shadow" startContent={<Plus size={18} />} onPress={openCreate}>
                        Add Service
                    </Button>
                </div>
            </div>

            <Card className="bg-default-50 border border-white/5">
                <CardBody>
                    <Table aria-label="Services table" removeWrapper color="primary" selectionMode="none">
                        <TableHeader>
                            <TableColumn>NAME</TableColumn>
                            <TableColumn>URL</TableColumn>
                            <TableColumn>VISIBILITY</TableColumn>
                            <TableColumn>STATUS</TableColumn>
                            <TableColumn align="end">ACTIONS</TableColumn>
                        </TableHeader>
                        <TableBody emptyContent={"No services found."} items={services} isLoading={isLoading}>
                            {(item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-bold">{item.name}</TableCell>
                                    <TableCell>
                                        <a href={item.base_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                                            {item.base_url} <ExternalLink size={12} />
                                        </a>
                                    </TableCell>
                                    <TableCell>
                                        <Chip size="sm" variant="flat" color={item.is_public ? "success" : "default"}>
                                            {item.is_public ? "Public" : "Private"}
                                        </Chip>
                                    </TableCell>
                                    <TableCell>
                                        <Chip size="sm" variant="dot" color={item.status === "UP" ? "success" : "danger"}>
                                            {item.status}
                                        </Chip>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-end gap-2">
                                            <Button isIconOnly size="sm" variant="light" onPress={() => openEdit(item)}>
                                                <Edit2 size={16} />
                                            </Button>
                                            <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(item.id)}>
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardBody>
            </Card>

            <Modal isOpen={isOpen} onOpenChange={onOpenChange} backdrop="blur">
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader>{selectedService ? "Edit Service" : "New Service"}</ModalHeader>
                            <ModalBody>
                                <div className="grid grid-cols-1 gap-4">
                                    <Input
                                        label="Name"
                                        placeholder="Plex"
                                        value={formData.name || ""}
                                        onValueChange={(v) => setFormData({ ...formData, name: v })}
                                        isRequired
                                    />
                                    <Input
                                        label="URL"
                                        placeholder="http://192.168.1.50:32400"
                                        value={formData.base_url || ""}
                                        onValueChange={(v) => setFormData({ ...formData, base_url: v })}
                                        isRequired
                                    />
                                    <div className="flex items-center justify-between p-2 border rounded-lg border-default-200">
                                        <span className="text-small">Publicly Visible</span>
                                        <Switch
                                            isSelected={formData.is_public}
                                            onValueChange={(v) => setFormData({ ...formData, is_public: v })}
                                        />
                                    </div>
                                </div>
                            </ModalBody>
                            <ModalFooter>
                                <Button variant="flat" onPress={onClose}>Cancel</Button>
                                <Button color="primary" onPress={() => handleSave(onClose)}>Save</Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </AppLayout>
    );
};
