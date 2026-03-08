import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import useSWR from "swr";
import { fetchApi } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { FormInputField } from "./forms/FormInputField";
import { FormSelectField } from "./forms/FormSelectField";
import {
  type CreateDevicePayload,
  DeviceType,
  type DeviceListView,
} from "@/types/api";

const formSchema = z.object({
  hostname: z.string().min(1, "Hostname is required"),
  parent_device_id: z.string().optional(),
  os_info: z.string().optional(),
  device_type: z.enum([
    DeviceType.Physical,
    DeviceType.Vm,
    DeviceType.Lxc,
    DeviceType.Container,
    DeviceType.Switch,
    DeviceType.Ap,
    DeviceType.Router,
    DeviceType.Other,
  ]),
  cpu_cores: z.number().min(1).optional(),
  ram_gb: z.number().min(0.1).optional(),
  storage_gb: z.number().min(1).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<CreateDevicePayload>) => void;
  initialData: Partial<CreateDevicePayload>;
}

export function EditDeviceDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
}: EditDeviceDialogProps) {
  const { data: devices } = useSWR<DeviceListView[]>("/api/devices", fetchApi);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      hostname: initialData.hostname || "",
      parent_device_id: initialData.parent_device_id || undefined,
      os_info: initialData.os_info || "",
      device_type: initialData.device_type || DeviceType.Other,
      cpu_cores: initialData.cpu_cores,
      ram_gb: initialData.ram_gb,
      storage_gb: initialData.storage_gb,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        hostname: initialData.hostname || "",
        parent_device_id: initialData.parent_device_id || undefined,
        os_info: initialData.os_info || "",
        device_type: initialData.device_type || DeviceType.Other,
        cpu_cores: initialData.cpu_cores,
        ram_gb: initialData.ram_gb,
        storage_gb: initialData.storage_gb,
      });
    }
  }, [open, initialData, form]);

  const handleSubmit = (values: FormValues) => {
    onSubmit(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card/80 backdrop-blur-2xl border-border/40 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            Edit Device
          </DialogTitle>
          <DialogDescription className="text-muted-foreground/80">
            Update device configuration.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="grid gap-4 py-6 max-h-[60vh] overflow-y-auto scrollbar-hide px-1"
          >
            <FormInputField
              control={form.control}
              name="hostname"
              label="Hostname"
              placeholder="server-01"
            />
            <FormSelectField
              control={form.control}
              name="parent_device_id"
              label="Parent Device"
              placeholder="Select parent (optional)"
              options={(devices || [])
                .filter((d) => d.hostname !== initialData.hostname)
                .map((d) => ({ label: d.hostname, value: d.id }))}
            />
            <FormInputField
              control={form.control}
              name="os_info"
              label="Operating System"
              placeholder="Ubuntu 24.04"
            />
            <FormSelectField
              control={form.control}
              name="device_type"
              label="Device Type"
              placeholder="Select type"
              options={Object.values(DeviceType).map((t) => ({
                label: t,
                value: t,
              }))}
            />
            <div className="grid grid-cols-3 gap-2">
              <FormInputField
                control={form.control}
                name="cpu_cores"
                label="CPU Cores"
                type="number"
                className="[&_input]:h-8 [&_input]:text-sm [&_label]:text-xs"
              />
              <FormInputField
                control={form.control}
                name="ram_gb"
                label="RAM (GB)"
                type="number"
                step="0.5"
                className="[&_input]:h-8 [&_input]:text-sm [&_label]:text-xs"
              />
              <FormInputField
                control={form.control}
                name="storage_gb"
                label="Storage (GB)"
                type="number"
                step="1"
                className="[&_input]:h-8 [&_input]:text-sm [&_label]:text-xs"
              />
            </div>
            <DialogFooter className="border-t border-border/20 pt-4 mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="hover:bg-secondary/60"
              >
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
