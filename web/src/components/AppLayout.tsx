import { Button, Card, Spacer } from "@heroui/react";
import { LayoutDashboard, Network, Server, Settings, Activity, Globe } from "lucide-react";
import { Link as RouterLink, useLocation } from "react-router-dom";

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
    const location = useLocation();
    const pathname = location.pathname;

    return (
        <div className="flex min-h-screen w-full bg-background text-foreground selection:bg-primary/20 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(40,40,60,0.6),rgba(255,255,255,0))]">
            {/* Sidebar - Glass Effect */}
            <aside className="hidden w-64 flex-col border-r border-white/10 bg-black/40 px-4 py-6 backdrop-blur-xl lg:flex fixed h-full z-50 shadow-2xl">
                <div className="flex items-center gap-2 px-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
                        <Activity size={20} />
                    </div>
                    <span className="text-lg font-bold tracking-tight">Homelab</span>
                </div>

                <Spacer y={8} />

                <nav className="flex flex-1 flex-col gap-2">
                    <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" href="/dashboard" active={pathname === "/dashboard"} />
                    <NavItem icon={<Globe size={20} />} label="Integrations" href="/integrations" active={pathname === "/integrations"} />
                    <NavItem icon={<Activity size={20} />} label="Services" href="/services" active={pathname === "/services"} />
                    <NavItem icon={<Network size={20} />} label="Networks" href="/networks" active={pathname === "/networks"} />
                    <NavItem icon={<Server size={20} />} label="Devices" href="/devices" active={pathname === "/devices"} />
                </nav>

                <div className="mt-auto">
                    <Card className="bg-default-100/50 border-none shadow-none backdrop-blur-md">
                        <div className="p-3 flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-pink-500 to-yellow-500"></div>
                            <div className="flex flex-col">
                                <span className="text-xs font-semibold">Admin User</span>
                                <span className="text-[10px] text-default-500">admin@homelab.local</span>
                            </div>
                            <Settings size={16} className="ml-auto text-default-400 cursor-pointer hover:text-foreground transition-colors" />
                        </div>
                    </Card>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 lg:pl-64">
                <div className="container mx-auto p-6 max-w-7xl animate-in fade-in zoom-in duration-500">
                    {children}
                </div>
            </main>
        </div>
    );
};

const NavItem = ({ icon, label, href, active = false }: { icon: React.ReactNode, label: string, href: string, active?: boolean }) => {
    return (
        <Button
            as={RouterLink}
            to={href}
            variant={active ? "flat" : "light"}
            color={active ? "primary" : "default"}
            className={`justify-start gap-3 w-full ${active ? "bg-primary/10 text-primary font-medium" : "text-default-500 hover:text-foreground"}`}
            radius="sm"
        >
            {icon}
            {label}
        </Button>
    )
}
