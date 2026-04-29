import type { CreateDevicePayload } from "@/types/api";
import {
  createDeviceInterface,
  deleteDevice,
  deleteDeviceInterface,
  updateAssignedIp,
  updateDevice,
  updateDeviceInterface,
} from "@/lib/api/devices";
import { toast } from "sonner";

type RefreshFn = () => void;

interface DeviceDetailsMutationsOptions {
  deviceId: string;
  refresh: RefreshFn;
  onDeleted: () => void;
}

export function useDeviceDetailsMutations({
  deviceId,
  refresh,
  onDeleted,
}: DeviceDetailsMutationsOptions) {
  const addInterface = async (name: string, mac: string) => {
    try {
      await createDeviceInterface(deviceId, name, mac);
      toast.success("Interface added");
      refresh();
      return true;
    } catch (error) {
      console.error(error);
      toast.error("Failed to add interface");
      return false;
    }
  };

  const editInterface = async (interfaceId: string, name: string, mac: string) => {
    try {
      await updateDeviceInterface(deviceId, interfaceId, name, mac);
      toast.success("Interface updated");
      refresh();
      return true;
    } catch (error) {
      console.error(error);
      toast.error("Failed to update interface");
      return false;
    }
  };

  const removeInterface = async (interfaceId: string) => {
    try {
      await deleteDeviceInterface(deviceId, interfaceId);
      toast.success("Interface deleted", {
        description: "The interface has been successfully removed.",
      });
      refresh();
      return true;
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete interface");
      return false;
    }
  };

  const makeStaticIp = async (ipId: string, targetIp: string, macAddress?: string | null) => {
    try {
      await updateAssignedIp(deviceId, ipId, {
        ip_address: targetIp,
        mac_address: macAddress || null,
        is_static: true,
        status: "ACTIVE",
      });
      toast.success(`IP ${targetIp} is now statically assigned`);
      refresh();
      return true;
    } catch (error) {
      console.error(error);
      toast.error("Failed to make IP static");
      return false;
    }
  };

  const editStaticIp = async (ipId: string, targetIp: string, macAddress?: string | null) => {
    try {
      await updateAssignedIp(deviceId, ipId, {
        ip_address: targetIp,
        mac_address: macAddress || null,
        is_static: true,
        status: "ACTIVE",
      });
      toast.success(`IP updated to ${targetIp}`);
      refresh();
      return true;
    } catch (error) {
      toast.error((error as Error)?.message || "Failed to update IP");
      return false;
    }
  };

  const releaseStaticIp = async (ipId: string) => {
    try {
      await updateAssignedIp(deviceId, ipId, {
        is_static: false,
        status: "ACTIVE",
      });
      toast.success("Static IP released and is now back to dynamic");
      refresh();
      return true;
    } catch (error) {
      console.error(error);
      toast.error("Failed to release static IP");
      return false;
    }
  };

  const saveDevice = async (payload: Partial<CreateDevicePayload>) => {
    try {
      await updateDevice(deviceId, payload);
      toast.success("Device updated");
      refresh();
      return true;
    } catch (error) {
      console.error(error);
      toast.error("Failed to update device");
      return false;
    }
  };

  const removeDevice = async () => {
    try {
      await deleteDevice(deviceId);
      toast.success("Device deleted");
      onDeleted();
      return true;
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete device");
      return false;
    }
  };

  return {
    addInterface,
    editInterface,
    removeInterface,
    makeStaticIp,
    editStaticIp,
    releaseStaticIp,
    saveDevice,
    removeDevice,
  };
}
