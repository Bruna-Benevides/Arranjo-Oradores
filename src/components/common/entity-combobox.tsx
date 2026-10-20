// Combobox com busca (Command + Popover do shadcn).
//
// É o mesmo componente para escolher o Tema, o Orador cadastrado e a
// Congregação: cada opção pode ter descrição (congregação/telefone), conteúdo
// extra à direita (ex.: "último: 04/10/2026"), termo de busca próprio e estado
// desabilitado (usado nos discursos bloqueados, que aparecem no fim da lista
// dentro de um grupo separado e não podem ser selecionados).

import { useState, type ReactNode } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  /** Segunda linha (ex.: congregação · telefone). */
  description?: string;
  /** Conteúdo alinhado à direita (ex.: histórico de uso do discurso). */
  trailing?: ReactNode;
  /** Termos extras considerados na busca (ex.: número do discurso). */
  searchText?: string;
  disabled?: boolean;
}

export interface ComboboxGroup {
  /** Título do grupo; grupos com título só aparecem quando o grupo é separado. */
  heading?: string;
  options: ComboboxOption[];
}

interface EntityComboboxProps {
  value: string | null;
  onChange: (value: string) => void;
  groups: ComboboxGroup[];
  placeholder: string;
  emptyMessage?: string;
  /** Ação fixa no rodapé do painel (ex.: "+ Adicionar novo irmão"). */
  footer?: ReactNode;
  disabled?: boolean;
  id?: string;
}

export function EntityCombobox({
  value,
  onChange,
  groups,
  placeholder,
  emptyMessage = "Nada encontrado.",
  footer,
  disabled,
  id,
}: EntityComboboxProps) {
  const [aberto, setAberto] = useState(false);

  const selecionada = groups
    .flatMap((grupo) => grupo.options)
    .find((opcao) => opcao.value === value);

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={aberto}
          disabled={disabled}
          className="h-11 w-full justify-between bg-field px-3 font-normal text-field-foreground"
        >
          <span className={cn("truncate", !selecionada && "text-muted-foreground")}>
            {selecionada ? selecionada.label : placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[--radix-popover-trigger-width] min-w-[17rem] p-0"
      >
        <Command>
          <CommandInput placeholder="Buscar..." />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>

            {groups.map((grupo, indice) => {
              if (grupo.options.length === 0) return null;
              return (
                <CommandGroup
                  key={grupo.heading ?? `grupo-${indice}`}
                  heading={grupo.heading}
                >
                  {grupo.options.map((opcao) => (
                    <CommandItem
                      key={opcao.value}
                      value={opcao.searchText ?? `${opcao.label} ${opcao.description ?? ""}`}
                      disabled={opcao.disabled}
                      onSelect={() => {
                        if (opcao.disabled) return;
                        onChange(opcao.value);
                        setAberto(false);
                      }}
                      className={cn(
                        "flex items-start gap-2 py-2",
                        opcao.disabled && "cursor-not-allowed opacity-60",
                      )}
                    >
                      <Check
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0",
                          opcao.value === value ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="flex-1 whitespace-normal">
                        <span className="block leading-snug">{opcao.label}</span>
                        {opcao.description ? (
                          <span className="block text-xs text-muted-foreground">
                            {opcao.description}
                          </span>
                        ) : null}
                      </span>
                      {opcao.trailing ? (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {opcao.trailing}
                        </span>
                      ) : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>

          {footer ? <div className="border-t border-border p-2">{footer}</div> : null}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
