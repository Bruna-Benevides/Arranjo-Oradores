import type { Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";

export async function salvarInscricaoPush(
  userId: string,
  subscription: PushSubscription,
): Promise<void> {
  const dados = subscription.toJSON();
  if (!dados.endpoint || !dados.keys?.auth || !dados.keys.p256dh) {
    throw new Error("O navegador não forneceu uma inscrição de notificação válida.");
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: dados.endpoint,
      subscription: dados as Json,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,endpoint" },
  );
  if (error) throw new Error(`Não foi possível salvar as notificações: ${error.message}`);
}

export async function removerInscricaoPush(userId: string, endpoint: string): Promise<void> {
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userId)
    .eq("endpoint", endpoint);
  if (error) throw new Error(`Não foi possível desativar as notificações: ${error.message}`);
}
