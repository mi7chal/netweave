import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
    return (
        <div className="text-center py-20 bg-white/40 dark:bg-white/5 backdrop-blur-md border border-black/5 dark:border-white/10 rounded-3xl mt-6 shadow-sm">
            <Icon className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
    );
}
