import { supabase } from "@/integrations/supabase/client";

export interface PinStatus {
  configurado: boolean;
}

export interface PinResposta {
  ok: boolean;
  configurado?: boolean;
  error?: string;
  tentativasRestantes?: number;
  bloqueado?: boolean;
  bloqueadoAte?: string | null;
}

async function chamar(body: Record<string, string>): Promise<PinResposta> {
  const { data, error } = await supabase.functions.invoke<PinResposta>("pin-access", {
    body,
    headers: { "Content-Type": "application/json" },
  });

  if (error) {
    const contexto = (error as { context?: Response }).context;
    if (contexto && typeof contexto.json === "function") {
      try {
        const resposta = (await contexto.json()) as PinResposta;
        return resposta;
      } catch {
        // A resposta não inclui corpo JSON legível.
      }
    }
    throw new Error(`Não foi possível validar o PIN: ${error.message}`);
  }

  if (!data) throw new Error("Não foi possível validar o PIN.");
  return data;
}

export async function getPinStatus(): Promise<PinStatus> {
  const resposta = await chamar({ action: "status" });
  if (resposta.error) {
    throw new Error(`Não foi possível carregar o PIN (${resposta.error}).`);
  }
  return { configurado: resposta.configurado === true };
}

export async function verifyPin(pin: string): Promise<PinResposta> {
  return chamar({ action: "verify", pin });
}

export async function changePin(pin: string, novoPin: string): Promise<PinResposta> {
  return chamar({ action: "change", pin, novoPin });
}
