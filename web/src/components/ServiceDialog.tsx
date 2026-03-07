import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api-client";
import { toast } from "sonner";
import type { Service, DeviceListView } from "@/types/api";
import useSWR from "swr";

interface ServiceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved: () => void;
    initialData?: Service | null;
}

export function ServiceDialog({ open, onOpenChange, onSaved, initialData }: ServiceDialogProps) {
    const isEdit = !!initialData;
    const { data: devices = [] } = useSWR<DeviceListView[]>("/api/devices", fetchApi);
    const [formData, setFormData] = useState<Partial<Service>>({});

    useEffect(() => {
        if (open) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setFormData(initialData ?? { is_public: false });
        }
    }, [open, initialData]);

    const handleSave = async () => {
        try {
            const url = isEdit ? `/api/services/${initialData!.id}` : "/api/services";
            await fetchApi(url, {
                method: isEdit ? "PUT" : "POST",
                body: JSON.stringify(formData),
            });
            onSaved();
            onOpenChange(false);
            toast.success("Service saved", { description: `Successfully saved ${formData.name || "service"}` });
        } catch (e) { console.error(e); }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-card/80 backdrop-blur-2xl border-border/40 shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">{isEdit ? "Edit Service" : "New Service"}</DialogTitle>
                    <DialogDescription className="text-muted-foreground/80">Configure service details and monitoring.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-6">
                    <div className="grid gap-2">
                        <Label htmlFor="name" className="text-sm font-medium">Name</Label>
                        <Input id="name" placeholder="Plex" value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="bg-secondary/40 border-border/40 focus-visible:ring-primary/40 focus-visible:border-primary/50 transition-all rounded-lg" />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="url" className="text-sm font-medium">URL</Label>
                        <Input id="url" placeholder="http://192.168.1.50:32400" value={formData.base_url || ""} onChange={(e) => setFormData({ ...formData, base_url: e.target.value })} className="bg-secondary/40 border-border/40 focus-visible:ring-primary/40 focus-visible:border-primary/50 transition-all rounded-lg" />
                    </div>
                    <div className="grid gap-2">
                        <Label className="text-sm font-medium">Link to Device</Label>
                        <Select value={formData.device_id || "none"} onValueChange={(val) => setFormData({ ...formData, device_id: val === "none" ? undefined : val })}>
                            <SelectTrigger className="bg-secondary/40 border-border/40 focus:ring-primary/40 focus:border-primary/50 transition-all rounded-lg"><SelectValue placeholder="Select a device (Optional)" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {devices.map(device => <SelectItem key={device.id} value={device.id}>{device.hostname}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border/40 bg-secondary/20 p-4 transition-all hover:bg-secondary/40">
                        <div className="space-y-0.5">
                            <Label className="text-base font-medium">Publicly Visible</Label>
                            <p className="text-sm text-muted-foreground/80">Show this service on the public dashboard.</p>
                        </div>
                        <Switch checked={formData.is_public} onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="icon_url" className="text-sm font-medium">Icon URL (Optional)</Label>
                        <Input id="icon_url" placeholder="https://example.com/icon.png" value={formData.icon_url || ""} onChange={(e) => setFormData({ ...formData, icon_url: e.target.value })} className="bg-secondary/40 border-border/40 focus-visible:ring-primary/40 focus-visible:border-primary/50 transition-all rounded-lg" />
                        <p className="text-xs text-muted-foreground">Overrides the auto-discovered icon if provided.</p>
                    </div>
                </div>
                <DialogFooter className="border-t border-border/20 pt-4 mt-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="hover:bg-secondary/60">Cancel</Button>
                    <Button onClick={handleSave}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
