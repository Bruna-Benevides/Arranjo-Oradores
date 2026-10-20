import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDeleteDialog } from "@/components/common/confirm-delete-dialog";
import { EmptyList } from "@/components/common/empty-list";
import { RowActions } from "@/components/common/row-actions";
import { SearchInput } from "@/components/common/search-input";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { useCanticos, useExcluirCantico } from "@/hooks/use-canticos";
import type { Cantico } from "@/types/domain";
import { CanticoFormDialog } from "./cantico-form-dialog";

const CanticosPage = () => {
  const { data: canticos, isLoading } = useCanticos();
  const excluir = useExcluirCantico();

  const [busca, setBusca] = useState("");
  const [formAberto, setFormAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Cantico | null>(null);
  const [paraExcluir, setParaExcluir] = useState<Cantico | null>(null);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const lista = canticos ?? [];
    if (!termo) return lista;
    return lista.filter((cantico) =>
      `${cantico.numero} ${cantico.tema}`.toLowerCase().includes(termo),
    );
  }, [canticos, busca]);

  const confirmarExclusao = async () => {
    if (!paraExcluir) return;
    try {
      await excluir.mutateAsync(paraExcluir.id);
      toast.success("Cântico excluído.");
      setParaExcluir(null);
    } catch (excecao) {
      toast.error(excecao instanceof Error ? excecao.message : "Não foi possível excluir.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catálogo"
        titulo="Cânticos"
        subtitulo="Número e tema dos cânticos usados nos arranjos."
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <SearchInput
            valor={busca}
            onChange={setBusca}
            placeholder="Buscar por número ou palavra do tema"
          />
        </div>
        <Button
          className="gap-1"
          onClick={() => {
            setEmEdicao(null);
            setFormAberto(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Novo cântico
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((indice) => (
            <div key={indice} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        <EmptyList mensagem={busca ? "Nenhum cântico encontrado." : "Nenhum cântico cadastrado."} />
      ) : (
        <ul className="space-y-3">
          {filtrados.map((cantico) => (
            <li
              key={cantico.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-card"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">
                  {cantico.numero} — {cantico.tema}
                </p>
              </div>

              <RowActions
                onEditar={() => {
                  setEmEdicao(cantico);
                  setFormAberto(true);
                }}
                onExcluir={() => setParaExcluir(cantico)}
              />
            </li>
          ))}
        </ul>
      )}

      <CanticoFormDialog aberto={formAberto} onOpenChange={setFormAberto} cantico={emEdicao} />

      <ConfirmDeleteDialog
        aberto={paraExcluir !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setParaExcluir(null);
        }}
        titulo="Excluir cântico"
        descricao={
          paraExcluir ? `${paraExcluir.numero} — ${paraExcluir.tema} será excluído.` : null
        }
        confirmando={excluir.isPending}
        onConfirmar={confirmarExclusao}
      />
    </div>
  );
};

export default CanticosPage;
