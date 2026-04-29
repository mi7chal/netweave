import { useState } from "react";
import { Edit2, Network, Trash2 } from "lucide-react";
import type { InterfaceWithIps } from "@/types/api";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { InterfaceDialog } from "@/components/InterfaceDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IpRow } from "./IpRow";

interface InterfaceCardProps {
  iface: InterfaceWithIps;
  onEditInterface: (interfaceId: string, name: string, mac: string) => Promise<boolean>;
  onDeleteInterface: (interfaceId: string) => Promise<boolean>;
  onMakeStaticIp: (ipId: string, targetIp: string, macAddress?: string | null) => Promise<boolean>;
  onEditStaticIp: (ipId: string, targetIp: string, macAddress?: string | null) => Promise<boolean>;
  onReleaseStaticIp: (ipId: string) => Promise<boolean>;
}

export function InterfaceCard({
  iface,
  onEditInterface,
  onDeleteInterface,
  onMakeStaticIp,
  onEditStaticIp,
  onReleaseStaticIp,
}: InterfaceCardProps) {
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const handleDelete = async () => {
    const success = await onDeleteInterface(iface.id);
    if (success) {
      setDeleteConfirm(false);
    }
  };

  const handleEdit = async (name: string, mac: string) => {
    const success = await onEditInterface(iface.id, name, mac);
    if (success) {
      setEditOpen(false);
    }
  };

  const sortedIps = [...iface.ips].sort((a, b) => (a.is_static === b.is_static ? 0 : a.is_static ? -1 : 1));
  const hasStatic = sortedIps.some((ip) => ip.is_static);
  const hasDynamic = sortedIps.some((ip) => !ip.is_static);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Network />
              <span>{iface.name}</span>
              <Badge variant="secondary">{iface.mac_address || "No MAC"}</Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={() => setEditOpen(true)}>
                <Edit2 />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(true)}>
                <Trash2 />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>IP Address</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {iface.ips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    No IP addresses assigned.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {sortedIps.map((ip, index) => {
                    const showSeparator =
                      hasStatic && hasDynamic && !ip.is_static && (index === 0 || sortedIps[index - 1]?.is_static);
                    return (
                      <IpRow
                        key={ip.id}
                        ip={ip}
                        iface={iface}
                        showSeparator={showSeparator}
                        onMakeStaticIp={onMakeStaticIp}
                        onEditStaticIp={onEditStaticIp}
                        onReleaseStaticIp={onReleaseStaticIp}
                      />
                    );
                  })}
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <InterfaceDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleEdit}
        initialName={iface.name}
        initialMac={iface.mac_address || ""}
        mode="edit"
      />
      <ConfirmDialog
        open={deleteConfirm}
        onOpenChange={setDeleteConfirm}
        onConfirm={handleDelete}
        title="Delete Interface?"
        description={
          <>
            This will permanently remove interface <span className="font-semibold">{iface.name}</span> and all its
            IP assignments.
          </>
        }
        confirmLabel="Delete Interface"
      />
    </>
  );
}
