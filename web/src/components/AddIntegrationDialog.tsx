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
    providerType: z.string().min(1, "Type is required"),
    baseUrl: z.string().url("Must be a valid URL").min(1, "URL is required"),
    apiKey: z.string().min(1, "API Key is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface AddIntegrationDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved: () => void;
}

export const AddIntegrationDialog = ({ isOpen, onOpenChange, onSaved }: AddIntegrationDialogProps) => {
    const [loading, setLoading] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            providerType: "ADGUARD",
            baseUrl: "",
            apiKey: "",
        },
    });

    const onSubmit = async (values: FormValues) => {
        setLoading(true);
        try {
            const payload = {
                name: values.name,
                provider_type: values.providerType,
                config: {
                    base_url: values.baseUrl,
                    api_key: values.apiKey
                }
            };

            await fetchApi('/api/integrations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            toast.success("Integration added successfully");
            onSaved();
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
                    <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Add Integration</DialogTitle>
                    <DialogDescription className="text-muted-foreground/80">
                        Connect external services to import data.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-6">
                        <FormInputField
                            control={form.control}
                            name="name"
                            label="Name"
                            placeholder="Home AdGuard"
                        />
                        <FormSelectField
                            control={form.control}
                            name="providerType"
                            label="Type"
                            placeholder="Select type"
                            options={[
                                { label: "AdGuard Home", value: "ADGUARD" },
                                { label: "Unifi Controller", value: "UNIFI" },
                                { label: "Kea DHCP", value: "KEA" },
                            ]}
                        />
                        <FormInputField
                            control={form.control}
                            name="baseUrl"
                            label="URL"
                            placeholder="http://192.168.1.5"
                        />
                        <FormInputField
                            control={form.control}
                            name="apiKey"
                            label="API Key"
                            type="password"
                            placeholder="Secret..."
                        />
                        <DialogFooter className="border-t border-border/20 pt-4 mt-2">
                            <Button type="submit" disabled={loading}>
                                {loading ? "Adding..." : "Add Integration"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};
