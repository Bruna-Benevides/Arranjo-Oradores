// Pills de tipo da tela de Programações: dois cartões lado a lado, com bolinha
// colorida e contador. Azul para "Quem vem", verde para "Quem vai".
// Funciona como aba: apenas o tipo escolhido tem a lista carregada abaixo.

import { cn } from "@/lib/utils";
import { TIPO_LABELS } from "@/lib/labels";
import { TIPOS_ARRANJO, type TipoArranjo } from "@/types/domain";

interface TypePillsProps {
  tipo: TipoArranjo;
  onChange: (tipo: TipoArranjo) => void;
  contadores: Record<TipoArranjo, number>;
}

/** Cor da bolinha e do contador de cada tipo. */
const CORES: Record<TipoArranjo, { dot: string; ativo: string; badgeAtivo: string }> = {
  vem: {
    dot: "bg-primary",
    ativo: "border-primary text-primary",
    badgeAtivo: "bg-primary text-primary-foreground",
  },
  vai: {
    dot: "bg-success",
    ativo: "border-success text-success",
    badgeAtivo: "bg-success text-success-foreground",
  },
};

export function TypePills({ tipo, onChange, contadores }: TypePillsProps) {
  return (
    <div className="grid grid-cols-2 gap-3" role="tablist" aria-label="Tipo de arranjo">
      {TIPOS_ARRANJO.map((valor) => {
        const ativo = valor === tipo;
        const cores = CORES[valor];

        return (
          <button
            key={valor}
            type="button"
            role="tab"
            aria-selected={ativo}
            onClick={() => onChange(valor)}
            className={cn(
              "flex items-center justify-between gap-2 rounded-xl border-2 bg-card px-3 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              ativo ? cores.ativo : "border-border text-foreground hover:bg-accent",
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className={cn("h-3 w-3 shrink-0 rounded-full", cores.dot)} aria-hidden="true" />
              <span className="truncate font-display text-base font-semibold sm:text-lg">
                {TIPO_LABELS[valor]}
              </span>
            </span>

            <span
              className={cn(
                "min-w-7 shrink-0 rounded-md px-1.5 py-0.5 text-center text-sm font-semibold",
                ativo ? cores.badgeAtivo : "bg-muted text-muted-foreground",
              )}
            >
              {contadores[valor]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
