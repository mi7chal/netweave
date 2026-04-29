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
import { DeviceType, type CreateDevicePayload, type DeviceListView } from "@/types/api";
import { useState } from "react";
import { fetchApi } from "@/lib/api-client";
import { toast } from "sonner";

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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            Add New Device
          </DialogTitle>
          <DialogDescription>
            Create a new device. You can add detailed interfaces later.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleCreate();
          }}
        >
          <fieldset disabled={isSubmitting}>
          <div className="grid gap-4 py-6">
            <div className="grid gap-2">
              <Label htmlFor="hostname">
                Hostname <span className="ml-1">*</span>
              </Label>
              <Input
                id="hostname"
                placeholder="e.g. server-01"
                value={formData.hostname || ""}
                onChange={(e) =>
                  setFormData({ ...formData, hostname: e.target.value })
                }
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="parent">
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
                <SelectTrigger>
                  <SelectValue placeholder="Select parent (optional)" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  <SelectItem value="none">
                    None
                  </SelectItem>
                  {(devices || []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.hostname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="type">
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
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(DeviceType).map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="mac">
                Initial MAC Address (eth0)
              </Label>
              <Input
                id="mac"
                placeholder="00:00:00:00:00:00"
                value={formData.mac_address || ""}
                onChange={(e) =>
                  setFormData({ ...formData, mac_address: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="os">
                OS Info
              </Label>
              <Input
                id="os"
                placeholder="e.g. Ubuntu 22.04"
                value={formData.os_info || ""}
                onChange={(e) =>
                  setFormData({ ...formData, os_info: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ip">
                Static IP Address (optional)
              </Label>
              <Input
                id="ip"
                placeholder="192.168.1.100"
                value={formData.ip_address || ""}
                onChange={(e) =>
                  setFormData({ ...formData, ip_address: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Device"}
            </Button>
          </DialogFooter>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
