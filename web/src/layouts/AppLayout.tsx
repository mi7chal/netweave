import { AppSidebar } from "@/components/app-sidebar";
import { LogIn } from "lucide-react";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface AppLayoutProps {
  children: React.ReactNode;
  showNavigation?: boolean;
}

function GithubMark(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" {...props}>
      <path d="M12 .5C5.73.5.75 5.48.75 11.74c0 5.01 3.24 9.25 7.73 10.75.56.1.77-.24.77-.55 0-.27-.01-.99-.02-1.94-3.14.69-3.8-1.51-3.8-1.51-.51-1.3-1.26-1.64-1.26-1.64-1.03-.71.08-.7.08-.7 1.14.08 1.74 1.16 1.74 1.16 1.01 1.74 2.66 1.24 3.31.95.1-.73.39-1.24.71-1.53-2.5-.28-5.12-1.25-5.12-5.56 0-1.23.44-2.24 1.16-3.03-.12-.28-.5-1.42.11-2.95 0 0 .95-.3 3.11 1.16.9-.25 1.86-.37 2.82-.38.96 0 1.92.13 2.82.38 2.16-1.46 3.11-1.16 3.11-1.16.61 1.53.23 2.67.11 2.95.72.79 1.16 1.8 1.16 3.03 0 4.32-2.63 5.28-5.13 5.56.4.35.75 1.03.75 2.08 0 1.5-.01 2.71-.01 3.08 0 .3.2.65.78.54 4.48-1.5 7.71-5.74 7.71-10.74C23.25 5.48 18.27.5 12 .5z" />
    </svg>
  );
}

export function AppLayout({ children, showNavigation = true }: AppLayoutProps) {
  const navigate = useNavigate();

  if (!showNavigation) {
    // Public view without sidebar
    return (
      <div className="h-screen w-full overflow-hidden bg-background relative flex flex-col">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))] pointer-events-none" />
        <div className="absolute inset-0 z-0 bg-premium-grid [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-40 pointer-events-none" />

        <header className="flex h-14 shrink-0 items-center justify-end gap-2 border-b/50 bg-background/80 backdrop-blur-xl px-4 sticky top-0 z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/login")}
            className="gap-2"
          >
            <LogIn className="h-4 w-4" />
            Login
          </Button>
        </header>

        <main className="flex-1 w-full mx-auto p-4 md:p-6 lg:p-8 z-10 relative overflow-y-auto scrollbar-hide flex flex-col">
          <div className="flex-1">{children}</div>
          <div className="w-full mt-auto pt-24 pb-0 flex justify-center opacity-30 hover:opacity-100 transition-opacity duration-300">
            <a
              href="https://github.com/mi7chal"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/40 hover:bg-background/80 hover:shadow-sm border border-transparent hover:border-border/30 transition-all duration-300 text-muted-foreground hover:text-primary group"
            >
              <GithubMark className="h-3.5 w-3.5 group-hover:scale-110 transition-transform duration-300" />
              <span className="text-[11px] font-medium tracking-wide">
                © 2026 mi7chal
              </span>
            </a>
          </div>
        </main>
      </div>
    );
  }

  return (
    <SidebarProvider className="h-screen w-full overflow-hidden">
      <AppSidebar />
      <SidebarInset className="bg-background relative flex flex-col flex-1 overflow-hidden">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))] pointer-events-none" />
        <div className="absolute inset-0 z-0 bg-premium-grid [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-40 pointer-events-none" />

        <header className="flex h-14 shrink-0 items-center gap-2 border-b/50 bg-background/80 backdrop-blur-xl px-4 sticky top-0 z-50 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
          </div>
        </header>
        <main className="flex-1 w-full mx-auto p-4 md:p-6 lg:p-8 z-10 relative overflow-y-auto scrollbar-hide flex flex-col">
          <div className="flex-1">{children}</div>
          {/* Copyright Footer */}
          <div className="w-full mt-auto pt-24 pb-0 flex justify-center opacity-30 hover:opacity-100 transition-opacity duration-300">
            <a
              href="https://github.com/mi7chal"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/40 hover:bg-background/80 hover:shadow-sm border border-transparent hover:border-border/30 transition-all duration-300 text-muted-foreground hover:text-primary group"
            >
              <GithubMark className="h-3.5 w-3.5 group-hover:scale-110 transition-transform duration-300" />
              <span className="text-[11px] font-medium tracking-wide">
                © 2026 mi7chal
              </span>
            </a>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
