import { Cpu, HardDrive, MemoryStick } from "lucide-react";
import type { DeviceDetails } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface HardwareCardProps {
  device: DeviceDetails;
}

export function HardwareCard({ device }: HardwareCardProps) {
  return (
    <Card className="md:col-span-1">
      <CardHeader>
        <CardTitle>Hardware Specs</CardTitle>
      </CardHeader>
      <CardContent>
        {(
          [
            { icon: Cpu, label: "CPU Cores", value: device.cpu_cores || "-" },
            {
              icon: MemoryStick,
              label: "RAM",
              value: device.ram_gb ? `${device.ram_gb} GB` : "-",
            },
            {
              icon: HardDrive,
              label: "Storage",
              value: device.storage_gb ? `${device.storage_gb} GB` : "-",
            },
          ] as const
        ).map(({ icon: Icon, label, value }) => (
          <div key={label} className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon /> {label}
            </div>
            <span className="font-medium">{value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
