// Tela de Relatório: um documento por tipo para imprimir/PDF; o texto pode ser
// copiado separadamente para cada congregação no WhatsApp.

import { useMemo, useState } from "react";
import { Info, Pencil, Printer } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { MonthNavigator } from "@/components/common/month-navigator";
import { SegmentedToggle } from "@/components/common/segmented-toggle";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useObservacoesRelatorio } from "@/hooks/use-configuracoes";
import { useCongregacaoLocal } from "@/hooks/use-congregacoes";
import { useMonthParams } from "@/hooks/use-month-params";
import { useArranjosDoMes } from "@/hooks/use-programacoes-mes";
import { formatMonthUpper } from "@/lib/date";
import { agruparPorCongregacao } from "@/lib/report";
import { linhasObservacoes } from "@/lib/rich-text";
import { buildDocumentoWhatsApp } from "@/lib/whatsapp";
import type { GrupoRelatorio } from "@/types/domain";
import { ObservacoesDialog } from "./observacoes-dialog";
import { ReportCongregationBlock } from "./report-congregation-block";
import { ReportDocument } from "./report-document";

const RelatorioPage = () => {
  const { mes, mesDate, mesLabel, tipo, setTipo, shiftMes } = useMonthParams();
  const { data: arranjos, isLoading } = useArranjosDoMes(mes, tipo);
  const { data: congregacaoLocal } = useCongregacaoLocal();
  const { data: observacoesTexto } = useObservacoesRelatorio();

  const [incluirContato, setIncluirContato] = useState(true);
  const [observacoesAberto, setObservacoesAberto] = useState(false);

  const grupos = useMemo(() => agruparPorCongregacao(arranjos ?? []), [arranjos]);
  const relatorioUnico = useMemo<GrupoRelatorio>(
    () => ({
      congregacaoId: null,
      congregacaoNome: "",
      arranjos: [...(arranjos ?? [])].sort((a, b) => a.data.localeCompare(b.data)),
    }),
    [arranjos],
  );
  const observacoes = useMemo(() => linhasObservacoes(observacoesTexto), [observacoesTexto]);
  const mesLabelUpper = formatMonthUpper(mesDate);

  const copiarParaWhatsApp = async (grupo: GrupoRelatorio) => {
    const texto = buildDocumentoWhatsApp({
      mesLabel: mesLabelUpper,
      congregacaoLocal: congregacaoLocal ?? null,
      grupo,
      observacoes,
      incluirContato,
    });

    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Texto copiado. Agora é só colar no WhatsApp.");
    } catch {
      toast.error("Não foi possível copiar o texto neste navegador.");
    }
  };

  const chaveDoGrupo = (grupo: GrupoRelatorio) => grupo.congregacaoId ?? "__sem_congregacao__";

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Relatório mensal"
          titulo="Arranjo para enviar"
          subtitulo="Um documento único por tipo de arranjo, com as datas em ordem."
        />
        <div className="h-72 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="no-print space-y-6">
        <PageHeader
          eyebrow="Relatório mensal"
          titulo="Arranjo para enviar"
          subtitulo="Um documento único por tipo de arranjo, com as datas em ordem. Imprima, salve em PDF ou copie o texto para o WhatsApp."
        />

        <MonthNavigator label={mesLabel} onPrev={() => shiftMes(-1)} onNext={() => shiftMes(1)} />

        {!congregacaoLocal ? (
          <div className="flex items-start gap-3 rounded-xl border border-brand/30 bg-brand/5 p-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
            <p className="text-sm text-foreground">
              Nenhuma congregação está marcada como local, então o cabeçalho do documento fica
              sem os seus dados.{" "}
              <Link
                to="/congregacoes"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Cadastrar a congregação local
              </Link>
              .
            </p>
          </div>
        ) : null}

        <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-card">
          <SegmentedToggle tipo={tipo} onChange={setTipo} />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-3">
              <Checkbox
                checked={incluirContato}
                onCheckedChange={(valor) => setIncluirContato(valor === true)}
              />
              <span className="text-sm font-medium">Mostrar coluna Contato</span>
            </label>

            <Button
              variant="outline"
              className="gap-2"
              onClick={() => window.print()}
              disabled={grupos.length === 0}
            >
              <Printer className="h-4 w-4" />
              Imprimir relatório
            </Button>
          </div>

          <Button
            variant="ghost"
            className="w-full justify-start gap-2"
            onClick={() => setObservacoesAberto(true)}
          >
            <Pencil className="h-4 w-4" />
            Editar observações
          </Button>
        </div>

        {grupos.length === 0 ? (
          <div className="rounded-xl border border-border bg-card px-6 py-10 text-center shadow-card">
            <p className="font-display text-xl text-foreground">
              Nenhum arranjo neste mês para enviar.
            </p>
            <Link
              to={`/?mes=${mes}&tipo=${tipo}`}
              className="mt-3 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Adicionar o primeiro
            </Link>
          </div>
        ) : null}
      </div>

      <div className="no-print space-y-10">
        {grupos.map((grupo) => {
          return (
            <ReportCongregationBlock
              key={chaveDoGrupo(grupo)}
              grupo={grupo}
              onCopiar={() => void copiarParaWhatsApp(grupo)}
            />
          );
        })}
      </div>

      {relatorioUnico.arranjos.length > 0 ? (
        <div>
          <ReportDocument
            mesLabelUpper={mesLabelUpper}
            congregacaoLocal={congregacaoLocal ?? null}
            grupo={relatorioUnico}
            observacoes={observacoes}
            incluirContato={incluirContato}
            mostrarCongregacaoDoGrupo={false}
          />
        </div>
      ) : null}

      <ObservacoesDialog
        aberto={observacoesAberto}
        onOpenChange={setObservacoesAberto}
        valorAtual={observacoesTexto ?? ""}
      />
    </div>
  );
};

export default RelatorioPage;
