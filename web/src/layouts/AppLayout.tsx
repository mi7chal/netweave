import { Link, useLocation } from "react-router-dom";
import {
    LayoutDashboard,
    Network,
    Server,
    Settings2,
    Zap,
    Menu
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface AppLayoutProps {
    children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const navigation = [
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { name: "Services", href: "/services", icon: Zap },
        { name: "Networks", href: "/networks", icon: Network },
        { name: "Devices", href: "/devices", icon: Server },
        { name: "Integrations", href: "/integrations", icon: Settings2 },
    ];

    return (
        <div className="min-h-screen bg-background font-sans antialiased flex">
            {/* Sidebar - Desktop */}
            <aside className="hidden border-r bg-card md:flex md:w-64 md:flex-col">
                <div className="flex h-16 items-center border-b px-6">
                    <Link to="/" className="flex items-center gap-2 font-semibold">
                        <Server className="h-6 w-6" />
                        <span className="">Homelab</span>
                    </Link>
                </div>
                <div className="flex-1 overflow-y-auto py-4">
                    <nav className="grid gap-1 px-2">
                        {navigation.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname.startsWith(item.href);
                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className={cn(
                                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                                        isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex flex-1 flex-col">
                {/* Mobile Header */}
                <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 md:hidden">
                    <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                        <Menu className="h-5 w-5" />
                    </Button>
                    <span className="font-semibold">Homelab Manager</span>
                </header>

                {/* Mobile Menu (Simple overlay for now) */}
                {isMobileMenuOpen && (
                    <div className="fixed inset-0 z-50 bg-background md:hidden p-4">
                        <div className="flex items-center justify-between mb-4">
                            <span className="font-bold">Menu</span>
                            <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                                <Menu className="h-5 w-5" />
                            </Button>
                        </div>
                        <nav className="grid gap-2">
                            {navigation.map((item) => (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                                        location.pathname.startsWith(item.href) ? "bg-accent" : ""
                                    )}
                                >
                                    <item.icon className="h-4 w-4" />
                                    {item.name}
                                </Link>
                            ))}
                        </nav>
                    </div>
                )}


                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                    <div className="mx-auto max-w-6xl space-y-6">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
