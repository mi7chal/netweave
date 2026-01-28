import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Select, SelectItem } from "@heroui/react";
import { useState } from "react";

interface AddServiceModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onServiceAdded: () => void;
}

export const AddServiceModal = ({ isOpen, onOpenChange, onServiceAdded }: AddServiceModalProps) => {
    const [loading, setLoading] = useState(false);

    // Form State
    const [name, setName] = useState("");
    const [category, setCategory] = useState("Infrastructure");
    const [url, setUrl] = useState("");

    const handleSubmit = async (onClose: () => void) => {
        setLoading(true);
        try {
            // Basic validation
            if (!name || !url) return;

            const payload = {
                name,
                base_url: url,
                is_public: category === "Public" ? "true" : "false",
                // device_id: ... selection logic later
            };

            const res = await fetch('/api/services', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const err = await res.json();
                console.error("API Error:", err);
                alert("Failed to add service"); // Simple alert for now
                return;
            }

            onServiceAdded();
            onClose();
            // Reset form
            setName("");
            setUrl("");
            setCategory("Infrastructure");
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange} placement="center" backdrop="blur">
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1">Add New Service</ModalHeader>
                        <ModalBody>
                            <Input
                                autoFocus
                                label="Service Name"
                                placeholder="e.g. Plex"
                                variant="flat"
                                value={name}
                                onValueChange={setName}
                            />
                            <Input
                                label="URL"
                                placeholder="http://192.168.1.x:32400"
                                type="url"
                                variant="flat"
                                value={url}
                                onValueChange={setUrl}
                            />
                            <Select
                                label="Category"
                                defaultSelectedKeys={["Infrastructure"]}
                                variant="flat"
                                selectedKeys={[category]}
                                onChange={(e) => setCategory(e.target.value)}
                            >
                                <SelectItem key="Infrastructure">Infrastructure</SelectItem>
                                <SelectItem key="Media">Media</SelectItem>
                                <SelectItem key="Smart Home">Smart Home</SelectItem>
                                <SelectItem key="Dev">Development</SelectItem>
                            </Select>
                        </ModalBody>
                        <ModalFooter>
                            <Button color="danger" variant="flat" onPress={onClose}>
                                Cancel
                            </Button>
                            <Button color="primary" onPress={() => handleSubmit(onClose)} isLoading={loading}>
                                Add Service
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};
