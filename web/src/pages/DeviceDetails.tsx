import { useState } from "react";
import useSWR from "swr";
import { useNavigate, useParams } from "react-router-dom";
import { Edit2, Network, Plus, Server, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/layouts/AppLayout";
import { DeviceIcon } from "@/lib/device-utils";
import { getDeviceDetails } from "@/lib/api/devices";
import { DeviceType, type CreateDevicePayload, type DeviceDetails } from "@/types/api";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EditDeviceDialog } from "@/components/EditDeviceDialog";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { InterfaceDialog } from "@/components/InterfaceDialog";
import { DetailPageLoadingSkeleton } from "@/components/LoadingSkeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeviceServicesList } from "@/features/device-details/DeviceServicesList";
import { HardwareCard } from "@/features/device-details/HardwareCard";
import { InterfaceCard } from "@/features/device-details/InterfaceCard";
import { useDeviceDetailsMutations } from "@/features/device-details/useDeviceDetailsMutations";

export const DeviceDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    data: device,
    error,
    isLoading,
    mutate,
  } = useSWR<DeviceDetails>(id ? ["device-details", id] : null, () => getDeviceDetails(id!), {
    onError: () => toast.error("Failed to load device details"),
  });

  const [addIfaceOpen, setAddIfaceOpen] = useState(false);
  const [editDeviceOpen, setEditDeviceOpen] = useState(false);
  const [deleteDeviceConfirm, setDeleteDeviceConfirm] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<CreateDevicePayload>>({});

  const refreshDevice = () => {
    void mutate();
  };

  const mutations = useDeviceDetailsMutations({
    deviceId: id ?? "",
    refresh: refreshDevice,
    onDeleted: () => navigate("/devices"),
  });

  const handleAddInterface = async (name: string, mac: string) => {
    const success = await mutations.addInterface(name, mac);
    if (success) {
      setAddIfaceOpen(false);
    }
  };

  const handleSaveDevice = async (payload: Partial<CreateDevicePayload>) => {
    const success = await mutations.saveDevice(payload);
    if (success) {
      setEditDeviceOpen(false);
    }
  };

  const openEditDevice = () => {
    if (!device) {
      return;
    }

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

  if (isLoading) {
    return (
      <AppLayout>
        <DetailPageLoadingSkeleton />
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <ErrorState message={error.message} onRetry={refreshDevice} />
      </AppLayout>
    );
  }

  if (!device) {
    return (
      <AppLayout>
        <div className="py-10 text-center">Device not found</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <Button variant="ghost" className="-ml-3 mb-2" onClick={() => navigate("/devices")}>
          ← Back to Devices
        </Button>

        <div className="flex w-full flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="flex w-full items-center gap-4">
            <div className="flex items-center justify-center">
              <DeviceIcon type={device.device_type} />
            </div>
            <div>
              <h1>{device.hostname}</h1>
              <div className="mt-1.5 flex items-center gap-3">
                <Badge variant="secondary">{device.device_type}</Badge>
                <span>•</span>
                <span>{device.os_info || "Unknown OS"}</span>
              </div>
            </div>
          </div>
          <div className="flex w-full gap-2 md:w-auto">
            <Button variant="secondary" onClick={openEditDevice}>
              <Edit2 /> Edit
            </Button>
            <Button variant="secondary" onClick={() => setDeleteDeviceConfirm(true)}>
              <Trash2 /> Delete
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <HardwareCard device={device} />

          <div className="flex flex-col gap-4 md:col-span-2">
            <Tabs defaultValue="interfaces">
              <TabsList>
                <TabsTrigger value="interfaces">Interfaces & IPs</TabsTrigger>
                <TabsTrigger value="services">Services</TabsTrigger>
              </TabsList>

              <TabsContent value="interfaces" className="mt-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3>Network Interfaces</h3>
                  <Button size="sm" onClick={() => setAddIfaceOpen(true)}>
                    <Plus /> Add Interface
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
                        onEditInterface={mutations.editInterface}
                        onDeleteInterface={mutations.removeInterface}
                        onMakeStaticIp={mutations.makeStaticIp}
                        onEditStaticIp={mutations.editStaticIp}
                        onReleaseStaticIp={mutations.releaseStaticIp}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="services" className="mt-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3>Associated Services</h3>
                  <Button size="sm" onClick={() => navigate("/services")}>
                    <Plus /> Add Service
                  </Button>
                </div>
                {device.services.length === 0 ? (
                  <EmptyState
                    icon={Server}
                    title="No services found"
                    description="There are no services associated with this device yet."
                  />
                ) : (
                  <DeviceServicesList services={device.services} />
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <InterfaceDialog open={addIfaceOpen} onOpenChange={setAddIfaceOpen} onSubmit={handleAddInterface} mode="add" />
        <EditDeviceDialog
          open={editDeviceOpen}
          onOpenChange={setEditDeviceOpen}
          onSubmit={handleSaveDevice}
          initialData={editFormData}
        />
        <ConfirmDialog
          open={deleteDeviceConfirm}
          onOpenChange={setDeleteDeviceConfirm}
          onConfirm={mutations.removeDevice}
          title="Delete Device?"
          description={
            <>
              This will permanently delete <span className="font-semibold">{device.hostname}</span> and all
              associated interfaces, IP assignments, and service links.
            </>
          }
          confirmLabel="Delete Device"
        />
      </div>
    </AppLayout>
  );
};
