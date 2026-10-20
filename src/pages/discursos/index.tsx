import { useMemo, useState } from "react";
import { Lock, LockOpen, Plus } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDeleteDialog } from "@/components/common/confirm-delete-dialog";
import { EmptyList } from "@/components/common/empty-list";
import { RowActions } from "@/components/common/row-actions";
import { SearchInput } from "@/components/common/search-input";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDesbloquearDiscurso, useDiscursosComHistorico, useExcluirDiscurso } from "@/hooks/use-discursos";
import { formatFullDate } from "@/lib/date";
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

  const [busca, setBusca] = useState("");
  const [formAberto, setFormAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Discurso | null>(null);
  const [bloqueioAberto, setBloqueioAberto] = useState(false);
  const [paraBloquear, setParaBloquear] = useState<Discurso | null>(null);
  const [paraExcluir, setParaExcluir] = useState<Discurso | null>(null);

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
    } catch (excecao) {
      toast.error(excecao instanceof Error ? excecao.message : "Não foi possível excluir.");
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
        <Button className="gap-1" onClick={abrirNovo}>
          <Plus className="h-4 w-4" />
          Novo discurso
        </Button>
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
                onExcluir={() => setParaExcluir(discurso)}
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

      <BloqueioDialog
        aberto={bloqueioAberto}
        onOpenChange={setBloqueioAberto}
        discurso={paraBloquear}
      />

      <ConfirmDeleteDialog
        aberto={paraExcluir !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setParaExcluir(null);
        }}
        titulo="Excluir discurso"
        descricao={
          paraExcluir
            ? `${paraExcluir.numero} — ${paraExcluir.tema} será excluído do catálogo. Os arranjos já registrados com ele continuam salvos, mas ficam sem tema. Se a ideia é apenas parar de usá-lo, use "Bloquear".`
            : null
        }
        confirmando={excluir.isPending}
        onConfirmar={confirmarExclusao}
      />
    </div>
  );
};

export default DiscursosPage;
