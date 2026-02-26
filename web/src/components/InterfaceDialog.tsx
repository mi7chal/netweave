import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { FormInputField } from "./forms/FormInputField";

const formSchema = z.object({
    name: z.string().min(1, "Interface name is required"),
    mac: z.string().regex(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/, "Invalid MAC address (e.g. 00:11:22:33:44:55)").optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

interface InterfaceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (name: string, mac: string) => void;
    initialName?: string;
    initialMac?: string;
    mode: "add" | "edit";
}

export function InterfaceDialog({ open, onOpenChange, onSubmit, initialName = "", initialMac = "", mode }: InterfaceDialogProps) {
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { name: initialName, mac: initialMac },
    });

    useEffect(() => {
        if (open) {
            form.reset({ name: initialName, mac: initialMac });
        }
    }, [open, initialName, initialMac, form]);

    const handleSubmit = (values: FormValues) => {
        onSubmit(values.name, values.mac || "");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-card/80 backdrop-blur-2xl border-border/40 shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                        {mode === "add" ? "Add Interface" : "Edit Interface"}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground/80">
                        {mode === "add" ? "Add a new network interface to this device." : "Update network interface details."}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4 py-6">
                        <FormInputField
                            control={form.control}
                            name="name"
                            label="Interface Name"
                            placeholder="eth1"
                        />
                        <FormInputField
                            control={form.control}
                            name="mac"
                            label="MAC Address"
                            placeholder="00:00:00:00:00:00"
                        />
                        <DialogFooter className="border-t border-border/20 pt-4 mt-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="hover:bg-secondary/60">Cancel</Button>
                            <Button type="submit">
                                {mode === "add" ? "Add Interface" : "Save Changes"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
