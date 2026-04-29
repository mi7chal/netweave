import { fetchApi } from "@/lib/api-client";
import type { Integration } from "@/types/api";

export function listIntegrations() {
  return fetchApi<Integration[]>("/api/integrations");
}

export function deleteIntegration(id: string) {
  return fetchApi(`/api/integrations/${id}`, { method: "DELETE", silent: true });
}

export function triggerIntegrationSync(id: string) {
  return fetchApi(`/api/integrations/${id}/sync`, { method: "POST", silent: true });
}
