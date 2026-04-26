import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormWrapper } from "@/components/FormWrapper";
import { DeviceType, type CreateDevicePayload, type DeviceListView } from "@/types/api";
import { useState } from "react";
import { fetchApi } from "@/lib/api-client";
import { toast } from "sonner";

const INPUT_CLASS =
  "bg-secondary/40 border-border/40 focus-visible:ring-primary/40 focus-visible:border-primary/50 transition-all rounded-lg";
const SELECT_TRIGGER_CLASS =
  "bg-secondary/40 border-border/40 focus:ring-primary/40 rounded-lg transition-all";

const defaultFormData = (): Partial<CreateDevicePayload> => ({
  device_type: DeviceType.Other,
});

interface AddDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  devices: DeviceListView[];
}

export function AddDeviceDialog({ open, onOpenChange, onSaved, devices }: AddDeviceDialogProps) {
  const [formData, setFormData] = useState<Partial<CreateDevicePayload>>(defaultFormData());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      await fetchApi("/api/devices", {
        method: "POST",
        silent: true,
        body: JSON.stringify(formData),
      });
      onSaved();
      onOpenChange(false);
      setFormData(defaultFormData());
      toast.success("Device created", {
        description: "The new device has been added to the registry.",
      });
    } catch (e) {
      console.error(e);
      toast.error("Failed to create device");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) setFormData(defaultFormData());
      }}
    >
      <DialogContent className="sm:max-w-[425px] bg-card/80 backdrop-blur-2xl border-border/40 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            Add New Device
          </DialogTitle>
          <DialogDescription className="text-muted-foreground/80">
            Create a new device. You can add detailed interfaces later.
          </DialogDescription>
        </DialogHeader>
        <FormWrapper onSubmit={handleCreate} isSubmitting={isSubmitting}>
          <div className="grid gap-4 py-6">
            <div className="grid gap-2">
              <Label htmlFor="hostname" className="text-sm font-medium">
                Hostname <span className="ml-1 text-destructive">*</span>
              </Label>
              <Input
                id="hostname"
                placeholder="e.g. server-01"
                value={formData.hostname || ""}
                onChange={(e) =>
                  setFormData({ ...formData, hostname: e.target.value })
                }
                className={INPUT_CLASS}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="parent" className="text-sm font-medium">
                Parent Device
              </Label>
              <Select
                value={formData.parent_device_id || "none"}
                onValueChange={(val) =>
                  setFormData({
                    ...formData,
                    parent_device_id: val === "none" ? undefined : val,
                  })
                }
              >
                <SelectTrigger className={SELECT_TRIGGER_CLASS}>
                  <SelectValue placeholder="Select parent (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-card/90 backdrop-blur-xl border-border/40 shadow-xl max-h-[200px]">
                  <SelectItem
                    value="none"
                    className="text-muted-foreground italic"
                  >
                    None
                  </SelectItem>
                  {(devices || []).map((d) => (
                    <SelectItem
                      key={d.id}
                      value={d.id}
                      className="hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer rounded-md mx-1 my-0.5"
                    >
                      {d.hostname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="type" className="text-sm font-medium">
                Type
              </Label>
              <Select
                value={formData.device_type ?? DeviceType.Other}
                onValueChange={(val) =>
                  setFormData({
                    ...formData,
                    device_type: val as DeviceType,
                  })
                }
              >
                <SelectTrigger className={SELECT_TRIGGER_CLASS}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-card/90 backdrop-blur-xl border-border/40 shadow-xl">
                  {Object.values(DeviceType).map((t) => (
                    <SelectItem
                      key={t}
                      value={t}
                      className="hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer rounded-md mx-1 my-0.5"
                    >
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="mac" className="text-sm font-medium">
                Initial MAC Address (eth0)
              </Label>
              <Input
                id="mac"
                placeholder="00:00:00:00:00:00"
                value={formData.mac_address || ""}
                onChange={(e) =>
                  setFormData({ ...formData, mac_address: e.target.value })
                }
                className={INPUT_CLASS}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="os" className="text-sm font-medium">
                OS Info
              </Label>
              <Input
                id="os"
                placeholder="e.g. Ubuntu 22.04"
                value={formData.os_info || ""}
                onChange={(e) =>
                  setFormData({ ...formData, os_info: e.target.value })
                }
                className={INPUT_CLASS}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ip" className="text-sm font-medium">
                Static IP Address (optional)
              </Label>
              <Input
                id="ip"
                placeholder="192.168.1.100"
                value={formData.ip_address || ""}
                onChange={(e) =>
                  setFormData({ ...formData, ip_address: e.target.value })
                }
                className={INPUT_CLASS}
              />
            </div>
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Device"}
            </Button>
          </DialogFooter>
        </FormWrapper>
      </DialogContent>
    </Dialog>
  );
}
