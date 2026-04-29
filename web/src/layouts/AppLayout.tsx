import { AppSidebar } from "@/components/app-sidebar";
import { LogIn, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface AppLayoutProps {
  children: React.ReactNode;
  showNavigation?: boolean;
}

export function AppLayout({ children, showNavigation = true }: AppLayoutProps) {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();

  if (!showNavigation) {
    // Public view without sidebar
    return (
      <div className="flex min-h-svh w-full flex-col">
        <header className="flex h-14 shrink-0 items-center justify-end gap-2 border-b px-4">
          {isAuthenticated ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              <LogOut />
              Logout
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/login")}
            >
              <LogIn />
              Login
            </Button>
          )}
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    );
  }

  return (
    <SidebarProvider className="h-svh w-full overflow-hidden">
      <AppSidebar />
      <SidebarInset>
        <main className="mx-auto w-full max-w-7xl flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
