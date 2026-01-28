export interface Service {
    id: string;
    device_id: string | null;
    name: string;
    base_url: string;
    health_endpoint: string | null;
    monitor_interval_seconds: number;
    is_public: boolean;
    status: ServiceStatus;
    last_check: string | null;
}

export type ServiceStatus = "UP" | "DOWN" | "UNKNOWN" | "MAINTENANCE";

export interface DashboardResponse {
    services: Service[];
}

export interface CreateServicePayload {
    name: string;
    base_url: string;
    device_id?: string;
    is_public: boolean;
}
