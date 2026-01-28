import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Select, SelectItem } from "@heroui/react";
import { useState } from "react";

interface AddIntegrationModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved: () => void;
}

export const AddIntegrationModal = ({ isOpen, onOpenChange, onSaved }: AddIntegrationModalProps) => {
    const [loading, setLoading] = useState(false);

    const [name, setName] = useState("");
    const [type, setType] = useState("AdGuardHome");
    const [url, setUrl] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = async (onClose: () => void) => {
        setLoading(true);
        try {
            const payload = {
                name,
                provider_type: type,
                config: {
                    url,
                    username,
                    password
                }
            };

            const res = await fetch('/api/integrations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                alert("Failed to add integration");
                return;
            }

            onSaved();
            onClose();
            setName("");
            setUrl("");
            setUsername("");
            setPassword("");
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
                        <ModalHeader>Add Integration</ModalHeader>
                        <ModalBody>
                            <Select
                                label="Provider Type"
                                defaultSelectedKeys={["AdGuardHome"]}
                                variant="flat"
                                selectedKeys={[type]}
                                onChange={(e) => setType(e.target.value)}
                            >
                                <SelectItem key="AdGuardHome">AdGuard Home</SelectItem>
                                <SelectItem key="KeaDhcp">Kea DHCP</SelectItem>
                                <SelectItem key="Unifi">Unifi Controller</SelectItem>
                            </Select>

                            <Input
                                autoFocus
                                label="Name"
                                placeholder="e.g. Primary DNS"
                                variant="flat"
                                value={name}
                                onValueChange={setName}
                            />
                            <Input
                                label="URL"
                                placeholder="http://192.168.1.5:80"
                                variant="flat"
                                value={url}
                                onValueChange={setUrl}
                            />
                            <Input
                                label="Username"
                                variant="flat"
                                value={username}
                                onValueChange={setUsername}
                            />
                            <Input
                                label="Password"
                                type="password"
                                variant="flat"
                                value={password}
                                onValueChange={setPassword}
                            />
                        </ModalBody>
                        <ModalFooter>
                            <Button color="danger" variant="flat" onPress={onClose}>
                                Cancel
                            </Button>
                            <Button color="primary" onPress={() => handleSubmit(onClose)} isLoading={loading}>
                                Save Integration
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};
