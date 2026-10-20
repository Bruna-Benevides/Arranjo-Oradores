import { useMemo, useState } from "react";
import { Home, Plus } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDeleteDialog } from "@/components/common/confirm-delete-dialog";
import { EmptyList } from "@/components/common/empty-list";
import { RowActions } from "@/components/common/row-actions";
import { SearchInput } from "@/components/common/search-input";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CongregacaoFormDialog } from "@/features/congregacoes/congregacao-form-dialog";
import { useCongregacoes, useDefinirCongregacaoLocal, useExcluirCongregacao } from "@/hooks/use-congregacoes";
import type { Congregacao } from "@/types/domain";

const CongregacoesPage = () => {
  const { data: congregacoes, isLoading } = useCongregacoes();
  const excluir = useExcluirCongregacao();
  const definirLocal = useDefinirCongregacaoLocal();

  const [busca, setBusca] = useState("");
  const [formAberto, setFormAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Congregacao | null>(null);
  const [paraExcluir, setParaExcluir] = useState<Congregacao | null>(null);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const lista = congregacoes ?? [];
    if (!termo) return lista;
    return lista.filter((congregacao) =>
      `${congregacao.nome} ${congregacao.endereco ?? ""}`.toLowerCase().includes(termo),
    );
  }, [congregacoes, busca]);

  const marcarComoLocal = async (congregacao: Congregacao) => {
    try {
      await definirLocal.mutateAsync({ id: congregacao.id, isLocal: true });
      toast.success(`${congregacao.nome} agora é a congregação local.`);
    } catch (excecao) {
      toast.error(excecao instanceof Error ? excecao.message : "Não foi possível alterar.");
    }
  };

  const confirmarExclusao = async () => {
    if (!paraExcluir) return;
    try {
      await excluir.mutateAsync(paraExcluir.id);
      toast.success("Congregação excluída.");
      setParaExcluir(null);
    } catch (excecao) {
      toast.error(excecao instanceof Error ? excecao.message : "Não foi possível excluir.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cadastro"
        titulo="Congregações"
        subtitulo="As congregações que participam do arranjo. A marcada como local é a sua: os dados dela aparecem no cabeçalho do relatório."
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <SearchInput valor={busca} onChange={setBusca} placeholder="Buscar por nome ou endereço" />
        </div>
        <Button
          className="gap-1"
          onClick={() => {
            setEmEdicao(null);
            setFormAberto(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Nova congregação
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1].map((indice) => (
            <div key={indice} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : filtradas.length === 0 ? (
        <EmptyList
          mensagem={busca ? "Nenhuma congregação encontrada." : "Nenhuma congregação cadastrada."}
          acao={
            <Button
              className="gap-1"
              onClick={() => {
                setEmEdicao(null);
                setFormAberto(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Adicionar a primeira
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {filtradas.map((congregacao) => (
            <li
              key={congregacao.id}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-card"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-medium text-foreground">{congregacao.nome}</p>

                {congregacao.is_local ? (
                  <Badge className="gap-1 bg-brand text-brand-foreground">
                    <Home className="h-3 w-3" aria-hidden="true" />
                    Congregação local
                  </Badge>
                ) : (
                  <button
                    type="button"
                    onClick={() => void marcarComoLocal(congregacao)}
                    className="text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    Definir como congregação local
                  </button>
                )}

                {congregacao.horario ? (
                  <p className="text-sm text-muted-foreground">
                    Horário da Reunião: {congregacao.horario}
                  </p>
                ) : null}
                {congregacao.endereco ? (
                  <p className="text-xs text-muted-foreground">{congregacao.endereco}</p>
                ) : null}
                {congregacao.google_maps_url ? (
                  <a
                    href={congregacao.google_maps_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-xs text-primary underline underline-offset-2"
                  >
                    {congregacao.google_maps_url}
                  </a>
                ) : null}
              </div>

              <RowActions
                onEditar={() => {
                  setEmEdicao(congregacao);
                  setFormAberto(true);
                }}
                onExcluir={() => setParaExcluir(congregacao)}
              />
            </li>
          ))}
        </ul>
      )}

      <CongregacaoFormDialog
        aberto={formAberto}
        onOpenChange={setFormAberto}
        congregacao={emEdicao}
      />

      <ConfirmDeleteDialog
        aberto={paraExcluir !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setParaExcluir(null);
        }}
        titulo="Excluir congregação"
        descricao={
          paraExcluir
            ? `${paraExcluir.nome} será excluída. Os arranjos já registrados continuam salvos, mas ficam sem congregação.`
            : null
        }
        confirmando={excluir.isPending}
        onConfirmar={confirmarExclusao}
      />
    </div>
  );
};

export default CongregacoesPage;
