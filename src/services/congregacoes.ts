// Congregações: consultas e gravações centralizadas aqui (nenhuma tela fala
// com o backend diretamente).

import { supabase } from "@/integrations/supabase/client";
import { todayISO } from "@/lib/date";
import { emptyToNull, unwrap, unwrapNullable } from "@/services/support";
import type { Congregacao, CongregacaoInput } from "@/types/domain";

function normalizar(input: CongregacaoInput): CongregacaoInput {
  return {
    nome: input.nome.trim(),
    endereco: emptyToNull(input.endereco),
    dia_reuniao: emptyToNull(input.dia_reuniao),
    horario: emptyToNull(input.horario),
    google_maps_url: emptyToNull(input.google_maps_url),
    observacoes: emptyToNull(input.observacoes),
  };
}

export async function listCongregacoes(): Promise<Congregacao[]> {
  return unwrap(
    await supabase.from("congregacoes").select("*").order("nome", { ascending: true }),
    "Não foi possível carregar as congregações",
  );
}

/** A congregação do responsável pelo arranjo (a única com `is_local = true`). */
export async function getCongregacaoLocal(): Promise<Congregacao | null> {
  return unwrapNullable(
    await supabase.from("congregacoes").select("*").eq("is_local", true).maybeSingle(),
    "Não foi possível carregar a congregação local",
  );
}

export async function createCongregacao(input: CongregacaoInput): Promise<Congregacao> {
  return unwrap(
    await supabase.from("congregacoes").insert(normalizar(input)).select("*").single(),
    "Não foi possível salvar a congregação",
  );
}

export async function updateCongregacao(
  id: string,
  input: CongregacaoInput,
): Promise<Congregacao> {
  return unwrap(
    await supabase.from("congregacoes").update(normalizar(input)).eq("id", id).select("*").single(),
    "Não foi possível salvar a congregação",
  );
}

export async function deleteCongregacao(id: string): Promise<void> {
  const { error } = await supabase.from("congregacoes").delete().eq("id", id);
  if (error?.code === "P0001") {
    throw new Error(error.message);
  }
  if (error?.code === "23503") {
    throw new Error(
      "Não é possível excluir esta congregação porque ainda existem irmãos ou arranjos vinculados.",
    );
  }
  if (error) throw new Error(`Não foi possível excluir a congregação: ${error.message}`);
}

export async function getImpactoExclusaoCongregacao(id: string): Promise<{
  datasPassadas: string[];
  datasHojeOuFuturas: string[];
  quantidadeIrmaos: number;
}> {
  const [arranjos, irmaos] = await Promise.all([
    supabase
      .from("programacoes")
      .select("data")
      .eq("congregacao_id", id)
      .order("data", { ascending: true }),
    supabase.from("irmaos").select("id", { count: "exact", head: true }).eq("congregacao_id", id),
  ]);
  if (arranjos.error) {
    throw new Error(`Não foi possível verificar os arranjos da congregação: ${arranjos.error.message}`);
  }
  if (irmaos.error) {
    throw new Error(`Não foi possível verificar os irmãos da congregação: ${irmaos.error.message}`);
  }

  const hoje = todayISO();
  const datas = (arranjos.data ?? []).map(({ data }) => data);
  return {
    datasPassadas: datas.filter((data) => data < hoje),
    datasHojeOuFuturas: datas.filter((data) => data >= hoje),
    quantidadeIrmaos: irmaos.count ?? 0,
  };
}

/**
 * Define qual congregação é a local. O índice único parcial do banco garante
 * apenas uma linha com `is_local = true`, então desmarcamos a anterior antes.
 */
export async function setCongregacaoLocal(id: string): Promise<void> {
  const { error: erroLimpeza } = await supabase
    .from("congregacoes")
    .update({ is_local: false })
    .eq("is_local", true);

  if (erroLimpeza) {
    throw new Error(`Não foi possível alterar a congregação local: ${erroLimpeza.message}`);
  }

  const { error } = await supabase
    .from("congregacoes")
    .update({ is_local: true })
    .eq("id", id);

  if (error) throw new Error(`Não foi possível definir a congregação local: ${error.message}`);
}
