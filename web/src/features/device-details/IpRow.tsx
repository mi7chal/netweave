import { useState } from "react";
import { Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InterfaceWithIps, IpAddress } from "@/types/api";
import { toast } from "sonner";
import { AssignStaticIpDialog } from "@/components/AssignStaticIpDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";

interface IpRowProps {
  ip: IpAddress;
  iface: InterfaceWithIps;
  showSeparator?: boolean;
  onMakeStaticIp: (ipId: string, targetIp: string, macAddress?: string | null) => Promise<boolean>;
  onEditStaticIp: (ipId: string, targetIp: string, macAddress?: string | null) => Promise<boolean>;
  onReleaseStaticIp: (ipId: string) => Promise<boolean>;
}

export function IpRow({
  ip,
  iface,
  showSeparator,
  onMakeStaticIp,
  onEditStaticIp,
  onReleaseStaticIp,
}: IpRowProps) {
  const [confirmRelease, setConfirmRelease] = useState(false);
  const [makeStaticOpen, setMakeStaticOpen] = useState(false);
  const [editIpOpen, setEditIpOpen] = useState(false);

  const handleMakeStatic = async (targetIp: string) => {
    const success = await onMakeStaticIp(ip.id, targetIp, iface.mac_address);
    if (success) {
      setMakeStaticOpen(false);
    }
  };

  const handleEditIp = async (targetIp: string) => {
    const success = await onEditStaticIp(ip.id, targetIp, iface.mac_address);
    if (success) {
      setEditIpOpen(false);
    }
  };

  const handleRelease = async () => {
    const success = await onReleaseStaticIp(ip.id);
    if (success) {
      setConfirmRelease(false);
    }
  };

  return (
    <>
      {showSeparator && (
        <TableRow>
          <TableCell colSpan={4}>
            <div className="px-3">
              <span>Dynamic Leases</span>
            </div>
          </TableCell>
        </TableRow>
      )}
      <TableRow className={cn(!ip.is_static && "opacity-70")}>
        <TableCell>{ip.ip_address}</TableCell>
        <TableCell>
          <Badge variant="secondary">{ip.is_static ? "STATIC" : "DYNAMIC"}</Badge>
        </TableCell>
        <TableCell>
          <Badge variant="secondary">
            {ip.status === "RESERVED"
              ? "DHCP RSV"
              : ip.status === "ACTIVE"
                ? ip.is_static
                  ? "ACTIVE"
                  : "DHCP DYN"
                : ip.status}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="flex justify-end gap-2">
            {ip.is_static ? (
              <>
                <Button variant="secondary" size="sm" onClick={() => setEditIpOpen(true)}>
                  <Edit2 /> Edit IP
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setConfirmRelease(true)}>
                  Make Dynamic
                </Button>
              </>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  ip.network_id
                    ? setMakeStaticOpen(true)
                    : toast.error("Cannot make static: missing network ID on IP.")
                }
              >
                Make Static
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>

      <AssignStaticIpDialog
        open={makeStaticOpen}
        onOpenChange={setMakeStaticOpen}
        onSubmit={handleMakeStatic}
        defaultIp={ip.ip_address}
        macLabel={iface.mac_address || undefined}
      />
      <AssignStaticIpDialog
        open={editIpOpen}
        onOpenChange={setEditIpOpen}
        onSubmit={handleEditIp}
        defaultIp={ip.ip_address}
        macLabel={iface.mac_address || undefined}
        title="Edit Static IP"
        description="Change the reserved IP address. Conflicts will be checked."
        submitLabel="Save Changes"
      />
      <ConfirmDialog
        open={confirmRelease}
        onOpenChange={setConfirmRelease}
        onConfirm={handleRelease}
        title="Release Static Lease?"
        description={
          <>
            This will release the static reservation for{" "}
            <span className="font-semibold">{ip.ip_address}</span> and convert it back to a dynamic DHCP
            lease.
          </>
        }
        confirmLabel="Release Static Lease"
      />
    </>
  );
}
