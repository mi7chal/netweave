import { Button, Card, CardBody, Chip, useDisclosure, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { Plus, Trash2, Search, Edit2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AppLayout } from "../components/AppLayout";

interface Device {
    id: string;
    hostname: string;
    device_type: string;
    ip_address?: string;
    mac_address?: string;
    owner?: string;
    cpu_cores?: number;
    ram_gb?: number;
    storage_gb?: number;
    os_info?: string;
}

export const Devices = () => {
    const [devices, setDevices] = useState<Device[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<Device>>({});

    const fetchDevices = async (query = "") => {
        setIsLoading(true);
        try {
            const url = query ? `/api/devices?q=${query}` : '/api/devices';
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setDevices(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchDevices(search);
        }, 300);
        return () => clearTimeout(timeout);
    }, [search]);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this device?")) return;
        try {
            await fetch(`/api/devices/${id}`, { method: 'DELETE' });
            fetchDevices(search);
        } catch (e) {
            console.error(e);
        }
    };

    const handleSave = async (onClose: () => void) => {
        try {
            const method = selectedDevice ? 'PUT' : 'POST';
            const url = selectedDevice ? `/api/devices/${selectedDevice.id}` : '/api/devices';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                fetchDevices(search);
                onClose();
            } else {
                alert("Failed to save device");
            }
        } catch (e) {
            console.error(e);
        }
    };

    const openEdit = (device: Device) => {
        setSelectedDevice(device);
        setFormData(device);
        onOpen();
    };

    const openCreate = () => {
        setSelectedDevice(null);
        setFormData({ device_type: "Server" });
        onOpen();
    };

    return (
        <AppLayout>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Devices</h1>
                    <p className="text-default-500">Manage infrastructure hardware and virtual machines.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <Input
                        placeholder="Search devices..."
                        startContent={<Search size={18} />}
                        value={search}
                        onValueChange={setSearch}
                        className="w-full md:w-64"
                    />
                    <Button color="primary" variant="shadow" startContent={<Plus size={18} />} onPress={openCreate}>
                        Add Device
                    </Button>
                </div>
            </div>

            <Card className="bg-default-50 border border-white/5">
                <CardBody>
                    <Table aria-label="Devices table" removeWrapper color="primary" selectionMode="none">
                        <TableHeader>
                            <TableColumn>HOSTNAME</TableColumn>
                            <TableColumn>TYPE</TableColumn>
                            <TableColumn>IP ADDRESS</TableColumn>
                            <TableColumn>MAC ADDRESS</TableColumn>
                            <TableColumn>OS</TableColumn>
                            <TableColumn align="end">ACTIONS</TableColumn>
                        </TableHeader>
                        <TableBody emptyContent={"No devices found."} items={devices} isLoading={isLoading}>
                            {(item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-bold">{item.hostname}</TableCell>
                                    <TableCell>
                                        <Chip size="sm" variant="flat" color="secondary">{item.device_type}</Chip>
                                    </TableCell>
                                    <TableCell>{item.ip_address || "-"}</TableCell>
                                    <TableCell className="font-mono text-tiny">{item.mac_address || "-"}</TableCell>
                                    <TableCell>{item.os_info || "-"}</TableCell>
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

            <Modal isOpen={isOpen} onOpenChange={onOpenChange} backdrop="blur" size="2xl">
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader>{selectedDevice ? "Edit Device" : "New Device"}</ModalHeader>
                            <ModalBody>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        label="Hostname"
                                        placeholder="server-01"
                                        value={formData.hostname || ""}
                                        onValueChange={(v) => setFormData({ ...formData, hostname: v })}
                                        isRequired
                                    />
                                    <Input
                                        label="Type"
                                        placeholder="Server, VM, IoT"
                                        value={formData.device_type || ""}
                                        onValueChange={(v) => setFormData({ ...formData, device_type: v })}
                                    />
                                    <Input
                                        label="IP Address"
                                        placeholder="192.168.1.10"
                                        value={formData.ip_address || ""}
                                        onValueChange={(v) => setFormData({ ...formData, ip_address: v })}
                                    />
                                    <Input
                                        label="MAC Address"
                                        placeholder="00:11:22:33:44:55"
                                        value={formData.mac_address || ""}
                                        onValueChange={(v) => setFormData({ ...formData, mac_address: v })}
                                    />
                                    <Input
                                        label="OS Info"
                                        placeholder="Ubuntu 22.04"
                                        value={formData.os_info || ""}
                                        onValueChange={(v) => setFormData({ ...formData, os_info: v })}
                                    />
                                    <Input
                                        label="Owner"
                                        placeholder="Admin"
                                        value={formData.owner || ""}
                                        onValueChange={(v) => setFormData({ ...formData, owner: v })}
                                    />
                                    <Input
                                        type="number"
                                        label="CPU Cores"
                                        placeholder="4"
                                        value={formData.cpu_cores?.toString() || ""}
                                        onValueChange={(v) => setFormData({ ...formData, cpu_cores: parseInt(v) || undefined })}
                                    />
                                    <Input
                                        type="number"
                                        label="RAM (GB)"
                                        placeholder="16"
                                        value={formData.ram_gb?.toString() || ""}
                                        onValueChange={(v) => setFormData({ ...formData, ram_gb: parseFloat(v) || undefined })}
                                    />
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
