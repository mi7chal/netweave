import { Badge } from "@/components/ui/badge";
import type { ServiceStatus } from "@/types/api";

interface StatusBadgeProps {
    status: ServiceStatus | string;
    className?: string;
}

const statusVariants: Record<string, "outline" | "secondary" | "destructive"> = {
    UP: "outline",
    UNKNOWN: "secondary",
    DOWN: "destructive",
    MAINTENANCE: "secondary",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
    return (
        <Badge variant={statusVariants[status] ?? "secondary"} className={className}>
            {status}
        </Badge>
    );
}
