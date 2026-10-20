// Tela de Relatório: um documento por congregação do mês/tipo escolhidos,
// pronto para imprimir/PDF ou colar no WhatsApp.

import { useEffect, useMemo, useState } from "react";
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

const RelatorioPage = () => {
  const { mes, mesDate, mesLabel, tipo, setTipo, shiftMes } = useMonthParams();
  const { data: arranjos, isLoading } = useArranjosDoMes(mes, tipo);
  const { data: congregacaoLocal } = useCongregacaoLocal();
  const { data: observacoesTexto } = useObservacoesRelatorio();

  const [incluirContato, setIncluirContato] = useState(true);
  const [observacoesAberto, setObservacoesAberto] = useState(false);
  /**
   * Guarda qual congregação está sendo impressa sozinha. Enquanto tem valor, os
   * outros blocos recebem `print:hidden`, de modo que o "Imprimir / PDF" gere
   * apenas aquele documento.
   */
  const [imprimindoChave, setImprimindoChave] = useState<string | null>(null);

  const grupos = useMemo(() => agruparPorCongregacao(arranjos ?? []), [arranjos]);
  const observacoes = useMemo(() => linhasObservacoes(observacoesTexto), [observacoesTexto]);
  const mesLabelUpper = formatMonthUpper(mesDate);

  // A impressão precisa acontecer depois do React aplicar o print:hidden.
  useEffect(() => {
    if (!imprimindoChave) return;
    const timer = window.setTimeout(() => {
      window.print();
      setImprimindoChave(null);
    }, 60);
    return () => window.clearTimeout(timer);
  }, [imprimindoChave]);

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
          subtitulo="Um documento por congregação, no mesmo formato da sua tabela."
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
          subtitulo="Um documento por congregação, no mesmo formato da sua tabela. Imprima, salve em PDF ou copie o texto para o WhatsApp."
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

            <Button variant="outline" className="gap-2" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Imprimir todos
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

      <div className="space-y-10">
        {grupos.map((grupo) => {
          const chave = chaveDoGrupo(grupo);
          return (
            <ReportCongregationBlock
              key={chave}
              grupo={grupo}
              mesLabelUpper={mesLabelUpper}
              congregacaoLocal={congregacaoLocal ?? null}
              observacoes={observacoes}
              incluirContato={incluirContato}
              ocultarNaImpressao={imprimindoChave !== null && imprimindoChave !== chave}
              imprimindo={imprimindoChave === chave}
              onImprimir={() => setImprimindoChave(chave)}
              onCopiar={() => void copiarParaWhatsApp(grupo)}
            />
          );
        })}
      </div>

      <ObservacoesDialog
        aberto={observacoesAberto}
        onOpenChange={setObservacoesAberto}
        valorAtual={observacoesTexto ?? ""}
      />
    </div>
  );
};

export default RelatorioPage;
