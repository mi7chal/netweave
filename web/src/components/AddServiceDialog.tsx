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

interface AddServiceDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onServiceAdded: () => void;
}

export const AddServiceDialog = ({ isOpen, onOpenChange, onServiceAdded }: AddServiceDialogProps) => {
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState("");
    const [category, setCategory] = useState("Infrastructure");
    const [url, setUrl] = useState("");

    const handleSubmit = async () => {
        setLoading(true);
        try {
            if (!name || !url) return;

            const payload = {
                name,
                base_url: url,
                is_public: category === "Public", // Simplified logic
            };

            const res = await fetch('/api/services', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                console.error("Failed to add service");
                // TODO: Add toast notification
                return;
            }

            onServiceAdded();
            onOpenChange(false);
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
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-card/80 backdrop-blur-2xl border-border/40 shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Add New Service</DialogTitle>
                    <DialogDescription className="text-muted-foreground/80">
                        Add a new service to your homelab dashboard.
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
                            placeholder="e.g. Plex"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="url" className="text-sm font-medium">
                            URL
                        </Label>
                        <Input
                            id="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className="bg-secondary/40 border-border/40 focus-visible:ring-primary/40 focus-visible:border-primary/50 transition-all rounded-lg"
                            placeholder="http://192.168.1.x:32400"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="category" className="text-sm font-medium">
                            Category
                        </Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger className="bg-secondary/40 border-border/40 focus:ring-primary/40 rounded-lg transition-all">
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent className="bg-card/90 backdrop-blur-xl border-border/40 shadow-xl">
                                <SelectItem value="Infrastructure" className="hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer rounded-md mx-1 my-0.5">Infrastructure</SelectItem>
                                <SelectItem value="Media" className="hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer rounded-md mx-1 my-0.5">Media</SelectItem>
                                <SelectItem value="Smart Home" className="hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer rounded-md mx-1 my-0.5">Smart Home</SelectItem>
                                <SelectItem value="Development" className="hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer rounded-md mx-1 my-0.5">Development</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter className="border-t border-border/20 pt-4 mt-2">
                    <Button type="submit" onClick={handleSubmit} disabled={loading}>
                        {loading ? "Adding..." : "Add Service"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
