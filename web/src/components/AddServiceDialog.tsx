import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { FormInputField } from "./forms/FormInputField";
import { FormSelectField } from "./forms/FormSelectField";
import { useState } from "react";
import { fetchApi } from "@/lib/api-client";
import { toast } from "sonner";

const formSchema = z.object({
    name: z.string().min(1, "Name is required"),
    url: z.string().url("Must be a valid URL").min(1, "URL is required"),
    category: z.string().min(1, "Category is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface AddServiceDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onServiceAdded: () => void;
}

export const AddServiceDialog = ({ isOpen, onOpenChange, onServiceAdded }: AddServiceDialogProps) => {
    const [loading, setLoading] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            url: "",
            category: "Infrastructure",
        },
    });

    const onSubmit = async (values: FormValues) => {
        setLoading(true);
        try {
            const payload = {
                name: values.name,
                base_url: values.url,
                is_public: values.category === "Public",
            };

            await fetchApi('/api/services', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            toast.success("Service added successfully");
            onServiceAdded();
            form.reset();
            onOpenChange(false);
        } catch (e) {
            console.error(e);
            // Error is handled by fetchApi globally, but we can catch it
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) form.reset();
            onOpenChange(open);
        }}>
            <DialogContent className="sm:max-w-[425px] bg-card/80 backdrop-blur-2xl border-border/40 shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Add New Service</DialogTitle>
                    <DialogDescription className="text-muted-foreground/80">
                        Add a new service to your homelab dashboard.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-6">
                        <FormInputField
                            control={form.control}
                            name="name"
                            label="Name"
                            placeholder="e.g. Plex"
                        />
                        <FormInputField
                            control={form.control}
                            name="url"
                            label="URL"
                            placeholder="http://192.168.1.x:32400"
                        />
                        <FormSelectField
                            control={form.control}
                            name="category"
                            label="Category"
                            placeholder="Select category"
                            options={[
                                { label: "Infrastructure", value: "Infrastructure" },
                                { label: "Media", value: "Media" },
                                { label: "Smart Home", value: "Smart Home" },
                                { label: "Development", value: "Development" },
                            ]}
                        />
                        <DialogFooter className="border-t border-border/20 pt-4 mt-2">
                            <Button type="submit" disabled={loading}>
                                {loading ? "Adding..." : "Add Service"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};
