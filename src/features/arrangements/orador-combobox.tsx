// Combobox do "Orador cadastrado": lista todos os irmãos (de qualquer
// congregação), mostrando nome, congregação e telefone. É apenas um atalho para
// preencher os campos abaixo — não impede o preenchimento manual.
// O rodapé do painel tem o atalho "+ Adicionar novo irmão".

import { Plus } from "lucide-react";

import { EntityCombobox } from "@/components/common/entity-combobox";
import { Button } from "@/components/ui/button";
import type { Congregacao, Irmao } from "@/types/domain";

interface OradorComboboxProps {
  value: string | null;
  onChange: (irmaoId: string) => void;
  irmaos: Irmao[];
  congregacoes: Congregacao[];
  onAdicionarNovo: () => void;
  id?: string;
}

export function OradorCombobox({
  value,
  onChange,
  irmaos,
  congregacoes,
  onAdicionarNovo,
  id,
}: OradorComboboxProps) {
  const nomeDaCongregacao = (congregacaoId: string | null) =>
    congregacoes.find((congregacao) => congregacao.id === congregacaoId)?.nome;

  return (
    <EntityCombobox
      id={id}
      value={value}
      onChange={onChange}
      placeholder="Selecione para preencher automaticamente"
      emptyMessage="Nenhum irmão cadastrado."
      groups={[
        {
          options: irmaos.map((irmao) => {
            const congregacao = nomeDaCongregacao(irmao.congregacao_id);
            const descricao = [congregacao, irmao.telefone]
              .filter((parte): parte is string => Boolean(parte))
              .join(" · ");

            return {
              value: irmao.id,
              label: irmao.nome,
              description: descricao || undefined,
              searchText: `${irmao.nome} ${congregacao ?? ""} ${irmao.telefone ?? ""}`,
            };
          }),
        },
      ]}
      footer={
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start gap-2"
          onClick={onAdicionarNovo}
        >
          <Plus className="h-4 w-4" />
          Adicionar novo irmão
        </Button>
      }
    />
  );
}
