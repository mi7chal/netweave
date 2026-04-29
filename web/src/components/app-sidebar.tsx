import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  KeyRound,
  LogOut,
  Network,
  Server,
  Settings,
  Settings2,
  Users,
  Zap,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    adminOnly: false,
  },
  { name: "Services", href: "/services", icon: Zap, adminOnly: true },
  { name: "Networks", href: "/networks", icon: Network, adminOnly: true },
  { name: "Devices", href: "/devices", icon: Server, adminOnly: true },
  { name: "Users", href: "/users", icon: Users, adminOnly: true },
  {
    name: "Integrations",
    href: "/integrations",
    icon: Settings2,
    adminOnly: true,
  },
  { name: "Settings", href: "/settings", icon: Settings, adminOnly: true },
];

export function AppSidebar() {
  const location = useLocation();
  const { isAdmin, logout } = useAuth();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const visibleNav = navigation.filter((item) => !item.adminOnly || isAdmin);

  return (
    <Sidebar variant="sidebar" collapsible="none">
      <SidebarHeader>
        <Link to="/" className="flex items-center gap-2 px-2 py-1">
          <Server />
          <span>NetWeave</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNav.map((item) => {
                const isActive = location.pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className="h-9 px-4"
                    >
                      <Link to={item.href} className="flex w-full items-center gap-2">
                        <item.icon />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="mt-auto">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2"
          onClick={() => setChangePasswordOpen(true)}
        >
          <KeyRound />
          Change password
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2"
          onClick={async () => {
            await logout();
            window.location.href = "/login";
          }}
        >
          <LogOut />
          Sign out
        </Button>
        <ChangePasswordDialog
          open={changePasswordOpen}
          onOpenChange={setChangePasswordOpen}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
