import type { ReactNode } from "react";

interface PageHeaderProps {
    title: string;
    description: string;
    children?: ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
    return (
        <div className="flex w-full flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            {children && (
                <div className="flex w-full items-center gap-3 md:w-auto">
                    {children}
                </div>
            )}
        </div>
    );
}
