// Cânticos.

import { supabase } from "@/integrations/supabase/client";
import { unwrap } from "@/services/support";
import type { Cantico, CanticoInput } from "@/types/domain";

export async function listCanticos(): Promise<Cantico[]> {
  return unwrap(
    await supabase.from("canticos").select("*").order("numero", { ascending: true }),
    "Não foi possível carregar os cânticos",
  );
}

export async function createCantico(input: CanticoInput): Promise<Cantico> {
  return unwrap(
    await supabase
      .from("canticos")
      .insert({ numero: input.numero, tema: input.tema.trim() })
      .select("*")
      .single(),
    "Não foi possível salvar o cântico",
  );
}

export async function importCanticos(inputs: CanticoInput[]): Promise<Cantico[]> {
  if (inputs.length === 0) return [];

  const existentes = unwrap(
    await supabase
      .from("canticos")
      .select("numero, tema")
      .in(
        "numero",
        inputs.map(({ numero }) => numero),
      ),
    "Não foi possível comparar os temas dos cânticos",
  );
  const temaPorNumero = new Map(existentes.map((cantico) => [cantico.numero, cantico.tema]));
  const alterarOuInserir = inputs.filter(({ numero, tema }) => temaPorNumero.get(numero) !== tema);
  if (alterarOuInserir.length === 0) return [];

  const { data, error } = await supabase
    .from("canticos")
    .upsert(alterarOuInserir, { onConflict: "numero" })
    .select("*");
  if (error?.code === "23505") {
    throw new Error("Não foi possível importar os cânticos porque há números duplicados.");
  }
  if (error) throw new Error(`Não foi possível importar os cânticos: ${error.message}`);
  return data;
}

export async function updateCantico(id: string, input: CanticoInput): Promise<Cantico> {
  return unwrap(
    await supabase
      .from("canticos")
      .update({ numero: input.numero, tema: input.tema.trim() })
      .eq("id", id)
      .select("*")
      .single(),
    "Não foi possível salvar o cântico",
  );
}

export async function deleteCantico(id: string): Promise<void> {
  const { error } = await supabase.from("canticos").delete().eq("id", id);
  if (error) throw new Error(`Não foi possível excluir o cântico: ${error.message}`);
}
