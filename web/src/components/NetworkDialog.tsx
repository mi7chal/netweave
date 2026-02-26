import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { FormInputField } from "./forms/FormInputField";
import { fetchApi } from "@/lib/api-client";
import { toast } from "sonner";

export interface Network {
    id: string;
    name: string;
    cidr: string;
    vlan_id?: number;
    gateway?: string;
    description?: string;
}

const formSchema = z.object({
    name: z.string().min(1, "Name is required"),
    cidr: z.string().min(1, "CIDR is required"),
    vlan_id: z.number().min(1).optional(),
    gateway: z.string().optional().or(z.literal("")),
    description: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

interface NetworkDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved: () => void;
    initialData: Partial<Network> | null;
}

export function NetworkDialog({ open, onOpenChange, onSaved, initialData }: NetworkDialogProps) {
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: initialData?.name || "",
            cidr: initialData?.cidr || "",
            vlan_id: initialData?.vlan_id,
            gateway: initialData?.gateway || "",
            description: initialData?.description || "",
        },
    });

    useEffect(() => {
        if (open) {
            form.reset({
                name: initialData?.name || "",
                cidr: initialData?.cidr || "",
                vlan_id: initialData?.vlan_id,
                gateway: initialData?.gateway || "",
                description: initialData?.description || "",
            });
        }
    }, [open, initialData, form]);

    const handleSubmit = async (values: FormValues) => {
        try {
            const method = initialData?.id ? 'PUT' : 'POST';
            const url = initialData?.id ? `/api/networks/${initialData.id}` : '/api/networks';

            await fetchApi(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values)
            });

            onSaved();
            onOpenChange(false);
            toast.success("Network saved", { description: "Changes have been safely applied." });
        } catch (e) {
            console.error(e);
            // fetchApi handles toast on error
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-card/80 backdrop-blur-2xl border-border/40 shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                        {initialData?.id ? "Edit Network" : "New Network"}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground/80">
                        Defines a network segment.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4 py-6">
                        <FormInputField
                            control={form.control}
                            name="name"
                            label="Name"
                            placeholder="Home LAN"
                        />
                        <FormInputField
                            control={form.control}
                            name="cidr"
                            label="CIDR"
                            placeholder="192.168.1.0/24"
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormInputField
                                control={form.control}
                                name="vlan_id"
                                label="VLAN ID"
                                type="number"
                                placeholder="10"
                            />
                            <FormInputField
                                control={form.control}
                                name="gateway"
                                label="Gateway"
                                placeholder="192.168.1.1"
                            />
                        </div>
                        <FormInputField
                            control={form.control}
                            name="description"
                            label="Description"
                            placeholder="Main trusted network"
                        />
                        <DialogFooter className="border-t border-border/20 pt-4 mt-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="hover:bg-secondary/60">Cancel</Button>
                            <Button type="submit">Save</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
