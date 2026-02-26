import type { Control, FieldValues, Path } from "react-hook-form";
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

export interface SelectOption {
    label: string;
    value: string;
}

interface FormSelectFieldProps<TFieldValues extends FieldValues> {
    control: Control<TFieldValues>;
    name: Path<TFieldValues>;
    label: string;
    options: SelectOption[];
    placeholder?: string;
    description?: ReactNode;
    className?: string;
}

export function FormSelectField<TFieldValues extends FieldValues>({
    control,
    name,
    label,
    options,
    placeholder,
    description,
    className,
}: FormSelectFieldProps<TFieldValues>) {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field, fieldState }) => (
                <FormItem className={cn("space-y-2", className)}>
                    <FormLabel>{label}</FormLabel>
                    <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                    >
                        <FormControl>
                            <SelectTrigger
                                className={cn(
                                    "bg-secondary/40 border-primary/20 focus:ring-1 focus:ring-primary/50 transition-all",
                                    fieldState.error ? "border-destructive focus:ring-destructive" : ""
                                )}
                            >
                                <SelectValue placeholder={placeholder} />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background/95 backdrop-blur-md border border-primary/20 shadow-xl">
                            {options.map((option) => (
                                <SelectItem key={option.value} value={option.value} className="focus:bg-primary/20 cursor-pointer">
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {description && !fieldState.error && (
                        <p className="text-[0.8rem] text-muted-foreground">{description}</p>
                    )}
                    <AnimatePresence mode="wait">
                        {fieldState.error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0, y: -10 }}
                                animate={{ opacity: 1, height: "auto", y: 0 }}
                                exit={{ opacity: 0, height: 0, y: -10 }}
                                transition={{ duration: 0.2, ease: "easeInOut" }}
                            >
                                <FormMessage />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </FormItem>
            )}
        />
    );
}
