import { useEffect, useState } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Globe, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { getSettings, updateSetting } from "@/lib/api/settings";

export function Settings() {
  const [homepagePublic, setHomepagePublic] = useState(false);
  const [oidcAutoImport, setOidcAutoImport] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSettings()
      .then((data) => {
        setHomepagePublic(data.homepage_public === "true");
        setOidcAutoImport(data.oidc_auto_import === "true");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (
    key: string,
    checked: boolean,
    currentVal: boolean,
    setVal: (val: boolean) => void,
  ) => {
    setVal(checked);
    try {
      await updateSetting(key, checked);
      toast.success("Settings updated");
    } catch {
      setVal(currentVal);
      toast.error("Failed to update settings");
    }
  };

  return (
    <AppLayout>
      <PageHeader title="Settings" description="Application configuration" />
      <Card className="mt-6 max-w-2xl">
        <CardContent className="flex flex-col gap-6 p-6">
          <SettingRow
            icon={Globe}
            id="homepage-public"
            title="Public Homepage"
            description="Allow unauthenticated users to view the dashboard homepage."
            checked={homepagePublic}
            loading={loading}
            onCheckedChange={(checked) =>
              handleToggle("homepage_public", checked, homepagePublic, setHomepagePublic)
            }
          />
          <SettingRow
            icon={Users}
            id="oidc-auto-import"
            title="OIDC Auto Import"
            description="Automatically create local users when they log in via OIDC."
            checked={oidcAutoImport}
            loading={loading}
            onCheckedChange={(checked) =>
              handleToggle("oidc_auto_import", checked, oidcAutoImport, setOidcAutoImport)
            }
          />
        </CardContent>
      </Card>
    </AppLayout>
  );
}

function SettingRow({
  icon: Icon,
  id,
  title,
  description,
  checked,
  loading,
  onCheckedChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  id: string;
  title: string;
  description: string;
  checked: boolean;
  loading: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center">
          <Icon />
        </div>
        <div>
          <Label htmlFor={id}>
            {title}
          </Label>
          <p>{description}</p>
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-6 w-12" />
      ) : (
        <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
      )}
    </div>
  );
}
