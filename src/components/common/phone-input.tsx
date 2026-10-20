// Campo de telefone com a máscara (11) 90000-0000.

import { forwardRef } from "react";

import { Input } from "@/components/ui/input";
import { formatPhone } from "@/lib/phone";

type PhoneInputProps = Omit<React.ComponentProps<"input">, "onChange" | "value"> & {
  value: string;
  onChange: (value: string) => void;
};

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, ...props }, ref) => (
    <Input
      {...props}
      ref={ref}
      type="tel"
      inputMode="numeric"
      value={value}
      placeholder={props.placeholder ?? "(11) 90000-0000"}
      onChange={(evento) => onChange(formatPhone(evento.target.value))}
    />
  ),
);

PhoneInput.displayName = "PhoneInput";
