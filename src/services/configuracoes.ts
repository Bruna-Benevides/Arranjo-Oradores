// Configurações em chave/valor. Hoje guarda apenas as observações finais do
// documento do relatório, que o usuário edita dentro do app (nada fixo no código).

import { supabase } from "@/integrations/supabase/client";
import { unwrapNullable } from "@/services/support";
import type { Configuracao } from "@/types/domain";

export const CHAVE_OBSERVACOES_RELATORIO = "observacoes_relatorio";

export async function getConfiguracao(chave: string): Promise<string | null> {
  const linha = (await unwrapNullable(
    await supabase.from("configuracoes").select("*").eq("chave", chave).maybeSingle(),
    "Não foi possível carregar a configuração",
  )) as Configuracao | null;

  return linha?.valor ?? null;
}

export async function setConfiguracao(chave: string, valor: string): Promise<void> {
  const { error } = await supabase
    .from("configuracoes")
    .upsert(
      { chave, valor, updated_at: new Date().toISOString() },
      { onConflict: "chave" },
    );

  if (error) throw new Error(`Não foi possível salvar a configuração: ${error.message}`);
}
