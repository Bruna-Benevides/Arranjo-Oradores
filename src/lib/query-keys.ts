// Chaves de cache do react-query, num só lugar, para que uma gravação em
// qualquer tela invalide exatamente as consultas afetadas.

import { CHAVE_OBSERVACOES_RELATORIO } from "@/services/configuracoes";
import type { TipoArranjo } from "@/types/domain";

export const queryKeys = {
  congregacoes: ["congregacoes"] as const,
  congregacaoLocal: ["congregacoes", "local"] as const,
  irmaos: ["irmaos"] as const,
  /** Invalida tanto a lista simples quanto a lista com histórico. */
  discursos: ["discursos"] as const,
  discursosComHistorico: ["discursos", "historico"] as const,
  canticos: ["canticos"] as const,
  arranjos: (mes: string, tipo: TipoArranjo) =>
    ["programacoes", mes, tipo] as const,
  contadores: (mes: string) => ["programacoes", "contadores", mes] as const,
  observacoesRelatorio: ["configuracoes", CHAVE_OBSERVACOES_RELATORIO] as const,
  pinStatus: ["pin", "status"] as const,
};
