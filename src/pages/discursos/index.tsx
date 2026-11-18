import { useMemo, useState } from "react";
import { FileUp, Lock, LockOpen, Plus } from "lucide-react";
import { toast } from "sonner";

import { CatalogImportDialog } from "@/components/common/catalog-import-dialog";
import { ConfirmDeleteDialog } from "@/components/common/confirm-delete-dialog";
import { EmptyList } from "@/components/common/empty-list";
import { RowActions } from "@/components/common/row-actions";
import { SearchInput } from "@/components/common/search-input";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  useDesbloquearDiscurso,
  useDiscursosComHistorico,
  useExcluirDiscurso,
  useImportarDiscursos,
} from "@/hooks/use-discursos";
import { formatFullDate } from "@/lib/date";
import { hasSessionFormDraft } from "@/lib/session-form-draft";
import { getImpactoExclusaoDiscurso } from "@/services/discursos";
import type { Discurso, DiscursoComHistorico } from "@/types/domain";
import { BloqueioDialog } from "./bloqueio-dialog";
import { DiscursoFormDialog } from "./discurso-form-dialog";

/** "último: 04/10/2026 · 3 usos" ou "Nunca utilizado". */
function historicoDoDiscurso(discurso: DiscursoComHistorico): string {
  if (!discurso.ultimaData) return "Nunca utilizado";
  const usos = discurso.totalUsos === 1 ? "1 uso" : `${discurso.totalUsos} usos`;
  return `último: ${formatFullDate(discurso.ultimaData)} · ${usos}`;
}

const DiscursosPage = () => {
  const { data: discursos, isLoading } = useDiscursosComHistorico();
  const excluir = useExcluirDiscurso();
  const desbloquear = useDesbloquearDiscurso();
  const importar = useImportarDiscursos();

  const [busca, setBusca] = useState("");
  const [formAberto, setFormAberto] = useState(() => hasSessionFormDraft("novo-discurso"));
  const [importacaoAberta, setImportacaoAberta] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Discurso | null>(null);
  const [bloqueioAberto, setBloqueioAberto] = useState(false);
  const [paraBloquear, setParaBloquear] = useState<Discurso | null>(null);
  const [paraExcluir, setParaExcluir] = useState<Discurso | null>(null);
  const [impactoExclusao, setImpactoExclusao] = useState<
    Awaited<ReturnType<typeof getImpactoExclusaoDiscurso>> | null
  >(null);
  const [verificandoExclusao, setVerificandoExclusao] = useState(false);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const lista = discursos ?? [];
    if (!termo) return lista;
    return lista.filter((discurso) =>
      `${discurso.numero} ${discurso.tema}`.toLowerCase().includes(termo),
    );
  }, [discursos, busca]);

  const abrirNovo = () => {
    setEmEdicao(null);
    setFormAberto(true);
  };

  const abrirEdicao = (discurso: Discurso) => {
    setEmEdicao(discurso);
    setFormAberto(true);
  };

  const abrirBloqueio = (discurso: Discurso) => {
    setParaBloquear(discurso);
    setBloqueioAberto(true);
  };

  const liberarDiscurso = async (discurso: Discurso) => {
    try {
      await desbloquear.mutateAsync(discurso.id);
      toast.success("Discurso desbloqueado.");
    } catch (excecao) {
      toast.error(excecao instanceof Error ? excecao.message : "Não foi possível desbloquear.");
    }
  };

  const confirmarExclusao = async () => {
    if (!paraExcluir) return;
    try {
      await excluir.mutateAsync(paraExcluir.id);
      toast.success("Discurso excluído.");
      setParaExcluir(null);
      setImpactoExclusao(null);
    } catch (excecao) {
      toast.error(excecao instanceof Error ? excecao.message : "Não foi possível excluir.");
    }
  };

  const prepararExclusao = async (discurso: Discurso) => {
    setVerificandoExclusao(true);
    try {
      const impacto = await getImpactoExclusaoDiscurso(discurso.id);
      if (impacto.datasHojeOuFuturas.length > 0) {
        const datas = impacto.datasHojeOuFuturas.map(formatFullDate).join(", ");
        toast.error(`Não é possível excluir: há arranjo(s) de hoje ou futuros em ${datas}.`);
        return;
      }
      setImpactoExclusao(impacto);
      setParaExcluir(discurso);
    } catch (excecao) {
      toast.error(
        excecao instanceof Error
          ? excecao.message
          : "Não foi possível verificar os arranjos do discurso.",
      );
    } finally {
      setVerificandoExclusao(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catálogo"
        titulo="Discursos"
        subtitulo="Veja o histórico completo de uso de cada discurso. Discursos bloqueados continuam no histórico, mas não podem ser escolhidos em novos arranjos."
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <SearchInput
            valor={busca}
            onChange={setBusca}
            placeholder="Buscar por número ou palavra do tema"
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            className="gap-1"
            onClick={() => setImportacaoAberta(true)}
          >
            <FileUp className="h-4 w-4" />
            Importar CSV
          </Button>
          <Button className="gap-1" onClick={abrirNovo}>
            <Plus className="h-4 w-4" />
            Novo discurso
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((indice) => (
            <div key={indice} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        <EmptyList
          mensagem={busca ? "Nenhum discurso encontrado." : "Nenhum discurso cadastrado."}
          acao={
            <Button className="gap-1" onClick={abrirNovo}>
              <Plus className="h-4 w-4" />
              Adicionar o primeiro
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {filtrados.map((discurso) => (
            <li
              key={discurso.id}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-card"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">
                  {discurso.numero} — {discurso.tema}
                </p>

                <p className="text-xs text-muted-foreground">{historicoDoDiscurso(discurso)}</p>
                {discurso.historico.length > 0 ? (
                  <ul className="mt-2 space-y-1 border-l-2 border-border pl-3 text-xs text-muted-foreground">
                    {discurso.historico.map((uso, indice) => (
                      <li key={`${uso.data}-${indice}`}>
                        {formatFullDate(uso.data)} · {uso.congregacaoNome ?? "Congregação não informada"} ·{" "}
                        {uso.oradorNome ?? "Orador não informado"}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {discurso.bloqueado ? (
                  <div className="mt-2 space-y-1">
                    <Badge variant="destructive" className="gap-1">
                      <Lock className="h-3 w-3" aria-hidden="true" />
                      Bloqueado
                    </Badge>
                    {discurso.motivo_bloqueio ? (
                      <p className="text-xs text-destructive">{discurso.motivo_bloqueio}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <RowActions
                onEditar={() => abrirEdicao(discurso)}
                onExcluir={() => void prepararExclusao(discurso)}
                extra={
                  discurso.bloqueado ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Desbloquear discurso"
                          onClick={() => void liberarDiscurso(discurso)}
                        >
                          <LockOpen className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Desbloquear</TooltipContent>
                    </Tooltip>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Bloquear discurso"
                          onClick={() => abrirBloqueio(discurso)}
                        >
                          <Lock className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Bloquear</TooltipContent>
                    </Tooltip>
                  )
                }
              />
            </li>
          ))}
        </ul>
      )}

      <DiscursoFormDialog aberto={formAberto} onOpenChange={setFormAberto} discurso={emEdicao} />

      <CatalogImportDialog
        aberto={importacaoAberta}
        onOpenChange={setImportacaoAberta}
        nomeCatalogo="discursos"
        itensExistentes={(discursos ?? []).map(({ numero, tema }) => ({ numero, tema }))}
        salvando={importar.isPending}
        onImportar={async (linhas, estatisticas) => {
          try {
            await importar.mutateAsync(linhas);
            toast.success(
              `Importação concluída: ${estatisticas.novos} adicionados, ${estatisticas.atualizados} temas atualizados e ${estatisticas.iguais} sem alteração.`,
            );
          } catch (excecao) {
            toast.error(
              excecao instanceof Error ? excecao.message : "Não foi possível importar os discursos.",
            );
            throw excecao;
          }
        }}
      />

      <BloqueioDialog
        aberto={bloqueioAberto}
        onOpenChange={setBloqueioAberto}
        discurso={paraBloquear}
      />

      <ConfirmDeleteDialog
        aberto={paraExcluir !== null}
        onOpenChange={(aberto) => {
          if (!aberto) {
            setParaExcluir(null);
            setImpactoExclusao(null);
          }
        }}
        titulo="Excluir discurso"
        descricao={
          paraExcluir && impactoExclusao ? (
            <div className="space-y-3">
              <p>
                O discurso {paraExcluir.numero} — “{paraExcluir.tema}” será excluído do catálogo.
              </p>
              {impactoExclusao.datasPassadas.length > 0 ? (
                <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive/5 p-3">
                  <p>
                    Ele aparece em {impactoExclusao.datasPassadas.length} arranjo(s) passado(s).
                    Esses arranjos serão mantidos com o número e o tema guardados no histórico:
                  </p>
                  <ul className="max-h-32 list-disc space-y-1 overflow-y-auto pl-5">
                    {impactoExclusao.datasPassadas.map((data, indice) => (
                      <li key={`${data}-${indice}`}>{formatFullDate(data)}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p>Não há arranjos passados vinculados a este discurso.</p>
              )}
              <p>Deseja excluir mesmo assim? Para apenas impedir novos usos, escolha “Bloquear”.</p>
            </div>
          ) : verificandoExclusao ? "Verificando arranjos vinculados..." : null
        }
        confirmando={excluir.isPending}
        onConfirmar={confirmarExclusao}
      />
    </div>
  );
};

export default DiscursosPage;
