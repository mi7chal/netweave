import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ServiceStatus } from "@/types/api";

interface StatusBadgeProps {
    status: ServiceStatus | string;
    className?: string;
}

const statusStyles: Record<string, string> = {
    UP: "bg-green-500/10 text-green-500 border-green-500/20",
    DOWN: "",
    UNKNOWN: "bg-secondary text-muted-foreground",
    MAINTENANCE: "bg-amber-500/10 text-amber-500 border-amber-500/20",
};

const statusVariants: Record<string, "outline" | "secondary" | "destructive"> = {
    UP: "outline",
    UNKNOWN: "secondary",
    DOWN: "destructive",
    MAINTENANCE: "outline",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
    return (
        <Badge
            variant={statusVariants[status] ?? "secondary"}
            className={cn("shadow-sm", statusStyles[status], className)}
        >
            {status}
        </Badge>
    );
}
