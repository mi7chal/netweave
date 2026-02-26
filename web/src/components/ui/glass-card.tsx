import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export function GlassCard({ className, children, ...props }: ComponentProps<typeof Card>) {
    return (
        <Card
            className={cn(
                "border border-white/40 dark:border-white/10",
                "bg-gradient-to-br from-white/60 to-white/30 dark:from-white/10 dark:to-white/5",
                "backdrop-blur-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]",
                "overflow-hidden relative",
                className
            )}
            {...props}
        >
            {/* Glass Reflection Highlight */}
            <div className="absolute inset-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] pointer-events-none z-20 rounded-xl" />
            <div className="relative z-10">{children}</div>
        </Card>
    );
}
