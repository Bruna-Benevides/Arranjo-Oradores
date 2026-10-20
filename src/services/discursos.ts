// Discursos e o histórico de uso.
//
// O histórico vem da view `vw_discursos_ultimo_uso`, que agrega TODO o
// histórico de `programacoes` (não apenas o mês aberto na tela) e devolve a
// data do último uso e o total de usos de cada discurso.

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { emptyToNull, unwrap } from "@/services/support";
import type {
  Discurso,
  DiscursoComHistorico,
  DiscursoInput,
  HistoricoDiscurso,
  HistoricoUsoDiscurso,
} from "@/types/domain";

type HistoricoViewRow = Database["public"]["Views"]["vw_historico_discursos"]["Row"];

async function listarHistoricoCompleto(): Promise<HistoricoViewRow[]> {
  const linhas: HistoricoViewRow[] = [];
  const tamanhoPagina = 1000;
  let inicio = 0;

  while (true) {
    const pagina = unwrap(
      await supabase
        .from("vw_historico_discursos")
        .select("*")
        .order("data", { ascending: false })
        .order("programacao_id", { ascending: false })
        .range(inicio, inicio + tamanhoPagina - 1),
      "Não foi possível carregar o histórico completo dos discursos",
    );

    linhas.push(...pagina);
    if (pagina.length < tamanhoPagina) return linhas;
    inicio += tamanhoPagina;
  }
}

export async function listDiscursos(): Promise<Discurso[]> {
  return unwrap(
    await supabase.from("discursos").select("*").order("numero", { ascending: true }),
    "Não foi possível carregar os discursos",
  );
}

/** Discursos com "último uso", usados no combobox de Tema do arranjo. */
export async function listDiscursosComHistorico(): Promise<DiscursoComHistorico[]> {
  const [discursos, ultimoUso, historicoCompleto] = await Promise.all([
    listDiscursos(),
    unwrap(
      await supabase.from("vw_discursos_ultimo_uso").select("*"),
      "Não foi possível carregar o histórico dos discursos",
    ),
    listarHistoricoCompleto(),
  ]);

  const ultimoUsoPorDiscurso = new Map<string, HistoricoDiscurso>();
  ultimoUso.forEach((linha) => {
    if (linha.discurso_id) ultimoUsoPorDiscurso.set(linha.discurso_id, linha);
  });

  const historicoPorDiscurso = new Map<string, HistoricoUsoDiscurso[]>();
  historicoCompleto.forEach((linha) => {
    if (!linha.discurso_id || !linha.data) return;
    const historico = historicoPorDiscurso.get(linha.discurso_id) ?? [];
    historico.push({
      data: linha.data,
      tipo: linha.tipo === "vai" ? "vai" : "vem",
      oradorNome: linha.orador_nome ?? linha.irmao_cadastrado,
      congregacaoNome: linha.congregacao_nome,
    });
    historicoPorDiscurso.set(linha.discurso_id, historico);
  });

  return discursos.map((discurso) => {
    const linha = ultimoUsoPorDiscurso.get(discurso.id);
    return {
      ...discurso,
      ultimaData: linha?.ultima_data ?? null,
      totalUsos: linha?.total_usos ?? 0,
      historico: historicoPorDiscurso.get(discurso.id) ?? [],
    };
  });
}

export async function createDiscurso(input: DiscursoInput): Promise<Discurso> {
  return unwrap(
    await supabase
      .from("discursos")
      .insert({ numero: input.numero, tema: input.tema.trim() })
      .select("*")
      .single(),
    "Não foi possível salvar o discurso",
  );
}

export async function updateDiscurso(
  id: string,
  input: DiscursoInput,
): Promise<Discurso> {
  return unwrap(
    await supabase
      .from("discursos")
      .update({ numero: input.numero, tema: input.tema.trim() })
      .eq("id", id)
      .select("*")
      .single(),
    "Não foi possível salvar o discurso",
  );
}

export async function deleteDiscurso(id: string): Promise<void> {
  const { error } = await supabase.from("discursos").delete().eq("id", id);
  if (error?.code === "23503") {
    throw new Error(
      "Não é possível excluir este discurso: ele está associado a arranjos. Use Bloquear para impedir novos usos.",
    );
  }
  if (error) throw new Error(`Não foi possível excluir o discurso: ${error.message}`);
}

/**
 * Bloqueia o discurso para novos arranjos. Nada é apagado: o discurso continua
 * no banco e no histórico — o bloqueio só impede a seleção em novos arranjos.
 */
export async function bloquearDiscurso(id: string, motivo: string): Promise<void> {
  const { error } = await supabase
    .from("discursos")
    .update({ bloqueado: true, motivo_bloqueio: emptyToNull(motivo) })
    .eq("id", id);
  if (error) throw new Error(`Não foi possível bloquear o discurso: ${error.message}`);
}

/** Desbloqueia e limpa o motivo, sem confirmação adicional. */
export async function desbloquearDiscurso(id: string): Promise<void> {
  const { error } = await supabase
    .from("discursos")
    .update({ bloqueado: false, motivo_bloqueio: null })
    .eq("id", id);
  if (error) throw new Error(`Não foi possível desbloquear o discurso: ${error.message}`);
}
