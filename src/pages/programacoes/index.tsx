import { useState } from "react";
import { FileText } from "lucide-react";
import { Link } from "react-router-dom";

import { MonthNavigator } from "@/components/common/month-navigator";
import { TypePills } from "@/components/common/type-pills";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ArrangementFormDialog } from "@/features/arrangements/arrangement-form-dialog";
import { ArrangementList, NovoArranjoButton } from "@/features/arrangements/arrangement-list";
import { useContadoresDoMes, useArranjosDoMes } from "@/hooks/use-programacoes-mes";
import { useMonthParams } from "@/hooks/use-month-params";
import { formatMonthShort } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { ArranjoDetalhado } from "@/types/domain";

const ProgramacoesPage = () => {
  const { mes, mesDate, mesLabel, tipo, setTipo, shiftMes } = useMonthParams();
  const { data: arranjos, isLoading } = useArranjosDoMes(mes, tipo);
  const { data: contadores } = useContadoresDoMes(mes);

  const [dialogoAberto, setDialogoAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<ArranjoDetalhado | null>(null);

  const abrirNovo = () => {
    setEmEdicao(null);
    setDialogoAberto(true);
  };

  const abrirEdicao = (arranjo: ArranjoDetalhado) => {
    setEmEdicao(arranjo);
    setDialogoAberto(true);
  };

  /** Total exibido no card de resumo (acompanha o tipo selecionado). */
  const total = arranjos?.length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Programação mensal"
        titulo="Discursos do fim de semana"
        subtitulo="Registre os oradores que vêm à nossa congregação e os que vão para outras congregações."
      />

      <MonthNavigator label={mesLabel} onPrev={() => shiftMes(-1)} onNext={() => shiftMes(1)} />

      <TypePills
        tipo={tipo}
        onChange={setTipo}
        contadores={contadores ?? { vem: 0, vai: 0 }}
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className={cn("space-y-3 p-4", tipo === "vem" ? "bg-primary/5" : "bg-success/5")}>
          <p className="text-base text-foreground">
            <span className="font-bold">{total}</span>{" "}
            {total === 1 ? "arranjo" : "arranjos"} em{" "}
            <span className="font-bold">{formatMonthShort(mesDate)}</span>
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" asChild className="gap-2">
              <Link to={`/relatorio?mes=${mes}&tipo=${tipo}`}>
                <FileText className="h-4 w-4" />
                Relatório do mês
              </Link>
            </Button>
            <NovoArranjoButton onClick={abrirNovo} />
          </div>
        </div>

        <div className="border-t border-border p-4">
          <ArrangementList
            arranjos={arranjos ?? []}
            tipo={tipo}
            carregando={isLoading}
            onEditar={abrirEdicao}
            onAdicionarPrimeiro={abrirNovo}
          />
        </div>
      </div>

      <ArrangementFormDialog
        aberto={dialogoAberto}
        onOpenChange={setDialogoAberto}
        tipo={tipo}
        mesDate={mesDate}
        arranjo={emEdicao}
      />
    </div>
  );
};

export default ProgramacoesPage;
