import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDeleteDialog } from "@/components/common/confirm-delete-dialog";
import { EmptyList } from "@/components/common/empty-list";
import { RowActions } from "@/components/common/row-actions";
import { SearchInput } from "@/components/common/search-input";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { IrmaoFormDialog } from "@/features/irmaos/irmao-form-dialog";
import { useCongregacoes } from "@/hooks/use-congregacoes";
import { useExcluirIrmao, useIrmaos } from "@/hooks/use-irmaos";
import { PRIVILEGIO_LABELS } from "@/lib/labels";
import { toPrivilegio, type Irmao } from "@/types/domain";

const IrmaosPage = () => {
  const { data: irmaos, isLoading } = useIrmaos();
  const { data: congregacoes = [] } = useCongregacoes();
  const excluir = useExcluirIrmao();

  const [busca, setBusca] = useState("");
  const [formAberto, setFormAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Irmao | null>(null);
  const [paraExcluir, setParaExcluir] = useState<Irmao | null>(null);

  const nomeDaCongregacao = (congregacaoId: string | null) =>
    congregacoes.find((congregacao) => congregacao.id === congregacaoId)?.nome;

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const lista = irmaos ?? [];
    if (!termo) return lista;
    return lista.filter((irmao) =>
      [irmao.nome, nomeDaCongregacao(irmao.congregacao_id) ?? "", irmao.telefone ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(termo),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [irmaos, busca, congregacoes]);

  const confirmarExclusao = async () => {
    if (!paraExcluir) return;
    try {
      await excluir.mutateAsync(paraExcluir.id);
      toast.success("Irmão excluído.");
      setParaExcluir(null);
    } catch (excecao) {
      toast.error(excecao instanceof Error ? excecao.message : "Não foi possível excluir.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cadastro"
        titulo="Irmãos"
        subtitulo="Irmãos que podem ser selecionados ao montar um arranjo. Cadastre oradores de qualquer congregação."
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <SearchInput valor={busca} onChange={setBusca} placeholder="Buscar por nome, congregação ou telefone" />
        </div>
        <Button
          className="gap-1"
          onClick={() => {
            setEmEdicao(null);
            setFormAberto(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Novo irmão
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
          mensagem={busca ? "Nenhum irmão encontrado." : "Nenhum irmão cadastrado."}
          acao={
            <Button
              className="gap-1"
              onClick={() => {
                setEmEdicao(null);
                setFormAberto(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Adicionar o primeiro
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {filtrados.map((irmao) => {
            const privilegio = toPrivilegio(irmao.privilegio);
            const congregacao = nomeDaCongregacao(irmao.congregacao_id);

            return (
              <li
                key={irmao.id}
                className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-card"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{irmao.nome}</p>
                  <p className="text-sm text-muted-foreground">
                    {[congregacao, irmao.telefone].filter(Boolean).join(" · ") ||
                      "Sem congregação e telefone"}
                  </p>
                  {privilegio ? (
                    <p className="text-xs text-muted-foreground">
                      {PRIVILEGIO_LABELS[privilegio]}
                    </p>
                  ) : null}
                  {irmao.observacoes ? (
                    <p className="mt-1 text-xs text-muted-foreground">{irmao.observacoes}</p>
                  ) : null}
                </div>

                <RowActions
                  onEditar={() => {
                    setEmEdicao(irmao);
                    setFormAberto(true);
                  }}
                  onExcluir={() => setParaExcluir(irmao)}
                />
              </li>
            );
          })}
        </ul>
      )}

      <IrmaoFormDialog aberto={formAberto} onOpenChange={setFormAberto} irmao={emEdicao} />

      <ConfirmDeleteDialog
        aberto={paraExcluir !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setParaExcluir(null);
        }}
        titulo="Excluir irmão"
        descricao={
          paraExcluir
            ? `${paraExcluir.nome} será excluído. Os arranjos já registrados continuam salvos com o nome que ficou gravado neles.`
            : null
        }
        confirmando={excluir.isPending}
        onConfirmar={confirmarExclusao}
      />
    </div>
  );
};

export default IrmaosPage;
