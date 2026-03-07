import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchInputProps {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    className?: string;
}

export const SearchInput = ({ value, onChange, placeholder = "Search...", className = "" }: SearchInputProps) => {
    return (
        <div className={`relative group ${className}`}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors z-10 pointer-events-none" />
            <Input
                placeholder={placeholder}
                className="pl-9 bg-white/60 dark:bg-white/5 backdrop-blur-sm border-black/5 dark:border-white/10 shadow-sm focus-visible:ring-primary/40 rounded-full h-10 w-full transition-all"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );
};
