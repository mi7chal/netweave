import type { Control, FieldValues, Path } from "react-hook-form";
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

interface FormInputFieldProps<TFieldValues extends FieldValues> {
    control: Control<TFieldValues>;
    name: Path<TFieldValues>;
    label: string;
    placeholder?: string;
    type?: string;
    step?: string | number;
    icon?: LucideIcon;
    description?: ReactNode;
    className?: string;
}

export function FormInputField<TFieldValues extends FieldValues>({
    control,
    name,
    label,
    placeholder,
    type = "text",
    step,
    icon: Icon,
    description,
    className,
}: FormInputFieldProps<TFieldValues>) {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field, fieldState }) => (
                <FormItem className={cn("space-y-2", className)}>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                        <div className="relative flex items-center">
                            {Icon && (
                                <Icon className="absolute left-3 h-4 w-4 text-muted-foreground" />
                            )}
                            <Input
                                type={type}
                                step={step}
                                placeholder={placeholder}
                                className={cn(
                                    "bg-secondary/40 border-primary/20 focus-visible:ring-1 focus-visible:ring-primary/50 transition-all",
                                    Icon ? "pl-9" : "",
                                    fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""
                                )}
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => {
                                    if (type === "number") {
                                        const val = e.target.value;
                                        field.onChange(val === "" ? undefined : Number(val));
                                    } else {
                                        field.onChange(e);
                                    }
                                }}
                            />
                        </div>
                    </FormControl>
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
