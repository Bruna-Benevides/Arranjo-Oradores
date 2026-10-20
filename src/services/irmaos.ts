// Irmãos (oradores cadastrados).

import { supabase } from "@/integrations/supabase/client";
import { emptyToNull, unwrap } from "@/services/support";
import type { Irmao, IrmaoInput } from "@/types/domain";

function normalizar(input: IrmaoInput): IrmaoInput {
  return {
    nome: input.nome.trim(),
    congregacao_id: input.congregacao_id,
    privilegio: input.privilegio,
    telefone: emptyToNull(input.telefone),
    observacoes: emptyToNull(input.observacoes),
  };
}

export async function listIrmaos(): Promise<Irmao[]> {
  return unwrap(
    await supabase.from("irmaos").select("*").order("nome", { ascending: true }),
    "Não foi possível carregar os irmãos",
  );
}

export async function createIrmao(input: IrmaoInput): Promise<Irmao> {
  return unwrap(
    await supabase.from("irmaos").insert(normalizar(input)).select("*").single(),
    "Não foi possível salvar o irmão",
  );
}

export async function updateIrmao(id: string, input: IrmaoInput): Promise<Irmao> {
  return unwrap(
    await supabase.from("irmaos").update(normalizar(input)).eq("id", id).select("*").single(),
    "Não foi possível salvar o irmão",
  );
}

export async function deleteIrmao(id: string): Promise<void> {
  const { error } = await supabase.from("irmaos").delete().eq("id", id);
  if (error?.code === "23503") {
    throw new Error("Não é possível excluir este irmão: ele está vinculado a arranjos cadastrados.");
  }
  if (error) throw new Error(`Não foi possível excluir o irmão: ${error.message}`);
}
