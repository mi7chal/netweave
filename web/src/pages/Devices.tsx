import { Button } from "@/components/ui/button";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CrudPage } from "@/components/CrudPage";
import { EditDeviceDialog } from "@/components/EditDeviceDialog";
import { AddDeviceDialog } from "@/components/AddDeviceDialog";
import { DeviceIcon } from "@/lib/device-utils";
import { Trash2, Edit2, Server } from "lucide-react";
import { useState } from "react";
import { fetchApi } from "@/lib/api-client";
import {
  type DeviceListView,
  type CreateDevicePayload,
} from "@/types/api";
import { useCRUDList, useDeleteWithConfirm, useTableSearch } from "@/hooks";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export const Devices = () => {
  const navigate = useNavigate();

  const {
    data: devices,
    error,
    isLoading,
    mutate,
    remove,
  } = useCRUDList<DeviceListView>({
    endpoint: "/api/devices",
    onLoadError: (e) =>
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

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editDevice, setEditDevice] = useState<DeviceListView | null>(null);

  const handleDelete = async (id: string, hostname: string) => {
    try {
      await remove(id);
      toast.success("Device deleted", {
        description: `${hostname} has been removed successfully.`,
      });
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete device");
      throw e;
    }
  };
  const {
    deleteConfirm,
    isDeleting,
    promptDelete,
    clearDeleteConfirm,
    confirmDelete,
  } =
    useDeleteWithConfirm(handleDelete);

  const handleEditSubmit = async (data: Partial<CreateDevicePayload>) => {
    if (!editDevice) return;
    try {
      await fetchApi(`/api/devices/${editDevice.id}`, {
        method: "PUT",
        silent: true,
        body: JSON.stringify(data),
      });
      mutate();
      setEditDevice(null);
      toast.success("Device updated");
    } catch (e) {
      console.error(e);
      toast.error("Failed to update device");
    }
  };

  const sortDevices = (items: DeviceListView[]) =>
    [...items].sort((a, b) => {
      const group = (d: DeviceListView) =>
        d.is_static === true ? 0 : d.is_static === false ? 1 : 2;
      const diff = group(a) - group(b);
      if (diff !== 0) return diff;
      const ipToNum = (ip?: string | null) => {
        if (!ip) return Infinity;
        return ip
          .split(".")
          .reduce((acc, octet) => acc * 256 + Number(octet), 0);
      };
      return ipToNum(a.primary_ip) - ipToNum(b.primary_ip);
    });

  const editInitialData: Partial<CreateDevicePayload> = editDevice
    ? {
        hostname: editDevice.hostname,
        device_type: editDevice.device_type,
        os_info: editDevice.os_info ?? undefined,
        mac_address: editDevice.mac_address ?? undefined,
      }
    : {};

  return (
    <>
      <CrudPage
        title="Devices"
        description="Manage infrastructure hardware and virtual machines."
        emptyIcon={Server}
        emptyTitle="No devices found"
        emptyDescription="Add your first hardware device or VM."
        addLabel="Add Device"
        data={devices}
        filteredData={filteredData}
        isLoading={isLoading}
        error={error}
        onRetry={mutate}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search devices..."
        onAdd={() => setIsCreateOpen(true)}
        skeletonColumns={6}
      >
        {(items) => {
          const sortedDevices = sortDevices(items);
          return (
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditDevice(device);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          promptDelete(device.id, device.hostname);
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
          );
        }}
      </CrudPage>

      <AddDeviceDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSaved={mutate}
        devices={devices || []}
      />

      <EditDeviceDialog
        open={!!editDevice}
        onOpenChange={(open) => !open && setEditDevice(null)}
        onSubmit={handleEditSubmit}
        initialData={editInitialData}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && clearDeleteConfirm()}
        onConfirm={confirmDelete}
        isSubmitting={isDeleting}
        submittingLabel="Deleting..."
        title="Delete Device?"
        description={
          <>
            This will permanently delete{" "}
            <span className="font-semibold text-foreground">
              {deleteConfirm?.label}
            </span>{" "}
            and all its associated data. This action cannot be undone.
          </>
        }
        confirmLabel="Delete Device"
      />
    </>
  );
};
