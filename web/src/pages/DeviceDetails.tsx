import { useState } from "react";
import useSWR from "swr";
import { cn } from "@/lib/utils";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { fetchApi } from "@/lib/api-client";
import {
  type DeviceDetails,
  DeviceType,
  type CreateDevicePayload,
} from "@/types/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { DetailPageLoadingSkeleton } from "@/components/LoadingSkeletons";
import { DeviceIcon } from "@/lib/device-utils";
import { InterfaceDialog } from "@/components/InterfaceDialog";
import { AssignStaticIpDialog } from "@/components/AssignStaticIpDialog";
import { EditDeviceDialog } from "@/components/EditDeviceDialog";
import {
  Plus,
  Trash2,
  Cpu,
  HardDrive,
  MemoryStick,
  Edit2,
  Network,
  Server,
} from "lucide-react";

// --- Sub-components ---

function HardwareCard({ device }: { device: DeviceDetails }) {
  return (
    <Card className="md:col-span-1 h-fit border-black/5 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-2xl shadow-lg overflow-hidden">
      <CardHeader className="relative z-10 pb-4 border-b border-border/30">
        <CardTitle className="text-lg">Hardware Specs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pt-6 relative z-10">
        {(
          [
            { icon: Cpu, label: "CPU Cores", value: device.cpu_cores || "-" },
            {
              icon: MemoryStick,
              label: "RAM",
              value: device.ram_gb ? `${device.ram_gb} GB` : "-",
            },
            {
              icon: HardDrive,
              label: "Storage",
              value: device.storage_gb ? `${device.storage_gb} GB` : "-",
            },
          ] as const
        ).map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground">
              <Icon className="h-4 w-4 text-primary/80" /> {label}
            </div>
            <span className="font-semibold text-foreground/90 bg-secondary/40 px-2 py-0.5 rounded-md">
              {value}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function IpRow({
  ip,
  iface,
  deviceId,
  mutate,
  showSeparator,
}: {
  ip: DeviceDetails["interfaces"][0]["ips"][0];
  iface: DeviceDetails["interfaces"][0];
  deviceId: string;
  mutate: () => void;
  showSeparator?: boolean;
}) {
  const [confirmRelease, setConfirmRelease] = useState(false);
  const [makeStaticOpen, setMakeStaticOpen] = useState(false);
  const [editIpOpen, setEditIpOpen] = useState(false);

  const handleMakeStatic = async (targetIp: string) => {
    try {
      await fetchApi(`/api/devices/${deviceId}/ips/${ip.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ip_address: targetIp,
          mac_address: iface.mac_address,
          is_static: true,
          status: "ACTIVE",
        }),
      });
      toast.success(`IP ${targetIp} is now statically assigned`);
      setMakeStaticOpen(false);
      mutate();
    } catch (e) {
      console.error(e);
      toast.error("Failed to make IP static");
    }
  };

  const handleEditIp = async (targetIp: string) => {
    try {
      await fetchApi(`/api/devices/${deviceId}/ips/${ip.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ip_address: targetIp,
          mac_address: iface.mac_address,
          is_static: true,
          status: "ACTIVE",
        }),
      });
      toast.success(`IP updated to ${targetIp}`);
      setEditIpOpen(false);
      mutate();
    } catch (e: unknown) {
      toast.error((e as Error)?.message || "Failed to update IP");
    }
  };

  const handleRelease = async () => {
    try {
      await fetchApi(`/api/devices/${deviceId}/ips/${ip.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_static: false, status: "ACTIVE" }),
      });
      toast.success("Static IP released and is now back to dynamic");
      setConfirmRelease(false);
      mutate();
    } catch (e) {
      console.error(e);
      toast.error("Failed to release static IP");
    }
  };

  return (
    <>
      {showSeparator && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={4} className="py-1 px-0 h-auto">
            <div className="flex items-center gap-2 px-3">
              <div className="h-px flex-1 bg-border/40" />
              <span className="text-[10px] text-muted-foreground/50 uppercase tracking-widest font-medium">
                Dynamic Leases
              </span>
              <div className="h-px flex-1 bg-border/40" />
            </div>
          </TableCell>
        </TableRow>
      )}
      <TableRow
        className={cn(
          "hover:bg-transparent transition-colors",
          ip.is_static
            ? "border-l-2 border-l-amber-500/60"
            : "opacity-60 hover:opacity-100",
        )}
      >
        <TableCell className="py-2.5 font-mono text-sm">
          {ip.ip_address}
        </TableCell>
        <TableCell className="py-2.5">
          <Badge
            variant="outline"
            className={
              ip.is_static
                ? "bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] h-5 shadow-sm uppercase font-semibold tracking-wider"
                : "bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px] h-5 shadow-sm uppercase font-semibold tracking-wider"
            }
          >
            {ip.is_static ? "STATIC" : "DYNAMIC"}
          </Badge>
        </TableCell>
        <TableCell className="py-2.5">
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] h-5 shadow-sm uppercase font-semibold tracking-wider",
              ip.status === "ACTIVE" && ip.is_static
                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                : ip.status === "ACTIVE" && !ip.is_static
                  ? "bg-green-500/10 text-green-600 border-green-500/20"
                  : ip.status === "RESERVED"
                    ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                    : "bg-secondary/50 text-muted-foreground border-border/50",
            )}
          >
            {ip.status === "RESERVED"
              ? "DHCP RSV"
              : ip.status === "ACTIVE"
                ? ip.is_static
                  ? "ACTIVE"
                  : "DHCP DYN"
                : ip.status}
          </Badge>
        </TableCell>
        <TableCell className="py-2.5 text-right flex justify-end gap-2">
          {ip.is_static ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setEditIpOpen(true)}
              >
                <Edit2 className="h-3 w-3 mr-1" /> Edit IP
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmRelease(true)}
              >
                Make Dynamic
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() =>
                ip.network_id
                  ? setMakeStaticOpen(true)
                  : toast.error("Cannot make static: missing network ID on IP.")
              }
            >
              Make Static
            </Button>
          )}
        </TableCell>
      </TableRow>

      <AssignStaticIpDialog
        open={makeStaticOpen}
        onOpenChange={setMakeStaticOpen}
        onSubmit={handleMakeStatic}
        defaultIp={ip.ip_address}
        macLabel={iface.mac_address || undefined}
      />
      <AssignStaticIpDialog
        open={editIpOpen}
        onOpenChange={setEditIpOpen}
        onSubmit={handleEditIp}
        defaultIp={ip.ip_address}
        macLabel={iface.mac_address || undefined}
        title="Edit Static IP"
        description="Change the reserved IP address. Conflicts will be checked."
        submitLabel="Save Changes"
      />
      <ConfirmDialog
        open={confirmRelease}
        onOpenChange={setConfirmRelease}
        onConfirm={handleRelease}
        title="Release Static Lease?"
        description={
          <>
            This will release the static reservation for{" "}
            <span className="font-mono font-semibold text-foreground">
              {ip.ip_address}
            </span>{" "}
            and convert it back to a dynamic DHCP lease.
          </>
        }
        confirmLabel="Release Static Lease"
      />
    </>
  );
}

function InterfaceCard({
  iface,
  deviceId,
  mutate,
}: {
  iface: DeviceDetails["interfaces"][0];
  deviceId: string;
  mutate: () => void;
}) {
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const handleDelete = async () => {
    try {
      await fetchApi(`/api/devices/${deviceId}/interfaces/${iface.id}`, {
        method: "DELETE",
      });
      toast.success("Interface deleted", {
        description: "The interface has been successfully removed.",
      });
      setDeleteConfirm(false);
      mutate();
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete interface");
    }
  };

  const handleEdit = async (name: string, mac: string) => {
    try {
      await fetchApi(`/api/devices/${deviceId}/interfaces/${iface.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name,
          mac_address: mac || null,
          interface_type: "ethernet",
        }),
      });
      toast.success("Interface updated");
      setEditOpen(false);
      mutate();
    } catch (e) {
      console.error(e);
      toast.error("Failed to update interface");
    }
  };

  const sortedIps = [...iface.ips].sort((a, b) =>
    a.is_static === b.is_static ? 0 : a.is_static ? -1 : 1,
  );
  const hasStatic = sortedIps.some((ip) => ip.is_static);
  const hasDynamic = sortedIps.some((ip) => !ip.is_static);

  return (
    <>
      <Card className="border-black/5 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
        <CardHeader className="py-3 px-4 bg-black/5 dark:bg-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium font-mono">{iface.name}</span>
              <Badge variant="secondary" className="text-xs font-normal">
                {iface.mac_address || "No MAC"}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-primary"
                onClick={() => setEditOpen(true)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => setDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-3">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-8">IP Address</TableHead>
                <TableHead className="h-8">Type</TableHead>
                <TableHead className="h-8">State</TableHead>
                <TableHead className="h-8 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {iface.ips.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={4}
                    className="text-muted-foreground text-xs h-8 py-2 text-center"
                  >
                    No IP addresses assigned.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {sortedIps.map((ip, i) => {
                    const showSeparator =
                      hasStatic &&
                      hasDynamic &&
                      !ip.is_static &&
                      (i === 0 || sortedIps[i - 1]?.is_static);
                    return (
                      <IpRow
                        key={ip.id}
                        ip={ip}
                        iface={iface}
                        deviceId={deviceId}
                        mutate={mutate}
                        showSeparator={showSeparator}
                      />
                    );
                  })}
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <InterfaceDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleEdit}
        initialName={iface.name}
        initialMac={iface.mac_address || ""}
        mode="edit"
      />
      <ConfirmDialog
        open={deleteConfirm}
        onOpenChange={setDeleteConfirm}
        onConfirm={handleDelete}
        title="Delete Interface?"
        description={
          <>
            This will permanently remove interface{" "}
            <span className="font-mono font-semibold text-foreground">
              {iface.name}
            </span>{" "}
            and all its IP assignments.
          </>
        }
        confirmLabel="Delete Interface"
      />
    </>
  );
}

// --- Main Page ---

export const DeviceDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    data: device,
    error,
    isLoading,
    mutate,
  } = useSWR<DeviceDetails>(id ? `/api/devices/${id}` : null, fetchApi, {
    onError: () => toast.error("Failed to load device details"),
  });

  const [addIfaceOpen, setAddIfaceOpen] = useState(false);
  const [editDeviceOpen, setEditDeviceOpen] = useState(false);
  const [deleteDeviceConfirm, setDeleteDeviceConfirm] = useState(false);
  const [editFormData, setEditFormData] = useState<
    Partial<CreateDevicePayload>
  >({});

  const handleAddInterface = async (name: string, mac: string) => {
    try {
      await fetchApi(`/api/devices/${id}/interfaces`, {
        method: "POST",
        body: JSON.stringify({
          name,
          mac_address: mac || null,
          interface_type: "ethernet",
        }),
      });
      toast.success("Interface added");
      setAddIfaceOpen(false);
      mutate();
    } catch (e) {
      console.error(e);
      toast.error("Failed to add interface");
    }
  };

  const handleDeleteDevice = async () => {
    try {
      await fetchApi(`/api/devices/${id}`, { method: "DELETE" });
      toast.success("Device deleted");
      navigate("/devices");
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete device");
    }
  };

  const handleSaveDevice = async (data: Partial<CreateDevicePayload>) => {
    try {
      await fetchApi(`/api/devices/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      setEditDeviceOpen(false);
      toast.success("Device updated");
      mutate();
    } catch (e) {
      console.error(e);
      toast.error("Failed to update device");
    }
  };

  const openEditDevice = () => {
    if (!device) return;
    setEditFormData({
      hostname: device.hostname,
      parent_device_id: device.parent_device_id || undefined,
      device_type: device.device_type || DeviceType.Other,
      os_info: device.os_info || "",
      cpu_cores: device.cpu_cores || undefined,
      ram_gb: device.ram_gb || undefined,
      storage_gb: device.storage_gb || undefined,
    });
    setEditDeviceOpen(true);
  };

  if (isLoading)
    return (
      <AppLayout>
        <DetailPageLoadingSkeleton />
      </AppLayout>
    );
  if (error)
    return (
      <AppLayout>
        <ErrorState message={error.message} onRetry={() => mutate()} />
      </AppLayout>
    );
  if (!device)
    return (
      <AppLayout>
        <div className="text-center py-10 text-muted-foreground font-medium">
          Device not found
        </div>
      </AppLayout>
    );

  return (
    <AppLayout>
      <div className="space-y-6">
        <Button
          variant="ghost"
          className="-ml-3 mb-2 text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/devices")}
        >
          ← Back to Devices
        </Button>

        {/* Device Header */}
        <div className="flex justify-between items-end relative z-10 px-1 w-full flex-col md:flex-row gap-4">
          <div className="flex items-center gap-4 w-full">
            <div className="p-3.5 bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 rounded-xl shadow-[0_0_15px_rgba(120,119,198,0.2)] relative flex-shrink-0">
              <div className="absolute inset-0 bg-primary/20 rounded-xl blur-md opacity-50" />
              <div className="relative z-10 text-primary">
                <DeviceIcon type={device.device_type} className="h-6 w-6" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {device.hostname}
              </h1>
              <div className="flex items-center gap-3 mt-1.5 text-muted-foreground text-sm">
                <Badge
                  variant="outline"
                  className="border-border/50 bg-secondary/30 shadow-sm font-medium"
                >
                  {device.device_type}
                </Badge>
                <span>•</span>
                <span>{device.os_info || "Unknown OS"}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button
              variant="outline"
              className="gap-2 shadow-sm rounded-full h-10 px-5 hover:scale-105 transition-all duration-300"
              onClick={openEditDevice}
            >
              <Edit2 className="h-4 w-4" /> Edit
            </Button>
            <Button
              variant="outline"
              className="gap-2 shadow-sm rounded-full h-10 px-5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive hover:scale-105 transition-all duration-300"
              onClick={() => setDeleteDeviceConfirm(true)}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid gap-6 md:grid-cols-3 relative z-10 mt-6">
          <HardwareCard device={device} />

          <div className="md:col-span-2 space-y-4">
            <Tabs defaultValue="interfaces">
              <TabsList>
                <TabsTrigger value="interfaces">Interfaces & IPs</TabsTrigger>
                <TabsTrigger value="services">Services</TabsTrigger>
              </TabsList>

              <TabsContent value="interfaces" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Network Interfaces</h3>
                  <Button size="sm" onClick={() => setAddIfaceOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Add Interface
                  </Button>
                </div>
                {device.interfaces.length === 0 ? (
                  <EmptyState
                    icon={Network}
                    title="No interfaces found"
                    description="Add a network interface to start mapping IP addresses."
                  />
                ) : (
                  <div className="grid gap-4">
                    {device.interfaces.map((iface) => (
                      <InterfaceCard
                        key={iface.id}
                        iface={iface}
                        deviceId={id!}
                        mutate={mutate}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="services" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Associated Services</h3>
                  <Button size="sm" onClick={() => navigate("/services")}>
                    <Plus className="h-4 w-4 mr-2" /> Add Service
                  </Button>
                </div>
                {device.services.length === 0 ? (
                  <EmptyState
                    icon={Server}
                    title="No services found"
                    description="There are no services associated with this device yet."
                  />
                ) : (
                  <div className="grid gap-4">
                    {device.services.map((service) => {
                      const uptime =
                        service.total_checks > 0
                          ? (service.successful_checks / service.total_checks) *
                            100
                          : 100;
                      const statusBadge =
                        service.total_checks === 0
                          ? "UNKNOWN"
                          : uptime >= 99
                            ? "UP"
                            : "DOWN";
                      return (
                        <Card
                          key={service.id}
                          className="border border-white/40 dark:border-white/10 bg-gradient-to-br from-white/60 to-white/30 dark:from-white/10 dark:to-white/5 backdrop-blur-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
                        >
                          <div className="absolute inset-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] pointer-events-none z-20 rounded-xl" />
                          <CardContent className="p-4 relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-lg">
                                  {service.name}
                                </h4>
                                <Badge
                                  variant={
                                    service.is_public ? "outline" : "secondary"
                                  }
                                  className="text-[10px] h-5 px-1.5 font-normal shadow-sm"
                                >
                                  {service.is_public ? "Public" : "Private"}
                                </Badge>
                              </div>
                              <a
                                href={service.base_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline mt-1"
                              >
                                {service.base_url}
                              </a>
                            </div>
                            <div className="flex items-center gap-4 sm:ml-auto">
                              <div className="flex flex-col items-end">
                                <span className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">
                                  Uptime
                                </span>
                                <span
                                  className={cn(
                                    "font-semibold text-sm",
                                    uptime >= 99
                                      ? "text-green-500"
                                      : uptime >= 95
                                        ? "text-amber-500"
                                        : "text-destructive",
                                  )}
                                >
                                  {uptime.toFixed(1)}%
                                </span>
                              </div>
                              <div className="h-8 w-px bg-border/50 mx-2 hidden sm:block" />
                              <Badge
                                variant={
                                  statusBadge === "UP"
                                    ? "outline"
                                    : statusBadge === "UNKNOWN"
                                      ? "secondary"
                                      : "destructive"
                                }
                                className={cn(
                                  "shadow-sm min-w-16 justify-center",
                                  statusBadge === "UP" &&
                                    "bg-green-500/10 text-green-500 border-green-500/20",
                                  statusBadge === "UNKNOWN" &&
                                    "bg-secondary text-muted-foreground",
                                )}
                              >
                                {statusBadge}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Dialogs */}
        <InterfaceDialog
          open={addIfaceOpen}
          onOpenChange={setAddIfaceOpen}
          onSubmit={handleAddInterface}
          mode="add"
        />
        <EditDeviceDialog
          open={editDeviceOpen}
          onOpenChange={setEditDeviceOpen}
          onSubmit={handleSaveDevice}
          initialData={editFormData}
        />
        <ConfirmDialog
          open={deleteDeviceConfirm}
          onOpenChange={setDeleteDeviceConfirm}
          onConfirm={handleDeleteDevice}
          title="Delete Device?"
          description={
            <>
              This will permanently delete{" "}
              <span className="font-semibold text-foreground">
                {device.hostname}
              </span>{" "}
              and all associated interfaces, IP assignments, and service links.
            </>
          }
          confirmLabel="Delete Device"
        />
      </div>
    </AppLayout>
  );
};
