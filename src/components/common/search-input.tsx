// Campo de busca das listas (com ícone de lupa).

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

interface SearchInputProps {
  valor: string;
  onChange: (valor: string) => void;
  placeholder: string;
  id?: string;
}

export function SearchInput({ valor, onChange, placeholder, id }: SearchInputProps) {
  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        id={id}
        value={valor}
        onChange={(evento) => onChange(evento.target.value)}
        placeholder={placeholder}
        className="pl-9"
      />
    </div>
  );
}
