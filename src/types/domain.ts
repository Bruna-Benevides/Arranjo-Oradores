// Tipos de domínio do app.
//
// As linhas vindas do backend são derivadas dos tipos gerados em
// `src/integrations/supabase/types.ts` (que é sobrescrito pela plataforma),
// evitando duplicar a definição das colunas à mão.

import type { Database } from "@/integrations/supabase/types";

type PublicTables = Database["public"]["Tables"];

export type Congregacao = PublicTables["congregacoes"]["Row"];
export type Irmao = PublicTables["irmaos"]["Row"];
export type Discurso = PublicTables["discursos"]["Row"];
export type Cantico = PublicTables["canticos"]["Row"];
export type Programacao = PublicTables["programacoes"]["Row"];
export type Configuracao = PublicTables["configuracoes"]["Row"];
export type HistoricoDiscurso =
  Database["public"]["Views"]["vw_discursos_ultimo_uso"]["Row"];

/**
 * Tipo do arranjo.
 *
 * - `vem`: orador de OUTRA congregação que fará o discurso na nossa.
 * - `vai`: orador da NOSSA congregação que fará o discurso em outra congregação.
 *
 * O tipo define o significado de `programacoes.congregacao_id`: em `vem` é a
 * congregação de ORIGEM; em `vai` é a congregação de DESTINO.
 */
export type TipoArranjo = "vem" | "vai";

export const TIPOS_ARRANJO: readonly TipoArranjo[] = ["vem", "vai"] as const;

/** Normaliza o campo `tipo` (text no banco) para o union tipado. */
export function toTipoArranjo(value: string | null | undefined): TipoArranjo {
  return value === "vai" ? "vai" : "vem";
}

export type PrivilegioIrmao = "anciao" | "servo_ministerial";

export function toPrivilegio(value: string | null): PrivilegioIrmao | null {
  if (value === "anciao" || value === "servo_ministerial") return value;
  return null;
}

/** Discurso com o histórico de uso (data da última vez e total de usos). */
export interface DiscursoComHistorico extends Discurso {
  ultimaData: string | null;
  totalUsos: number;
  historico: HistoricoUsoDiscurso[];
}

export interface HistoricoUsoDiscurso {
  data: string;
  tipo: TipoArranjo;
  oradorNome: string | null;
  congregacaoNome: string | null;
}

/** Arranjo com as relações já resolvidas, para tela e relatório. */
export interface ArranjoDetalhado extends Programacao {
  discurso: Discurso | null;
  congregacao: Congregacao | null;
  orador: Irmao | null;
}

export function getTemaArranjo(arranjo: ArranjoDetalhado): string | null {
  return arranjo.discurso?.tema ?? arranjo.discurso_tema_historico;
}

export function getNumeroArranjo(arranjo: ArranjoDetalhado): number | null {
  return arranjo.discurso?.numero ?? arranjo.discurso_numero_historico;
}

export function getCongregacaoArranjo(arranjo: ArranjoDetalhado): string | null {
  return arranjo.congregacao?.nome ?? arranjo.congregacao_nome_historico;
}

/** Grupo de arranjos por congregação — é assim que o relatório é montado. */
export interface GrupoRelatorio {
  /** `null` apenas para eventos especiais sem congregação informada. */
  congregacaoId: string | null;
  congregacaoNome: string;
  arranjos: ArranjoDetalhado[];
}

// ---------------------------------------------------------------------------
// Entradas de formulário (o que o app envia para gravação)
// ---------------------------------------------------------------------------

export interface CongregacaoInput {
  nome: string;
  endereco: string | null;
  dia_reuniao: string | null;
  horario: string | null;
  google_maps_url: string | null;
  observacoes: string | null;
}

export interface IrmaoInput {
  nome: string;
  congregacao_id: string;
  privilegio: PrivilegioIrmao | null;
  telefone: string | null;
  observacoes: string | null;
}

export interface DiscursoInput {
  numero: number;
  tema: string;
}

export interface CanticoInput {
  numero: number;
  tema: string;
}

export interface ArranjoInput {
  /** Sempre no formato "yyyy-MM-dd" — ver `src/lib/date.ts`. */
  data: string;
  tipo: TipoArranjo;
  discurso_id: string | null;
  orador_id: string | null;
  orador_nome: string | null;
  orador_telefone: string | null;
  congregacao_id: string | null;
  evento_especial: boolean;
  descricao_evento: string | null;
}
