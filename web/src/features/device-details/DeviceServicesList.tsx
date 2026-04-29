import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Service } from "@/types/api";

interface DeviceServicesListProps {
  services: Service[];
}

export function DeviceServicesList({ services }: DeviceServicesListProps) {
  return (
    <div className="grid gap-4">
      {services.map((service) => {
        const uptime =
          service.total_checks > 0 ? (service.successful_checks / service.total_checks) * 100 : 100;
        const statusBadge =
          service.total_checks === 0 ? "UNKNOWN" : uptime >= 99 ? "UP" : "DOWN";

        return (
          <Card key={service.id}>
            <CardContent className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h4>{service.name}</h4>
                  <Badge variant={service.is_public ? "outline" : "secondary"}>
                    {service.is_public ? "Public" : "Private"}
                  </Badge>
                </div>
                <a href={service.base_url} target="_blank" rel="noopener noreferrer">
                  {service.base_url}
                </a>
              </div>
              <div className="flex items-center gap-4 sm:ml-auto">
                <div className="flex flex-col items-end">
                  <span>Uptime</span>
                  <span>{uptime.toFixed(1)}%</span>
                </div>
                <Badge variant="secondary">{statusBadge}</Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
