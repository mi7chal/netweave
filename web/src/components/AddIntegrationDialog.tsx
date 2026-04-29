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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FormInputField } from "./forms/FormInputField";
import { FormSelectField } from "./forms/FormSelectField";
import { useState } from "react";
import { fetchApi } from "@/lib/api-client";
import { toast } from "sonner";
import { Info, Key, User, Globe } from "lucide-react";

const formSchema = z.object({
    name: z.string().min(1, "Name is required"),
    providerType: z.string().min(1, "Type is required"),
    baseUrl: z.string().url("Must be a valid URL").min(1, "URL is required"),
    username: z.string().min(1, "Username is required"),
    password: z.string().min(1, "Password/API Key is required"),
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
            providerType: "AdGuardHome",
            baseUrl: "",
            username: "",
            password: "",
        },
    });

    const onSubmit = async (values: FormValues) => {
        setLoading(true);
        try {
            const payload = {
                name: values.name,
                provider_type: values.providerType,
                config: {
                    url: values.baseUrl,
                    username: values.username,
                    password: values.password
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
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) form.reset();
            onOpenChange(open);
        }}>
            <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add Integration</DialogTitle>
                    <DialogDescription>
                        Connect external services to synchronize your network data.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5 py-6">
                        <FormInputField
                            control={form.control}
                            name="name"
                            label="Name"
                            placeholder="Home AdGuard"
                        />
                        <FormSelectField
                            control={form.control}
                            name="providerType"
                            label="Provider Type"
                            placeholder="Select provider"
                            options={[
                                { label: "AdGuard Home", value: "AdGuardHome" },
                                { label: "Unifi Controller (Soon)", value: "UNIFI", disabled: true },
                                { label: "Kea DHCP (Soon)", value: "KEA", disabled: true },
                            ]}
                        />

                        {form.watch("providerType") === "AdGuardHome" && (
                            <Alert>
                                <Info />
                                <AlertTitle>Self-Hosted AdGuard Home</AlertTitle>
                                <AlertDescription>
                                    Use the same Username and Password you use to access the AdGuard Home web dashboard. Include the port if your dashboard is not on 80/443 (for example, http://192.168.1.5:3000).
                                </AlertDescription>
                            </Alert>
                        )}

                        <FormInputField
                            control={form.control}
                            name="baseUrl"
                            label="Dashboard URL"
                            placeholder="http://192.168.1.5"
                            icon={Globe}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormInputField
                                control={form.control}
                                name="username"
                                label="Username"
                                placeholder="admin"
                                icon={User}
                            />
                            <FormInputField
                                control={form.control}
                                name="password"
                                label="Password"
                                type="password"
                                placeholder="••••••••"
                                icon={Key}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                                {loading ? "Connecting..." : "Add Integration"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};
