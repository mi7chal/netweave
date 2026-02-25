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
            <DialogContent className="sm:max-w-[425px] bg-card/80 backdrop-blur-2xl border-border/40 shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Add Integration</DialogTitle>
                    <DialogDescription className="text-muted-foreground/80">
                        Connect external services to import data.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-6">
                    <div className="grid gap-2">
                        <Label htmlFor="name" className="text-sm font-medium">
                            Name
                        </Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-secondary/40 border-border/40 focus-visible:ring-primary/40 focus-visible:border-primary/50 transition-all rounded-lg"
                            placeholder="Home AdGuard"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="type" className="text-sm font-medium">
                            Type
                        </Label>
                        <Select value={providerType} onValueChange={setProviderType}>
                            <SelectTrigger className="bg-secondary/40 border-border/40 focus:ring-primary/40 rounded-lg transition-all">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent className="bg-card/90 backdrop-blur-xl border-border/40 shadow-xl">
                                <SelectItem value="ADGUARD" className="hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer rounded-md mx-1 my-0.5">AdGuard Home</SelectItem>
                                <SelectItem value="UNIFI" className="hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer rounded-md mx-1 my-0.5">Unifi Controller</SelectItem>
                                <SelectItem value="KEA" className="hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer rounded-md mx-1 my-0.5">Kea DHCP</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="url" className="text-sm font-medium">
                            URL
                        </Label>
                        <Input
                            id="url"
                            value={baseUrl}
                            onChange={(e) => setBaseUrl(e.target.value)}
                            className="bg-secondary/40 border-border/40 focus-visible:ring-primary/40 focus-visible:border-primary/50 transition-all rounded-lg"
                            placeholder="http://192.168.1.5"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="key" className="text-sm font-medium">
                            API Key
                        </Label>
                        <Input
                            id="key"
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="bg-secondary/40 border-border/40 focus-visible:ring-primary/40 focus-visible:border-primary/50 transition-all rounded-lg"
                            placeholder="Secret..."
                        />
                    </div>
                </div>
                <DialogFooter className="border-t border-border/20 pt-4 mt-2">
                    <Button type="submit" onClick={handleSubmit} disabled={loading}>
                        {loading ? "Adding..." : "Add Integration"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
