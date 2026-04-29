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
import type { ReactNode } from "react";

export interface SelectOption {
    label: string;
    value: string;
    disabled?: boolean;
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
                <FormItem className={cn("flex flex-col gap-2", className)}>
                    <FormLabel>{label}</FormLabel>
                    <Select
                        onValueChange={field.onChange}
                        value={field.value ?? undefined}
                    >
                        <FormControl>
                            <SelectTrigger
                                className={cn(
                                    fieldState.error ? "border-input" : ""
                                )}
                            >
                                <SelectValue placeholder={placeholder} />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {options.map((option) => (
                                <SelectItem
                                    key={option.value}
                                    value={option.value}
                                    disabled={option.disabled}
                                >
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {description && !fieldState.error && (
                        <p>{description}</p>
                    )}
                    {fieldState.error ? <FormMessage /> : null}
                </FormItem>
            )}
        />
    );
}
