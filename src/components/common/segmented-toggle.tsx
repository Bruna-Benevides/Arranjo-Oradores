// Alternador "Quem vem / Quem vai" da tela de Relatório: um controle segmentado
// (container cinza com o segmento ativo preenchido em azul).

import { TIPO_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { TIPOS_ARRANJO, type TipoArranjo } from "@/types/domain";

interface SegmentedToggleProps {
  tipo: TipoArranjo;
  onChange: (tipo: TipoArranjo) => void;
}

export function SegmentedToggle({ tipo, onChange }: SegmentedToggleProps) {
  return (
    <div className="flex rounded-lg bg-muted p-1" role="tablist" aria-label="Tipo de arranjo">
      {TIPOS_ARRANJO.map((valor) => {
        const ativo = valor === tipo;
        return (
          <button
            key={valor}
            type="button"
            role="tab"
            aria-selected={ativo}
            onClick={() => onChange(valor)}
            className={cn(
              "flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              ativo
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {TIPO_LABELS[valor]}
          </button>
        );
      })}
    </div>
  );
}
