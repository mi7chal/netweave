import useSWR from "swr";
import { AppLayout } from "../layouts/AppLayout";
import type { DashboardResponse } from "../types/api";
import { fetchApi } from "@/lib/api-client";
import { CheckCircle2, Activity, Server, AlertCircle } from "lucide-react";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { DashboardLoadingSkeleton } from "@/components/LoadingSkeletons";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";

export const Dashboard = () => {
  const { isAuthenticated, isAdmin } = useAuth();
  const { data, error, mutate } = useSWR<DashboardResponse>(
    "/api/dashboard",
    fetchApi,
    {
      refreshInterval: 5000,
      revalidateOnFocus: true,
    },
  );

  if (error) {
    return (
      <AppLayout showNavigation={isAuthenticated && isAdmin}>
        <ErrorState message={error.message} onRetry={() => mutate()} />
      </AppLayout>
    );
  }

  if (!data) {
    return (
      <AppLayout showNavigation={isAuthenticated && isAdmin}>
        <DashboardLoadingSkeleton />
      </AppLayout>
    );
  }

  const services = data?.services || [];
  const upCount = services.filter((s) => s.status === "UP").length;
  const downCount = services.filter((s) => s.status === "DOWN").length;

  const totalChecks = services.reduce(
    (acc, s) => acc + (s.total_checks || 0),
    0,
  );
  const successfulChecks = services.reduce(
    (acc, s) => acc + (s.successful_checks || 0),
    0,
  );
  const overallUptime =
    totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 100;

  return (
    <AppLayout showNavigation={isAuthenticated && isAdmin}>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Dashboard"
          description="Overview of service status and uptime."
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatusCard icon={Server} label="Apps" value={String(services.length)} />
          <StatusCard icon={CheckCircle2} label="Healthy" value={String(upCount)} />
          <StatusCard icon={AlertCircle} label="Issues" value={String(downCount)} />
          <StatusCard
            icon={Activity}
            label="Uptime"
            value={`${overallUptime.toFixed(1)}%`}
          />
        </div>

        {services.length === 0 ? (
          <EmptyState
            icon={Server}
            title="Welcome to your Dashboard"
            description="Go to Services and add your first application."
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Uptime</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((service) => {
                    const uptime =
                      service.total_checks > 0
                        ? (service.successful_checks / service.total_checks) * 100
                        : 100;
                    return (
                      <TableRow key={service.id}>
                        <TableCell className="font-medium">{service.name}</TableCell>
                        <TableCell>
                          <a href={service.base_url} target="_blank" rel="noreferrer">
                            {service.base_url}
                          </a>
                        </TableCell>
                        <TableCell>{uptime.toFixed(1)}%</TableCell>
                        <TableCell>
                          <StatusBadge status={service.status} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

function StatusCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
        <Icon className="size-4 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}
