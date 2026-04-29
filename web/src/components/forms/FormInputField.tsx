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
                <FormItem className={cn("flex flex-col gap-2", className)}>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                        <div className="relative flex items-center">
                            {Icon && (
                                <Icon className="absolute left-3" />
                            )}
                            <Input
                                type={type}
                                step={step}
                                placeholder={placeholder}
                                className={cn(
                                    Icon ? "pl-9" : "",
                                    fieldState.error ? "border-input" : ""
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
                        <p>{description}</p>
                    )}
                    {fieldState.error ? <FormMessage /> : null}
                </FormItem>
            )}
        />
    );
}
