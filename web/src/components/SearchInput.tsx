import { cn } from "@/lib/utils";
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
        <div className={cn("relative", className)}>
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
                placeholder={placeholder}
                className="pl-9"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );
};
