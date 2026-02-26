import { useState, useEffect } from "react";
import useSWR from "swr";
import { AppLayout } from "../layouts/AppLayout";
import type { DashboardResponse, Service } from "../types/api";
import { fetchApi } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { CheckCircle2, Activity, Server, AlertCircle } from "lucide-react";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";

export const Dashboard = () => {
    const { data, error, mutate } = useSWR<DashboardResponse>('/api/dashboard', fetchApi, {
        refreshInterval: 5000,
        revalidateOnFocus: true,
    });

    if (error) {
        return <AppLayout><ErrorState message={error.message} onRetry={() => mutate()} /></AppLayout>;
    }

    const services = data?.services || [];
    const upCount = services.filter(s => s.status === 'UP').length;
    const downCount = services.filter(s => s.status === 'DOWN').length;

    const totalChecks = services.reduce((acc, s) => acc + (s.total_checks || 0), 0);
    const successfulChecks = services.reduce((acc, s) => acc + (s.successful_checks || 0), 0);
    const overallUptime = totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 100;

    return (
        <AppLayout>
            <div className="flex flex-col items-center w-full max-w-[1400px] mx-auto px-2 sm:px-6 lg:px-12 pb-10">

                <TimeWidget />

                {/* Status Pills */}
                <div className="flex flex-wrap justify-center gap-3 sm:gap-5 mb-14 w-full">
                    <div className="flex items-center gap-2.5 bg-white/80 dark:bg-white/10 backdrop-blur-2xl px-5 py-2.5 rounded-[1.25rem] border border-black/5 dark:border-white/10 shadow-sm transition-all hover:bg-white dark:hover:bg-white/15 hover:shadow-md cursor-default">
                        <Server className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-bold text-foreground tracking-tight">{services.length} Apps</span>
                    </div>
                    <div className="flex items-center gap-2.5 bg-white/80 dark:bg-white/10 backdrop-blur-2xl px-5 py-2.5 rounded-[1.25rem] border border-black/5 dark:border-white/10 shadow-sm transition-all hover:bg-white dark:hover:bg-white/15 hover:shadow-md cursor-default">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-bold text-green-600 dark:text-green-500 tracking-tight">{upCount} Healthy</span>
                    </div>
                    {downCount > 0 && (
                        <div className="flex items-center gap-2.5 bg-white/80 dark:bg-white/10 backdrop-blur-2xl px-5 py-2.5 rounded-[1.25rem] border border-destructive/30 shadow-sm transition-all hover:bg-white dark:hover:bg-white/15 hover:shadow-md cursor-default">
                            <AlertCircle className="h-4 w-4 text-destructive" />
                            <span className="text-sm font-bold text-destructive tracking-tight">{downCount} Issues</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2.5 bg-white/80 dark:bg-white/10 backdrop-blur-2xl px-5 py-2.5 rounded-[1.25rem] border border-black/5 dark:border-white/10 shadow-sm transition-all hover:bg-white dark:hover:bg-white/15 hover:shadow-md cursor-default">
                        <Activity className={cn("h-4 w-4", overallUptime >= 99 ? "text-primary" : overallUptime >= 95 ? "text-amber-500" : "text-destructive")} />
                        <span className="text-sm font-bold text-foreground tracking-tight">{overallUptime.toFixed(1)}% Uptime</span>
                    </div>
                </div>

                {/* App Grid: Sun-Panel Desktop Icon Style */}
                <div className="flex flex-wrap justify-center content-start gap-4 sm:gap-5 md:gap-6 lg:gap-8 xl:gap-10 w-full max-w-[900px] mx-auto px-4">
                    {services.length === 0 ? (
                        <EmptyState icon={Server} title="Welcome to your Dashboard" description="Go to the Services tab to add your first app tile." />
                    ) : (
                        services.map((service) => (
                            <ServiceCard key={service.id} service={service} />
                        ))
                    )}
                </div>
            </div>
        </AppLayout>
    );
};

const TimeWidget = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center w-full py-8 lg:py-12 select-none">
            <h1 className="text-[3.5rem] sm:text-[4.5rem] lg:text-[5.5rem] font-medium tracking-tight text-foreground tabular-nums drop-shadow-sm leading-none">
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </h1>
            <p className="text-muted-foreground/90 mt-4 text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase px-5 py-1.5 rounded-full border border-border/30 bg-card/20 backdrop-blur-md shadow-sm">
                {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
        </div>
    );
};

function ServiceCard({ service }: { service: Service }) {
    const urlWithProto = service.base_url.startsWith('http') ? service.base_url : `http://${service.base_url}`;

    // 1. First attempt: High quality homelab icons from walkxcode repo
    const normalizedName = service.name.toLowerCase().replace(/\s+/g, '-');
    const primaryIcon = `https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/${normalizedName}.png`;

    const [imgUrl, setImgUrl] = useState(primaryIcon);
    const [imgError, setImgError] = useState(false);

    const handleImgError = () => {
        if (imgUrl === primaryIcon) {
            // 2. Second attempt: Attempt to retrieve direct local favicon.ico
            setImgUrl(`${urlWithProto}/favicon.ico`);
        } else {
            // 3. Final fallback: Show generated letter tile
            setImgError(true);
        }
    };

    const isUp = service.status === 'UP';
    const isDown = service.status === 'DOWN';

    // Generate a deterministic brilliant color for the first-letter tile
    const colors = [
        "bg-[#ef4444]", // Red
        "bg-[#3b82f6]", // Blue
        "bg-[#10b981]", // Emerald
        "bg-[#f59e0b]", // Amber
        "bg-[#8b5cf6]", // Violet
        "bg-[#ec4899]", // Pink
        "bg-[#06b6d4]", // Cyan
        "bg-[#f97316]", // Orange
        "bg-[#6366f1]"  // Indigo
    ];
    // Calculate index based on string characters sum
    const charCode = service.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const fallbackColorClass = colors[charCode % colors.length];

    return (
        <a
            href={urlWithProto}
            target="_blank"
            rel="noopener noreferrer"
            className="group outline-none w-full max-w-[120px] flex flex-col items-center gap-3.5"
            aria-label={`Launch ${service.name}`}
        >
            <div className="relative flex items-center justify-center w-[4.5rem] h-[4.5rem] sm:w-[5.5rem] sm:h-[5.5rem] lg:w-[6.5rem] lg:h-[6.5rem] rounded-[1.25rem] lg:rounded-[1.75rem] transition-all duration-500 group-hover:-translate-y-2 group-hover:scale-[1.03] shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:shadow-[0_16px_40px_rgb(0,0,0,0.2)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] dark:hover:shadow-[0_16px_40px_rgb(0,0,0,0.4)] group-focus-visible:ring-4 group-focus-visible:ring-primary/40 bg-gradient-to-br from-white/60 to-white/30 dark:from-white/10 dark:to-white/5 backdrop-blur-2xl border border-white/40 dark:border-white/10 hover:border-white/60 dark:hover:border-white/20">
                {/* Glass Reflection Highlight */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-[1.25rem] lg:rounded-[1.75rem] overflow-hidden" />
                <div className="absolute inset-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] rounded-[1.25rem] lg:rounded-[1.75rem] pointer-events-none" />

                {/* Status Dot */}
                <div className="absolute -top-1 -right-1 z-30 shadow-sm rounded-full" title={`Status: ${service.status}`}>
                    <span className="relative flex h-3.5 w-3.5 sm:h-4 sm:w-4">
                        {!isUp && (
                            <span className={cn(
                                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                                isDown ? "bg-red-400" : "bg-yellow-400"
                            )}></span>
                        )}
                        <span className={cn(
                            "relative inline-flex rounded-full h-3.5 w-3.5 sm:h-4 sm:w-4 border-2 border-background dark:border-[#1a1a1f]",
                            isUp ? "bg-emerald-500" : isDown ? "bg-red-500" : "bg-yellow-500"
                        )}></span>
                    </span>
                </div>

                {!imgError ? (
                    <img
                        src={imgUrl}
                        alt={service.name}
                        className="w-[55%] h-[55%] object-contain drop-shadow-md transition-transform duration-500 group-hover:scale-110 relative z-10"
                        onError={handleImgError}
                    />
                ) : (
                    <div className={cn("absolute inset-0 w-full h-full flex items-center justify-center text-3xl sm:text-4xl font-semibold text-white/90 shadow-inner m-[2px]", fallbackColorClass, "rounded-[1.1rem] lg:rounded-[1.6rem]")}>
                        {service.name.charAt(0).toUpperCase()}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none rounded-[1.1rem] lg:rounded-[1.6rem]" />
                    </div>
                )}
            </div>

            {/* App Label */}
            <div className="w-full flex justify-center">
                <span className="text-sm font-bold text-foreground tracking-tight text-center px-1.5 py-0.5 rounded-md transition-colors duration-200 group-hover:text-primary max-w-full truncate drop-shadow-sm">
                    {service.name}
                </span>
            </div>
        </a>
    );
}
