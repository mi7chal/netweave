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
} from "@/components/ui/sidebar"
import { LayoutDashboard, LogOut, Network, Server, Settings, Settings2, Zap } from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"

const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, adminOnly: false },
    { name: "Services", href: "/services", icon: Zap, adminOnly: false },
    { name: "Networks", href: "/networks", icon: Network, adminOnly: true },
    { name: "Devices", href: "/devices", icon: Server, adminOnly: true },
    { name: "Integrations", href: "/integrations", icon: Settings2, adminOnly: true },
    { name: "Settings", href: "/settings", icon: Settings, adminOnly: true },
];

export function AppSidebar() {
    const location = useLocation();
    const { user, isAdmin, logout } = useAuth();

    const visibleNav = navigation.filter(item => !item.adminOnly || isAdmin);

    return (
        <Sidebar variant="inset" className="border-r border-border/10 bg-sidebar/40 backdrop-blur-3xl shadow-2xl">
            <SidebarHeader className="h-16 flex items-center px-6 justify-start">
                <Link to="/" className="flex items-center gap-3 font-semibold group transition-all duration-300">
                    <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-[0_0_15px_rgba(120,119,198,0.2)] group-hover:shadow-[0_0_25px_rgba(120,119,198,0.4)] transition-all duration-300">
                        <div className="absolute inset-0 bg-primary/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <Server className="h-5 w-5 text-primary relative z-10" />
                    </div>
                    <span className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70 group-hover:to-primary/80 transition-all duration-300">NetWeave</span>
                </Link>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel className="text-xs font-medium text-muted-foreground">Menu</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {visibleNav.map((item) => {
                                const isActive = location.pathname.startsWith(item.href);
                                return (
                                    <SidebarMenuItem key={item.name} className="px-2">
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isActive}
                                            className={cn(
                                                "transition-all duration-300 rounded-xl h-11 relative overflow-hidden group",
                                                isActive ? "bg-primary/10 text-primary shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] border border-primary/20" : "hover:bg-primary/5 hover:text-foreground text-muted-foreground"
                                            )}
                                        >
                                            <Link to={item.href} className="flex items-center gap-3 relative z-10 w-full px-3">
                                                {isActive && <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />}
                                                <item.icon className={cn("h-4 w-4 transition-transform duration-300", isActive ? "scale-110 drop-shadow-[0_0_8px_rgba(120,119,198,0.5)]" : "group-hover:scale-110")} />
                                                <span className={cn("font-medium transition-colors", isActive && "text-primary/90 text-shadow-sm")}>{item.name}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="p-4 border-t border-border/10 space-y-2">
                {user && (
                    <button
                        onClick={async () => { await logout(); window.location.href = '/login'; }}
                        className="group flex items-center justify-between w-full px-3 py-2 rounded-xl transition-all duration-300 hover:bg-destructive/10 border border-transparent hover:border-destructive/20"
                    >
                        <div className="flex flex-col text-left">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{user.role}</span>
                            <span className="text-sm font-medium text-muted-foreground group-hover:text-destructive transition-colors">{user.username}</span>
                        </div>
                        <LogOut className="h-4 w-4 text-muted-foreground group-hover:text-destructive group-hover:scale-110 transition-all duration-300" />
                    </button>
                )}
            </SidebarFooter>
        </Sidebar>
    )
}
