import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api-client";
import { toast } from "sonner";
import type { User, CreateUserPayload } from "@/types/api";

interface UserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved: () => void;
    initialData?: User | null;
}

export function UserDialog({ open, onOpenChange, onSaved, initialData }: UserDialogProps) {
    const isEdit = !!initialData;
    const [formData, setFormData] = useState<Partial<CreateUserPayload>>({});

    useEffect(() => {
        if (open) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setFormData(initialData ?? { role: "VIEWER", is_active: true });
        }
    }, [open, initialData]);

    const handleSave = async () => {
        try {
            const url = isEdit ? `/api/users/${initialData!.id}` : "/api/users";
            await fetchApi(url, {
                method: isEdit ? "PUT" : "POST",
                body: JSON.stringify(formData),
            });
            onSaved();
            onOpenChange(false);
            toast.success("User saved", { description: `Successfully saved ${formData.username || "user"}` });
        } catch (e) {
            console.error(e);
            const err = e as Error;
            toast.error("Error saving user", { description: err.message });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-card/80 backdrop-blur-2xl border-border/40 shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">{isEdit ? "Edit User" : "New User"}</DialogTitle>
                    <DialogDescription className="text-muted-foreground/80">Configure user details and access level.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-6">
                    <div className="grid gap-2">
                        <Label htmlFor="username" className="text-sm font-medium">Username</Label>
                        <Input id="username" placeholder="johndoe" value={formData.username || ""} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="bg-secondary/40 border-border/40 focus-visible:ring-primary/40 focus-visible:border-primary/50 transition-all rounded-lg" />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                        <Input id="email" type="email" placeholder="john@example.com" value={formData.email || ""} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="bg-secondary/40 border-border/40 focus-visible:ring-primary/40 focus-visible:border-primary/50 transition-all rounded-lg" />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="password" className="text-sm font-medium">Password {isEdit && "(Leave blank to keep current)"}</Label>
                        <Input id="password" type="password" placeholder="••••••••" value={formData.password || ""} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="bg-secondary/40 border-border/40 focus-visible:ring-primary/40 focus-visible:border-primary/50 transition-all rounded-lg" />
                    </div>
                    <div className="grid gap-2">
                        <Label className="text-sm font-medium">Role</Label>
                        <Select value={formData.role || "VIEWER"} onValueChange={(val) => setFormData({ ...formData, role: val })}>
                            <SelectTrigger className="bg-secondary/40 border-border/40 focus:ring-primary/40 focus:border-primary/50 transition-all rounded-lg"><SelectValue placeholder="Select role" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="VIEWER">Viewer</SelectItem>
                                <SelectItem value="ADMIN">Admin</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border/40 bg-secondary/20 p-4 transition-all hover:bg-secondary/40">
                        <div className="space-y-0.5">
                            <Label className="text-base font-medium">Active Status</Label>
                            <p className="text-sm text-muted-foreground/80">Allow this user to log in.</p>
                        </div>
                        <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
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
