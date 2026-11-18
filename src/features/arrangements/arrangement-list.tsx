// Lista dos arranjos do mês/tipo, com editar e excluir (com confirmação).

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDeleteDialog } from "@/components/common/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useExcluirArranjo } from "@/hooks/use-programacoes-mes";
import { formatFullDate } from "@/lib/date";
import { TIPO_CONGREGACAO_LABEL } from "@/lib/labels";
import {
  getCongregacaoArranjo,
  getNumeroArranjo,
  getTemaArranjo,
  type ArranjoDetalhado,
  type TipoArranjo,
} from "@/types/domain";

interface ArrangementListProps {
  arranjos: ArranjoDetalhado[];
  tipo: TipoArranjo;
  carregando: boolean;
  onEditar: (arranjo: ArranjoDetalhado) => void;
  onAdicionarPrimeiro: () => void;
}

function tituloDoArranjo(arranjo: ArranjoDetalhado): string {
  if (arranjo.evento_especial) {
    return arranjo.descricao_evento ?? "Evento especial";
  }
  const numero = getNumeroArranjo(arranjo);
  const tema = getTemaArranjo(arranjo);
  return numero !== null && tema
    ? `${numero} — ${tema}`
    : "Tema não informado";
}

export function ArrangementList({
  arranjos,
  tipo,
  carregando,
  onEditar,
  onAdicionarPrimeiro,
}: ArrangementListProps) {
  const [paraExcluir, setParaExcluir] = useState<ArranjoDetalhado | null>(null);
  const excluir = useExcluirArranjo();

  const confirmarExclusao = async () => {
    if (!paraExcluir) return;
    try {
      await excluir.mutateAsync(paraExcluir.id);
      toast.success("Arranjo excluído.");
      setParaExcluir(null);
    } catch (excecao) {
      toast.error(excecao instanceof Error ? excecao.message : "Não foi possível excluir.");
    }
  };

  if (carregando) {
    return (
      <div className="space-y-3">
        {[0, 1].map((indice) => (
          <div key={indice} className="h-20 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  if (arranjos.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card px-6 py-10 text-center shadow-card">
        <p className="font-display text-xl text-foreground">Nenhum arranjo neste mês.</p>
        <button
          type="button"
          onClick={onAdicionarPrimeiro}
          className="mt-3 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          Adicionar o primeiro
        </button>
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-3">
        {arranjos.map((arranjo) => (
          <li
            key={arranjo.id}
            className="rounded-xl border border-border bg-card p-4 shadow-card"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-muted-foreground">
                {formatFullDate(arranjo.data)}
              </span>

              <div className="flex shrink-0 items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Editar arranjo"
                      onClick={() => onEditar(arranjo)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Editar</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Excluir arranjo"
                      onClick={() => setParaExcluir(arranjo)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Excluir</TooltipContent>
                </Tooltip>
              </div>
            </div>

            <div className="mt-1 space-y-1">
              <p className="font-medium text-foreground">{tituloDoArranjo(arranjo)}</p>

              {arranjo.evento_especial ? (
                <p className="text-sm text-muted-foreground">Evento especial (sem orador)</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {arranjo.orador_nome ?? "Orador não informado"}
                  {arranjo.orador_telefone ? ` · ${arranjo.orador_telefone}` : ""}
                </p>
              )}

              {getCongregacaoArranjo(arranjo) ? (
                <p className="text-xs text-muted-foreground">
                  {TIPO_CONGREGACAO_LABEL[tipo]}: {getCongregacaoArranjo(arranjo)}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDeleteDialog
        aberto={paraExcluir !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setParaExcluir(null);
        }}
        titulo="Excluir arranjo"
        descricao={
          paraExcluir
            ? `O arranjo de ${formatFullDate(paraExcluir.data)} (${tituloDoArranjo(paraExcluir)}) será removido da programação.`
            : null
        }
        confirmando={excluir.isPending}
        onConfirmar={confirmarExclusao}
      />
    </>
  );
}

/** Botão "+ Novo arranjo" usado no card de resumo. */
export function NovoArranjoButton({ onClick }: { onClick: () => void }) {
  return (
    <Button onClick={onClick} className="gap-1">
      <Plus className="h-4 w-4" />
      Novo arranjo
    </Button>
  );
}
