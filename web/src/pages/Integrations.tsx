import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CrudPage } from "@/components/CrudPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardGridLoadingSkeleton } from "@/components/LoadingSkeletons";
import { RefreshCw, Settings2, Trash2 } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import { AddIntegrationDialog } from "../components/AddIntegrationDialog";
import { toast } from "sonner";
import type { Integration } from "@/types/api";
import { useDeleteWithConfirm, useTableSearch } from "@/hooks";
import {
  deleteIntegration,
  listIntegrations,
  triggerIntegrationSync,
} from "@/lib/api/integrations";

export const Integrations = () => {
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const {
    data: integrations = [],
    error,
    isLoading,
    mutate,
  } = useSWR<Integration[]>("/api/integrations", listIntegrations, {
    refreshInterval,
    onSuccess: (data) => {
      const hasActiveWork = data.some(
        (i) => i.status === "SYNCING" || i.status === "PENDING",
      );
      setRefreshInterval(hasActiveWork ? 1000 : 5000);
    },
  });

  const { searchTerm: search, setSearchTerm: setSearch, filteredData: filteredIntegrations } =
    useTableSearch(integrations, { searchableFields: ["name", "provider_type"] });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      await deleteIntegration(id);
      mutate();
      toast.success("Integration deleted");
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete integration");
      throw e;
    }
  };
  const {
    deleteConfirm,
    isDeleting,
    promptDelete,
    clearDeleteConfirm,
    confirmDelete,
  } = useDeleteWithConfirm(async (id) => handleDelete(id));

  const handleSync = async (id: string, name: string) => {
    setSyncingId(id);
    const startTime = Date.now();
    try {
      await triggerIntegrationSync(id);
      mutate();
    } catch (e) {
      console.error(e);
      toast.error(`Sync failed for ${name}`, {
        description: "Check server logs for more details.",
      });
    } finally {
      const remaining = Math.max(0, 800 - (Date.now() - startTime));
      setTimeout(() => setSyncingId(null), remaining);
    }
  };

  return (
    <>
      <CrudPage
        title="Integrations"
        description="Manage external connections (AdGuard, Unifi, Kea)."
        emptyIcon={Settings2}
        emptyTitle="No integrations found"
        emptyDescription="Add your first provider to start syncing."
        addLabel="Add Integration"
        data={integrations}
        filteredData={filteredIntegrations}
        isLoading={isLoading}
        error={error}
        onRetry={mutate}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search integrations..."
        onAdd={() => setIsDialogOpen(true)}
        noContainer={true}
        loadingComponent={<CardGridLoadingSkeleton count={6} />}
      >
        {(items) => (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((int) => {
              const isSyncing = syncingId === int.id || int.status === "SYNCING";
              const displayStatus = int.status.startsWith("ERROR")
                ? int.status.match(/\b\d{3}\b/)
                  ? `ERROR ${int.status.match(/\b\d{3}\b/)?.[0]}`
                  : "ERROR"
                : int.status;

              return (
                <Card key={int.id} className="h-full">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="truncate pr-2">
                      {int.name}
                    </CardTitle>
                    <Badge
                      variant={
                        int.status === "ACTIVE"
                          ? "outline"
                          : int.status.startsWith("ERROR")
                            ? "destructive"
                            : "secondary"
                      }
                      className="cursor-help"
                      title={int.status}
                    >
                      {displayStatus}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      {int.provider_type} Provider
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <p>
                        Last Sync:{" "}
                        {int.last_sync_at
                          ? new Date(int.last_sync_at).toLocaleString()
                          : "Never"}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSync(int.id, int.name)}
                          disabled={isSyncing}
                          title="Sync Now"
                        >
                          <RefreshCw className={isSyncing ? "animate-spin" : ""} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            promptDelete(int.id, int.name)
                          }
                          disabled={isSyncing}
                          title="Delete"
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CrudPage>

      <AddIntegrationDialog
        isOpen={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) mutate();
        }}
        onSaved={mutate}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && clearDeleteConfirm()}
        onConfirm={confirmDelete}
        isSubmitting={isDeleting}
        submittingLabel="Deleting..."
        title="Delete Integration?"
        description={
          <>
            This will permanently remove the{" "}
            <span className="font-semibold">
              {deleteConfirm?.label}
            </span>{" "}
            integration and its configuration. This action cannot be undone.
          </>
        }
        confirmLabel="Delete Integration"
      />
    </>
  );
};
