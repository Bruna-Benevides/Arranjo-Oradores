// Montagem do relatório: agrupa os arranjos do mês por congregação, que é o
// eixo do documento ("um documento por congregação").
//
// A congregação do grupo é sempre `programacoes.congregacao_id` — que, conforme
// o tipo, é a congregação de ORIGEM (quem vem) ou de DESTINO (quem vai). Assim
// o documento mostra, para a congregação que o recebe, apenas os arranjos que
// dizem respeito a ela.
//
// Eventos especiais (visita do superintendente, assembleia) podem não ter
// congregação; eles ficam num grupo final em vez de desaparecerem do relatório.
// Se o evento for informado com uma congregação, ele aparece no documento dela.

import type { ArranjoDetalhado, GrupoRelatorio } from "@/types/domain";

export const SEM_CONGREGACAO = "Eventos especiais (sem congregação)";

export function agruparPorCongregacao(
  arranjos: ArranjoDetalhado[],
): GrupoRelatorio[] {
  const grupos = new Map<string, GrupoRelatorio>();

  arranjos.forEach((arranjo) => {
    const chave = arranjo.congregacao_id ?? "__sem_congregacao__";
    const existente = grupos.get(chave);

    if (existente) {
      existente.arranjos.push(arranjo);
      return;
    }

    grupos.set(chave, {
      congregacaoId: arranjo.congregacao_id,
      congregacaoNome: arranjo.congregacao?.nome ?? SEM_CONGREGACAO,
      arranjos: [arranjo],
    });
  });

  // Grupos em ordem alfabética; o grupo sem congregação vai para o fim.
  return Array.from(grupos.values()).sort((a, b) => {
    if (a.congregacaoId === null) return 1;
    if (b.congregacaoId === null) return -1;
    return a.congregacaoNome.localeCompare(b.congregacaoNome, "pt-BR");
  });
}

/** Texto do mês usado no título do documento: "OUTUBRO 2026". */
export function tituloDoDocumento(mesLabel: string): string {
  return mesLabel.toUpperCase();
}
