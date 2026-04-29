import { fetchApi } from "@/lib/api-client";

export function getSettings() {
  return fetchApi<Record<string, string>>("/api/settings");
}

export function updateSetting(key: string, value: boolean) {
  return fetchApi("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ [key]: value }),
  });
}
