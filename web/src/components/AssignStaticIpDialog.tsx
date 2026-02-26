import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { FormInputField } from "./forms/FormInputField";

const formSchema = z.object({
    ip: z.string().regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/, "Must be a valid IPv4 address"),
});

type FormValues = z.infer<typeof formSchema>;

interface AssignStaticIpDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (ip: string) => void;
    defaultIp: string;
    macLabel?: string;
}

export function AssignStaticIpDialog({ open, onOpenChange, onSubmit, defaultIp, macLabel }: AssignStaticIpDialogProps) {
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { ip: defaultIp },
    });

    useEffect(() => {
        if (open) {
            form.reset({ ip: defaultIp });
        }
    }, [open, defaultIp, form]);

    const handleSubmit = (values: FormValues) => {
        onSubmit(values.ip);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-card/80 backdrop-blur-2xl border-border/40 shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Assign Static IP</DialogTitle>
                    <DialogDescription className="text-muted-foreground/80">
                        Enter the IPv4 address to reserve for this {macLabel ? `interface (${macLabel})` : 'device'}.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4 py-6">
                        <FormInputField
                            control={form.control}
                            name="ip"
                            label="IP Address"
                            className="[&_input]:font-mono"
                            description="This will release the existing dynamic lease and reserve this specific address."
                        />
                        <DialogFooter className="border-t border-border/20 pt-4 mt-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="hover:bg-secondary/60">Cancel</Button>
                            <Button type="submit">Confirm Reservation</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
