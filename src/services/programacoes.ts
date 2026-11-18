// Arranjos (a tabela `programacoes`).
//
// O campo `congregacao_id` significa "a congregação do outro lado": em
// `tipo = 'vem'` é a congregação de ORIGEM do orador (inclusive a local); em
// `tipo = 'vai'` é o DESTINO, não local e independente da congregação do orador.
// O relatório agrupa por ele.

import { supabase } from "@/integrations/supabase/client";
import { monthRangeFromKey } from "@/lib/date";
import { emptyToNull } from "@/services/support";
import {
  toTipoArranjo,
  type ArranjoDetalhado,
  type ArranjoInput,
  type Congregacao,
  type Discurso,
  type Irmao,
  type Programacao,
  type TipoArranjo,
} from "@/types/domain";

/** Colunas do arranjo + as três relações usadas na lista e no relatório. */
const SELECT_COM_RELACOES =
  "*, discurso:discursos(*), congregacao:congregacoes(*), orador:irmaos(*)";

type LinhaComRelacoes = Programacao & {
  discurso: Discurso | null;
  congregacao: Congregacao | null;
  orador: Irmao | null;
};

/** Campos gravados a partir do formulário, com evento especial normalizado. */
function normalizar(input: ArranjoInput) {
  return {
    data: input.data,
    tipo: input.tipo,
    // Evento especial não tem orador nem discurso (o banco tem CHECK para isso).
    discurso_id: input.evento_especial ? null : input.discurso_id,
    discurso_numero_historico: null,
    discurso_tema_historico: null,
    orador_id: input.evento_especial ? null : input.orador_id,
    orador_nome: input.evento_especial ? null : emptyToNull(input.orador_nome),
    orador_telefone: input.evento_especial ? null : emptyToNull(input.orador_telefone),
    congregacao_id: input.congregacao_id || null,
    congregacao_nome_historico: null,
    evento_especial: input.evento_especial,
    descricao_evento: input.evento_especial
      ? emptyToNull(input.descricao_evento)
      : null,
    updated_at: new Date().toISOString(),
  };
}

function normalizarLinha(linha: LinhaComRelacoes): ArranjoDetalhado {
  return { ...linha, tipo: toTipoArranjo(linha.tipo) };
}

/** Arranjos de um mês e de um tipo, em ordem de data. */
export async function listArranjosDoMes(
  mes: string,
  tipo: TipoArranjo,
): Promise<ArranjoDetalhado[]> {
  const { start, end } = monthRangeFromKey(mes);
  const { data, error } = await supabase
    .from("programacoes")
    .select(SELECT_COM_RELACOES)
    .eq("tipo", tipo)
    .gte("data", start)
    .lte("data", end)
    .order("data", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Não foi possível carregar os arranjos: ${error.message}`);

  // O cliente genérico não descreve os apelidos das relações embutidas; o
  // formato devolvido é exatamente o de LinhaComRelacoes.
  return ((data ?? []) as unknown as LinhaComRelacoes[]).map(normalizarLinha);
}

/** Quantidade de arranjos do mês em cada tipo (contadores das pills). */
export async function countArranjosDoMes(
  mes: string,
): Promise<Record<TipoArranjo, number>> {
  const { start, end } = monthRangeFromKey(mes);

  const contar = async (tipo: TipoArranjo): Promise<number> => {
    const { count, error } = await supabase
      .from("programacoes")
      .select("id", { count: "exact", head: true })
      .eq("tipo", tipo)
      .gte("data", start)
      .lte("data", end);
    if (error) throw new Error(`Não foi possível contar os arranjos: ${error.message}`);
    return count ?? 0;
  };

  const [vem, vai] = await Promise.all([contar("vem"), contar("vai")]);
  return { vem, vai };
}

export async function createArranjo(input: ArranjoInput): Promise<Programacao> {
  const { data, error } = await supabase
    .from("programacoes")
    .insert(normalizar(input))
    .select("*")
    .single();
  if (error) throw new Error(`Não foi possível salvar o arranjo: ${error.message}`);
  return data as Programacao;
}

export async function updateArranjo(
  id: string,
  input: ArranjoInput,
): Promise<Programacao> {
  const { data, error } = await supabase
    .from("programacoes")
    .update(normalizar(input))
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(`Não foi possível salvar o arranjo: ${error.message}`);
  return data as Programacao;
}

export async function deleteArranjo(id: string): Promise<void> {
  const { error } = await supabase.from("programacoes").delete().eq("id", id);
  if (error) throw new Error(`Não foi possível excluir o arranjo: ${error.message}`);
}
