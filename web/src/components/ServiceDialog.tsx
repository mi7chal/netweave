import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api-client";
import { toast } from "sonner";
import type { Service, DeviceListView } from "@/types/api";
import useSWR from "swr";

interface ServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  initialData?: Service | null;
}

export function ServiceDialog({
  open,
  onOpenChange,
  onSaved,
  initialData,
}: ServiceDialogProps) {
  const isEdit = !!initialData;
  const { data: devices = [] } = useSWR<DeviceListView[]>(
    "/api/devices",
    fetchApi,
  );
  const [formData, setFormData] = useState<Partial<Service>>({});

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData(initialData ?? { is_public: false });
    }
  }, [open, initialData]);

  const handleSave = async () => {
    try {
      const url = isEdit ? `/api/services/${initialData!.id}` : "/api/services";
      await fetchApi(url, {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify(formData),
      });
      onSaved();
      onOpenChange(false);
      toast.success("Service saved", {
        description: `Successfully saved ${formData.name || "service"}`,
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Service" : "New Service"}
          </DialogTitle>
          <DialogDescription>
            Configure service details and monitoring.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-6">
          <div className="grid gap-2">
            <Label htmlFor="name">
              Name
            </Label>
            <Input
              id="name"
              placeholder="Plex"
              value={formData.name || ""}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="url">
              URL
            </Label>
            <Input
              id="url"
              placeholder="http://192.168.1.50:32400"
              value={formData.base_url || ""}
              onChange={(e) =>
                setFormData({ ...formData, base_url: e.target.value })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="health_endpoint">
              Health Endpoint (Optional)
            </Label>
            <Input
              id="health_endpoint"
              placeholder="/identity"
              value={formData.health_endpoint || ""}
              onChange={(e) =>
                setFormData({ ...formData, health_endpoint: e.target.value })
              }
            />
            <p>
              Path to check for service health (e.g. /health). If empty, base
              URL is used.
            </p>
          </div>
          <div className="grid gap-2">
            <Label>Link to Device</Label>
            <Select
              value={formData.device_id || "none"}
              onValueChange={(val) =>
                setFormData({
                  ...formData,
                  device_id: val === "none" ? undefined : val,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a device (Optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {devices.map((device) => (
                  <SelectItem key={device.id} value={device.id}>
                    {device.hostname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between border p-4">
            <div className="flex flex-col gap-0.5">
              <Label>Publicly Visible</Label>
              <p>
                Show this service on the public dashboard.
              </p>
            </div>
            <Switch
              checked={formData.is_public}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_public: checked })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="icon_url">
              Icon URL (Optional)
            </Label>
            <Input
              id="icon_url"
              placeholder="https://example.com/icon.png"
              value={formData.icon_url || ""}
              onChange={(e) =>
                setFormData({ ...formData, icon_url: e.target.value })
              }
            />
            <p>
              Overrides the auto-discovered icon if provided.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
