import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
    return (
        <Card className="mt-6">
            <CardHeader className="items-center">
                <Icon className="size-8 text-muted-foreground" />
                <CardTitle className="text-center">{title}</CardTitle>
            </CardHeader>
            <CardContent className="text-center text-sm text-muted-foreground">
                {description}
            </CardContent>
        </Card>
    );
}
