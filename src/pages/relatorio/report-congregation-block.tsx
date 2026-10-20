// Bloco de uma congregação no relatório: cabeçalho "Enviar para", os botões de
// imprimir/copiar e o documento.

import { Copy, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Congregacao, GrupoRelatorio } from "@/types/domain";
import { ReportDocument } from "./report-document";

interface ReportCongregationBlockProps {
  grupo: GrupoRelatorio;
  mesLabelUpper: string;
  congregacaoLocal: Congregacao | null;
  observacoes: string[];
  incluirContato: boolean;
  /** Durante a impressão de uma única congregação, as outras ficam ocultas. */
  ocultarNaImpressao: boolean;
  imprimindo: boolean;
  onImprimir: () => void;
  onCopiar: () => void;
}

export function ReportCongregationBlock({
  grupo,
  mesLabelUpper,
  congregacaoLocal,
  observacoes,
  incluirContato,
  ocultarNaImpressao,
  imprimindo,
  onImprimir,
  onCopiar,
}: ReportCongregationBlockProps) {
  return (
    <section className={ocultarNaImpressao ? "print:hidden" : undefined}>
      <div className="no-print space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Enviar para: <span className="font-bold text-foreground">{grupo.congregacaoNome}</span>
          </p>
          <Button variant="outline" className="gap-2" onClick={onImprimir} disabled={imprimindo}>
            <Printer className="h-4 w-4" />
            {imprimindo ? "Preparando..." : "Imprimir / PDF"}
          </Button>
        </div>

        <Button variant="outline" className="gap-2" onClick={onCopiar}>
          <Copy className="h-4 w-4" />
          Copiar para WhatsApp
        </Button>
      </div>

      <div className="mt-4">
        <ReportDocument
          mesLabelUpper={mesLabelUpper}
          congregacaoLocal={congregacaoLocal}
          grupo={grupo}
          observacoes={observacoes}
          incluirContato={incluirContato}
        />
      </div>
    </section>
  );
}
