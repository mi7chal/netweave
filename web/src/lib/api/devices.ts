import { fetchApi } from "@/lib/api-client";
import type { CreateDevicePayload, DeviceDetails } from "@/types/api";

export function getDeviceDetails(id: string) {
  return fetchApi<DeviceDetails>(`/api/devices/${id}`);
}

export function updateDevice(id: string, payload: Partial<CreateDevicePayload>) {
  return fetchApi(`/api/devices/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
    silent: true,
  });
}

export function deleteDevice(id: string) {
  return fetchApi(`/api/devices/${id}`, { method: "DELETE" });
}

export function createDeviceInterface(id: string, name: string, mac: string) {
  return fetchApi(`/api/devices/${id}/interfaces`, {
    method: "POST",
    body: JSON.stringify({
      name,
      mac_address: mac || null,
      interface_type: "ethernet",
    }),
  });
}

export function updateDeviceInterface(deviceId: string, interfaceId: string, name: string, mac: string) {
  return fetchApi(`/api/devices/${deviceId}/interfaces/${interfaceId}`, {
    method: "PUT",
    body: JSON.stringify({
      name,
      mac_address: mac || null,
      interface_type: "ethernet",
    }),
  });
}

export function deleteDeviceInterface(deviceId: string, interfaceId: string) {
  return fetchApi(`/api/devices/${deviceId}/interfaces/${interfaceId}`, {
    method: "DELETE",
  });
}

export function updateAssignedIp(
  deviceId: string,
  ipId: string,
  payload: { ip_address?: string; mac_address?: string | null; is_static: boolean; status: string },
) {
  return fetchApi(`/api/devices/${deviceId}/ips/${ipId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
