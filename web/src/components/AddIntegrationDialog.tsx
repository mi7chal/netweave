import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useState } from "react"

interface AddIntegrationDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved: () => void;
}

export const AddIntegrationDialog = ({ isOpen, onOpenChange, onSaved }: AddIntegrationDialogProps) => {
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState("");
    const [providerType, setProviderType] = useState("ADGUARD");
    const [baseUrl, setBaseUrl] = useState("");
    const [apiKey, setApiKey] = useState("");

    const handleSubmit = async () => {
        setLoading(true);
        try {
            if (!name || !providerType) return;

            const payload = {
                name,
                provider_type: providerType,
                config: {
                    base_url: baseUrl,
                    api_key: apiKey
                }
            };

            const res = await fetch('/api/integrations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                console.error("Failed to add integration");
                return;
            }

            onSaved();
            onOpenChange(false);
            setName("");
            setBaseUrl("");
            setApiKey("");
            setProviderType("ADGUARD");
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Integration</DialogTitle>
                    <DialogDescription>
                        Connect external services to import data.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Name
                        </Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="col-span-3"
                            placeholder="Home AdGuard"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">
                            Type
                        </Label>
                        <Select value={providerType} onValueChange={setProviderType}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ADGUARD">AdGuard Home</SelectItem>
                                <SelectItem value="UNIFI">Unifi Controller</SelectItem>
                                <SelectItem value="KEA">Kea DHCP</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="url" className="text-right">
                            URL
                        </Label>
                        <Input
                            id="url"
                            value={baseUrl}
                            onChange={(e) => setBaseUrl(e.target.value)}
                            className="col-span-3"
                            placeholder="http://192.168.1.5"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="key" className="text-right">
                            API Key
                        </Label>
                        <Input
                            id="key"
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="col-span-3"
                            placeholder="Secret..."
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={handleSubmit} disabled={loading}>
                        {loading ? "Adding..." : "Add Integration"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
