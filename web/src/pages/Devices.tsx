import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/ui/glass-card";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { TableLoadingSkeleton } from "@/components/LoadingSkeletons";
import { DataFetcher } from "@/components/DataFetcher";
import { FormWrapper, FormInput } from "@/components/FormWrapper";
import { DeviceIcon } from "@/lib/device-utils";
import { Plus, Trash2, Edit2, Server } from "lucide-react";
import { useMemo, useState } from "react";
import { AppLayout } from "../layouts/AppLayout";
import { fetchApi } from "@/lib/api-client";
import {
  type DeviceListView,
  DeviceType,
  type CreateDevicePayload,
} from "@/types/api";
import { useCRUDList, useTableSearch } from "@/hooks";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { SearchInput } from "@/components/SearchInput";
import { PageHeader } from "@/components/PageHeader";

export const Devices = () => {
  const defaultDeviceFormData = (): Partial<CreateDevicePayload> => ({
    device_type: DeviceType.Other,
  });

  const deviceInputClass =
    "bg-secondary/40 border-border/40 focus-visible:ring-primary/40 focus-visible:border-primary/50 transition-all rounded-lg";
  const deviceSelectTriggerClass =
    "bg-secondary/40 border-border/40 focus:ring-primary/40 rounded-lg transition-all";

  const navigate = useNavigate();

  const {
    data: devices,
    error,
    isLoading,
    mutate,
    remove,
  } = useCRUDList<DeviceListView>({
    endpoint: "/api/devices",
    onError: (e) =>
      toast.error("Failed to load devices", { description: e.message }),
  });

  const {
    searchTerm: search,
    setSearchTerm: setSearch,
    filteredData,
  } = useTableSearch(devices, {
    searchableFields: [
      "hostname",
      "device_type",
      "primary_ip",
      "mac_address",
      "os_info",
    ],
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<CreateDevicePayload>>(
    defaultDeviceFormData(),
  );
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    hostname: string;
  } | null>(null);

  const handleDelete = async (id: string, hostname: string) => {
    try {
      await remove(id);
      setDeleteConfirm(null);
      toast.success("Device deleted", {
        description: `${hostname} has been removed successfully.`,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    try {
      await fetchApi("/api/devices", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      mutate();
      setIsDialogOpen(false);
      setFormData(defaultDeviceFormData());
      toast.success("Device created", {
        description: "The new device has been added to the registry.",
      });
    } catch (e) {
      console.error(e);
    }
  };

  const sortedDevices = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const group = (d: DeviceListView) =>
        d.is_static === true ? 0 : d.is_static === false ? 1 : 2;
      const diff = group(a) - group(b);
      if (diff !== 0) return diff;
      // Within the same group, sort by IP numerically
      const ipToNum = (ip?: string | null) => {
        if (!ip) return Infinity;
        return ip
          .split(".")
          .reduce((acc, octet) => acc * 256 + Number(octet), 0);
      };
      return ipToNum(a.primary_ip) - ipToNum(b.primary_ip);
    });
  }, [filteredData]);

  return (
    <AppLayout>
      <div className="flex flex-col space-y-6">
        <PageHeader
          title="Devices"
          description="Manage infrastructure hardware and virtual machines."
        >
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search devices..."
            className="w-full md:w-64"
          />
          <Button
            onClick={() => {
              setFormData(defaultDeviceFormData());
              setIsDialogOpen(true);
            }}
            className="gap-2 shadow-sm rounded-full h-10 px-5 flex-shrink-0 hover:scale-105 transition-all duration-300"
          >
            <Plus className="h-4 w-4" /> Add Device
          </Button>
        </PageHeader>

        <DataFetcher
          data={filteredData}
          isLoading={isLoading}
          error={error}
          onRetry={mutate}
          loadingComponent={
            <GlassCard>
              <CardContent className="p-6">
                <TableLoadingSkeleton rows={5} columns={6} />
              </CardContent>
            </GlassCard>
          }
          errorComponent={(err, retry) => (
            <ErrorState message={err.message} onRetry={retry} />
          )}
          emptyComponent={() => (
            <EmptyState
              icon={Server}
              title="No devices found"
              description="Add your first hardware device or VM."
            />
          )}
        >
          {() => (
            <GlassCard>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/30 hover:bg-transparent">
                      <TableHead>Hostname</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Primary IP</TableHead>
                      <TableHead>MAC Address</TableHead>
                      <TableHead>OS</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedDevices.map((device) => (
                      <TableRow
                        key={device.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/devices/${device.id}`)}
                      >
                        <TableCell className="font-medium">
                          {device.hostname}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="gap-1 hover:bg-secondary"
                          >
                            <DeviceIcon type={device.device_type} />
                            {device.device_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {device.primary_ip ? (
                            <div className="flex items-center gap-2">
                              <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant="outline"
                                      className={
                                        device.is_static
                                          ? "bg-amber-500/10 text-amber-600 border-amber-500/20 text-[9px] h-4 px-1.5 shadow-sm uppercase font-semibold tracking-wider cursor-help"
                                          : "bg-blue-500/10 text-blue-500 border-blue-500/20 text-[9px] h-4 px-1.5 shadow-sm uppercase font-semibold tracking-wider opacity-50 cursor-help"
                                      }
                                    >
                                      {device.is_static ? "S" : "D"}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="top"
                                    className="max-w-[200px]"
                                  >
                                    {device.is_static
                                      ? "Static reservation — this IP is manually assigned and will not change."
                                      : "Dynamic lease — this IP was assigned by DHCP and may change on renewal."}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <span className="font-mono text-sm">
                                {device.primary_ip}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {device.mac_address || (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {device.os_info || (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-primary/20 hover:text-primary transition-colors"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm({
                                  id: device.id,
                                  hostname: device.hostname,
                                });
                              }}
                              className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </GlassCard>
          )}
        </DataFetcher>

        {/* Create Device Dialog */}
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setFormData(defaultDeviceFormData());
            }
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
            <FormWrapper
              onSubmit={async () => {
                await handleSave();
              }}
            >
              <div className="grid gap-4 py-6">
                <FormInput
                  id="hostname"
                  label="Hostname"
                  placeholder="e.g. server-01"
                  value={formData.hostname || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, hostname: e.target.value })
                  }
                  className={deviceInputClass}
                  required
                />

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
                    <SelectTrigger className={deviceSelectTriggerClass}>
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
                    <SelectTrigger className={deviceSelectTriggerClass}>
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

                <FormInput
                  id="mac"
                  label="Initial MAC Address (eth0)"
                  placeholder="00:00:00:00:00:00"
                  value={formData.mac_address || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, mac_address: e.target.value })
                  }
                  className={deviceInputClass}
                />

                <FormInput
                  id="os"
                  label="OS Info"
                  placeholder="e.g. Ubuntu 22.04"
                  value={formData.os_info || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, os_info: e.target.value })
                  }
                  className={deviceInputClass}
                />

                <FormInput
                  id="ip"
                  label="Static IP Address (optional)"
                  placeholder="192.168.1.100"
                  value={formData.ip_address || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, ip_address: e.target.value })
                  }
                  className={deviceInputClass}
                />
              </div>
              <DialogFooter className="border-t border-border/20 pt-4 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="hover:bg-secondary/60"
                >
                  Cancel
                </Button>
                <Button type="submit">Create Device</Button>
              </DialogFooter>
            </FormWrapper>
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={!!deleteConfirm}
          onOpenChange={(open) => !open && setDeleteConfirm(null)}
          onConfirm={() =>
            deleteConfirm &&
            handleDelete(deleteConfirm.id, deleteConfirm.hostname)
          }
          title="Delete Device?"
          description={
            <>
              This will permanently delete{" "}
              <span className="font-semibold text-foreground">
                {deleteConfirm?.hostname}
              </span>{" "}
              and all its associated data. This action cannot be undone.
            </>
          }
          confirmLabel="Delete Device"
        />
      </div>
    </AppLayout>
  );
};
