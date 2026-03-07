import { Server, Monitor, Laptop, Router, Network, Wifi, Container } from "lucide-react";
import { DeviceType } from "@/types/api";
import { cn } from "@/lib/utils";

const DEVICE_ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
    [DeviceType.Physical]: Server,
    [DeviceType.Vm]: Monitor,
    [DeviceType.Lxc]: Container,
    [DeviceType.Container]: Container,
    [DeviceType.Switch]: Network,
    [DeviceType.Router]: Router,
    [DeviceType.Ap]: Wifi,
};

export function DeviceIcon({ type, className }: { type: string; className?: string }) {
    const Icon = DEVICE_ICON_MAP[type] || Laptop;
    return <Icon className={cn("h-4 w-4", className)} />;
}
