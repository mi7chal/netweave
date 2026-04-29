import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api-client";
import { toast } from "sonner";
import { UserRole, type User, type CreateUserPayload } from "@/types/api";

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
            setFormData(initialData ?? { role: UserRole.Viewer, is_active: true });
        }
    }, [open, initialData]);

    const handleSave = async () => {
        try {
            const url = isEdit ? `/api/users/${initialData!.id}` : "/api/users";
            await fetchApi(url, {
                method: isEdit ? "PUT" : "POST",
                silent: true,
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
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Edit User" : "New User"}</DialogTitle>
                    <DialogDescription>Configure user details and access level.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-6">
                    <div className="grid gap-2">
                        <Label htmlFor="username">Username</Label>
                        <Input id="username" placeholder="johndoe" value={formData.username || ""} onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="john@example.com" value={formData.email || ""} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="password">Password {isEdit && "(Leave blank to keep current)"}</Label>
                        <Input id="password" type="password" placeholder="••••••••" value={formData.password || ""} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                    </div>
                    <div className="grid gap-2">
                        <Label>Role</Label>
                        <Select value={formData.role || UserRole.Viewer} onValueChange={(val) => setFormData({ ...formData, role: val as CreateUserPayload["role"] })}>
                            <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value={UserRole.Viewer}>Viewer</SelectItem>
                                <SelectItem value={UserRole.Admin}>Admin</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center justify-between border p-4">
                        <div className="flex flex-col gap-0.5">
                            <Label>Active Status</Label>
                            <p>Allow this user to log in.</p>
                        </div>
                        <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
