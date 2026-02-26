import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";

interface AppLayoutProps {
    children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
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
                <main className="flex-1 w-full mx-auto p-4 md:p-6 lg:p-8 z-10 relative overflow-y-auto scrollbar-hide">
                    {children}
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
