import { Button, Card, CardBody, Chip, useDisclosure, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { Plus, Trash2, Edit2, Network as NetworkIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { AppLayout } from "../components/AppLayout";

interface Network {
    id: string;
    name: string;
    cidr: string;
    vlan_id?: number;
    gateway?: string;
    description?: string;
}

export const Networks = () => {
    const [networks, setNetworks] = useState<Network[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null);
    const [formData, setFormData] = useState<Partial<Network>>({});

    const fetchNetworks = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/networks');
            if (res.ok) {
                const data = await res.json();
                setNetworks(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchNetworks();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure? This will delete the network and all associated IP assignments.")) return;
        try {
            await fetch(`/api/networks/${id}`, { method: 'DELETE' });
            fetchNetworks();
        } catch (e) {
            console.error(e);
        }
    };

    const handleSave = async (onClose: () => void) => {
        try {
            const method = selectedNetwork ? 'PUT' : 'POST';
            const url = selectedNetwork ? `/api/networks/${selectedNetwork.id}` : '/api/networks';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                fetchNetworks();
                onClose();
            } else {
                alert("Failed to save network");
            }
        } catch (e) {
            console.error(e);
        }
    };

    const openEdit = (network: Network) => {
        setSelectedNetwork(network);
        setFormData(network);
        onOpen();
    };

    const openCreate = () => {
        setSelectedNetwork(null);
        setFormData({});
        onOpen();
    };

    return (
        <AppLayout>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Networks</h1>
                    <p className="text-default-500">Manage IP blocks, VLANs and Subnets.</p>
                </div>
                <div className="flex gap-2">
                    <Button color="primary" variant="shadow" startContent={<Plus size={18} />} onPress={openCreate}>
                        Add Network
                    </Button>
                </div>
            </div>

            <Card className="bg-default-50 border border-white/5">
                <CardBody>
                    <Table aria-label="Networks table" removeWrapper color="primary" selectionMode="none">
                        <TableHeader>
                            <TableColumn>NAME</TableColumn>
                            <TableColumn>CIDR</TableColumn>
                            <TableColumn>VLAN</TableColumn>
                            <TableColumn>GATEWAY</TableColumn>
                            <TableColumn>DESCRIPTION</TableColumn>
                            <TableColumn align="end">ACTIONS</TableColumn>
                        </TableHeader>
                        <TableBody emptyContent={"No networks found."} items={networks} isLoading={isLoading}>
                            {(item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-bold">
                                        <div className="flex items-center gap-2">
                                            <NetworkIcon size={16} className="text-default-400" />
                                            {item.name}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Chip size="sm" variant="flat" color="primary">{item.cidr}</Chip>
                                    </TableCell>
                                    <TableCell>{item.vlan_id || "-"}</TableCell>
                                    <TableCell>{item.gateway || "-"}</TableCell>
                                    <TableCell className="text-default-400 text-tiny">{item.description || "-"}</TableCell>
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

            <Modal isOpen={isOpen} onOpenChange={onOpenChange} backdrop="blur" size="lg">
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader>{selectedNetwork ? "Edit Network" : "New Network"}</ModalHeader>
                            <ModalBody>
                                <div className="grid grid-cols-1 gap-4">
                                    <Input
                                        label="Name"
                                        placeholder="Home LAN"
                                        value={formData.name || ""}
                                        onValueChange={(v) => setFormData({ ...formData, name: v })}
                                        isRequired
                                    />
                                    <Input
                                        label="CIDR"
                                        placeholder="192.168.1.0/24"
                                        value={formData.cidr || ""}
                                        onValueChange={(v) => setFormData({ ...formData, cidr: v })}
                                        isRequired
                                    />
                                    <div className="flex gap-4">
                                        <Input
                                            label="VLAN ID"
                                            placeholder="10"
                                            type="number"
                                            value={formData.vlan_id?.toString() || ""}
                                            onValueChange={(v) => setFormData({ ...formData, vlan_id: parseInt(v) || undefined })}
                                        />
                                        <Input
                                            label="Gateway"
                                            placeholder="192.168.1.1"
                                            value={formData.gateway || ""}
                                            onValueChange={(v) => setFormData({ ...formData, gateway: v })}
                                        />
                                    </div>
                                    <Input
                                        label="Description"
                                        placeholder="Main trusted network"
                                        value={formData.description || ""}
                                        onValueChange={(v) => setFormData({ ...formData, description: v })}
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
