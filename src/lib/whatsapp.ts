// Monta a versão em texto puro do documento do relatório, para colar no
// WhatsApp. O WhatsApp usa *asteriscos* como negrito, então a marcação
// `**texto**` das observações é convertida por `paraWhatsApp`.

import { formatDayMonth } from "@/lib/date";
import { paraWhatsApp } from "@/lib/rich-text";
import {
  getNumeroArranjo,
  getTemaArranjo,
  type ArranjoDetalhado,
  type Congregacao,
  type GrupoRelatorio,
} from "@/types/domain";

export interface DocumentoWhatsAppParams {
  /** "OUTUBRO 2026" */
  mesLabel: string;
  congregacaoLocal: Congregacao | null;
  grupo: GrupoRelatorio;
  observacoes: string[];
  incluirContato: boolean;
}

function linhaDoArranjo(
  arranjo: ArranjoDetalhado,
  incluirContato: boolean,
): string {
  const data = formatDayMonth(arranjo.data);

  // Evento especial não tem orador/discurso: a linha traz só a descrição.
  if (arranjo.evento_especial) {
    return `${data} - ${arranjo.descricao_evento ?? "Evento especial"}`;
  }

  const numeroDiscurso = getNumeroArranjo(arranjo);
  const temaDiscurso = getTemaArranjo(arranjo);
  const partes = [
    data,
    arranjo.orador_nome ?? "Orador não informado",
    numeroDiscurso !== null ? `Nº ${numeroDiscurso}` : null,
    temaDiscurso,
  ].filter((parte): parte is string => Boolean(parte));

  if (incluirContato && arranjo.orador_telefone) {
    partes.push(`Contato: ${arranjo.orador_telefone}`);
  }

  return partes.join(" - ");
}

/** Texto completo de um documento (uma congregação), pronto para o WhatsApp. */
export function buildDocumentoWhatsApp({
  mesLabel,
  congregacaoLocal,
  grupo,
  observacoes,
  incluirContato,
}: DocumentoWhatsAppParams): string {
  const linhas: string[] = [];

  linhas.push(`*ARRANJO DE DISCURSO PARA O MÊS DE ${mesLabel}*`);
  linhas.push("");

  if (congregacaoLocal) {
    linhas.push(`*${congregacaoLocal.nome}*`);
    if (congregacaoLocal.horario) {
      linhas.push(`*Horário da Reunião:* ${congregacaoLocal.horario}`);
    }
    if (congregacaoLocal.endereco) {
      linhas.push(`*Endereço:* ${congregacaoLocal.endereco}`);
    }
    if (congregacaoLocal.google_maps_url) {
      linhas.push(`*Link do endereço do Salão do Reino:* ${congregacaoLocal.google_maps_url}`);
    }
    linhas.push("");
  }

  linhas.push(`*CONGREGAÇÃO : ${grupo.congregacaoNome}*`);
  linhas.push("");

  grupo.arranjos.forEach((arranjo) => {
    linhas.push(linhaDoArranjo(arranjo, incluirContato));
  });

  if (observacoes.length > 0) {
    linhas.push("");
    linhas.push("*Observações:*");
    observacoes.forEach((observacao) => {
      linhas.push(`- ${paraWhatsApp(observacao)}`);
    });
  }

  return linhas.join("\n").trim();
}
