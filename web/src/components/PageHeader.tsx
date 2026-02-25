import type { ReactNode } from "react";

interface PageHeaderProps {
    title: string;
    description: string;
    children?: ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
    return (
        <div className="flex justify-between items-end mb-2 relative z-10 px-1 w-full flex-col md:flex-row gap-4">
            <div className="w-full">
                <h1 className="text-3xl font-bold tracking-tight text-foreground flex-shrink-0">
                    {title}
                </h1>
                <p className="text-muted-foreground mt-1.5 text-sm">
                    {description}
                </p>
            </div>
            {children && (
                <div className="flex gap-3 w-full md:w-auto items-center">
                    {children}
                </div>
            )}
        </div>
    );
}
