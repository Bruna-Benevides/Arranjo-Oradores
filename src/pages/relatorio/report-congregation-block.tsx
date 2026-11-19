// Bloco de uma congregação para copiar o respectivo texto ao WhatsApp.

import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { GrupoRelatorio } from "@/types/domain";

interface ReportCongregationBlockProps {
  grupo: GrupoRelatorio;
  onCopiar: () => void;
}

export function ReportCongregationBlock({
  grupo,
  onCopiar,
}: ReportCongregationBlockProps) {
  return (
    <section>
      <div className="no-print space-y-3">
        <p className="text-sm text-muted-foreground">
          Enviar para: <span className="font-bold text-foreground">{grupo.congregacaoNome}</span>
        </p>

        <Button variant="outline" className="gap-2" onClick={onCopiar}>
          <Copy className="h-4 w-4" />
          Copiar para WhatsApp
        </Button>
      </div>
    </section>
  );
}
