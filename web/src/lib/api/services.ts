import { fetchApi } from "@/lib/api-client";
import type { Service } from "@/types/api";

interface DashboardResponse {
  services: Service[];
}

export function getDashboardServices() {
  return fetchApi<DashboardResponse>("/api/dashboard");
}

export function deleteService(id: string) {
  return fetchApi(`/api/services/${id}`, {
    method: "DELETE",
    silent: true,
  });
}
