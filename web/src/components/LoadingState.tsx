interface LoadingStateProps {
    message?: string;
}

export function LoadingState({ message = "Loading..." }: LoadingStateProps) {
    return (
        <div className="text-center py-10 text-muted-foreground animate-pulse font-medium">
            {message}
        </div>
    );
}
