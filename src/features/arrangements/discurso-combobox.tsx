// Combobox do Tema do arranjo.
//
// A lista mostra "Nº — Tema" e, quando o discurso já foi dado alguma vez, a data
// do último uso ("último: 04/10/2026"), vinda de todo o histórico de
// `programacoes` — isso ajuda a evitar repetição recente.
//
// Discursos bloqueados vão para o FIM da lista, num grupo separado, aparecem
// desabilitados, com o motivo do bloqueio e sem poderem ser escolhidos.

import { Lock } from "lucide-react";

import { EntityCombobox, type ComboboxGroup } from "@/components/common/entity-combobox";
import { formatFullDate } from "@/lib/date";
import type { DiscursoComHistorico } from "@/types/domain";

interface DiscursoComboboxProps {
  value: string | null;
  onChange: (id: string) => void;
  discursos: DiscursoComHistorico[];
  id?: string;
}

export function DiscursoCombobox({ value, onChange, discursos, id }: DiscursoComboboxProps) {
  const disponiveis = discursos.filter((discurso) => !discurso.bloqueado);
  const bloqueados = discursos.filter((discurso) => discurso.bloqueado);

  const grupos: ComboboxGroup[] = [
    {
      options: disponiveis.map((discurso) => ({
        value: discurso.id,
        label: `${discurso.numero} — ${discurso.tema}`,
        // A busca aceita o número ou qualquer palavra do tema.
        searchText: `${discurso.numero} ${discurso.tema}`,
        trailing: discurso.ultimaData
          ? `último: ${formatFullDate(discurso.ultimaData)}`
          : undefined,
      })),
    },
    {
      heading: bloqueados.length > 0 ? "Bloqueados (não podem ser escolhidos)" : undefined,
      options: bloqueados.map((discurso) => ({
        value: discurso.id,
        label: `${discurso.numero} — ${discurso.tema}`,
        searchText: `${discurso.numero} ${discurso.tema}`,
        disabled: true,
        trailing: (
          <span className="inline-flex items-center gap-1 font-medium text-destructive">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            Bloqueado{discurso.motivo_bloqueio ? `: ${discurso.motivo_bloqueio}` : ""}
          </span>
        ),
      })),
    },
  ];

  return (
    <EntityCombobox
      id={id}
      value={value}
      onChange={onChange}
      groups={grupos}
      placeholder="Escolha o tema (n° ou palavra)"
      emptyMessage="Nenhum discurso encontrado."
    />
  );
}
