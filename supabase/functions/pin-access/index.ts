// Supabase Edge Function: pin-access
//
// O app é usado por uma única pessoa (o responsável pelo arranjo) e não tem
// autenticação de usuários. O acesso é protegido por um PIN criado na primeira
// abertura.
//
// Por que este código roda no servidor: a tabela `acesso_pin` tem RLS habilitado
// e NENHUMA policy, ou seja, o navegador não consegue ler nem gravar o hash do
// PIN. Somente esta função, usando a chave de serviço, acessa a tabela. O hash
// (PBKDF2 + sal, 120 mil iterações) nunca é devolvido ao cliente, e o limite de
// tentativas também é aplicado aqui — não no navegador.
//
// Ações:
//   status  -> { configurado: boolean }
//   verify  -> confere o PIN e devolve { ok, tentativasRestantes, bloqueadoAte }
//   change  -> confere o PIN atual e substitui pelo novo PIN

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** Quantidade de erros antes do bloqueio temporário. */
const MAX_TENTATIVAS = 5;
/** Duração do bloqueio temporário, em minutos. */
const MINUTOS_DE_BLOQUEIO = 15;
/** Custo do PBKDF2. */
const ITERACOES_PBKDF2 = 120_000;

const PIN_VALIDO = /^\d{4,6}$/;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function paraHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function deHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(Math.floor(hex.length / 2));
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** Deriva o hash do PIN com um sal, usando PBKDF2-SHA256. */
async function derivarHash(pin: string, salHex: string): Promise<string> {
  const chave = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: deHex(salHex),
      iterations: ITERACOES_PBKDF2,
      hash: "SHA-256",
    },
    chave,
    256,
  );
  return paraHex(new Uint8Array(bits));
}

/** Comparação de tempo constante, para não vazar informação pelo tempo de resposta. */
function iguais(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diferenca = 0;
  for (let i = 0; i < a.length; i += 1) {
    diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diferenca === 0;
}

interface LinhaAcessoPin {
  id: number;
  pin_hash: string | null;
  pin_salt: string | null;
  tentativas_falhas: number;
  bloqueado_ate: string | null;
}

Deno.serve(async (req) => {
  // O preflight precisa responder antes de qualquer outro trabalho.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const chaveServico = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !chaveServico) {
    console.error("pin-access: variáveis de ambiente do backend ausentes", {
      temUrl: Boolean(url),
      temChaveServico: Boolean(chaveServico),
    });
    return json({ error: "configuracao_ausente" }, 500);
  }

  const admin = createClient(url, chaveServico, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const corpo = await req.json().catch(() => ({})) as {
      action?: string;
      pin?: string;
      novoPin?: string;
    };
    const acao = corpo.action;
    const pin = typeof corpo.pin === "string" ? corpo.pin.trim() : "";
    const novoPin = typeof corpo.novoPin === "string" ? corpo.novoPin.trim() : "";

    const { data, error } = await admin
      .from("acesso_pin")
      .select("id, pin_hash, pin_salt, tentativas_falhas, bloqueado_ate")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.error("pin-access: falha ao ler acesso_pin", error);
      return json({ error: "falha_leitura" }, 500);
    }

    const linha = data as LinhaAcessoPin | null;
    const configurado = Boolean(linha?.pin_hash && linha?.pin_salt);

    if (acao === "status") {
      return json({ configurado });
    }

    if (acao === "verify" || acao === "change") {
      if (!configurado || !linha?.pin_salt || !linha?.pin_hash) {
        return json({ error: "nao_configurado" }, 409);
      }

      const agora = Date.now();
      const bloqueadoAte = linha.bloqueado_ate
        ? new Date(linha.bloqueado_ate).getTime()
        : 0;

      if (bloqueadoAte > agora) {
        return json({
          ok: false,
          bloqueado: true,
          bloqueadoAte: linha.bloqueado_ate,
          tentativasRestantes: 0,
        }, 429);
      }

      if (!PIN_VALIDO.test(pin)) {
        return json({ ok: false, error: "pin_invalido" }, 400);
      }

      if (acao === "change" && !PIN_VALIDO.test(novoPin)) {
        return json({ ok: false, error: "novo_pin_invalido" }, 400);
      }

      const hashTentativa = await derivarHash(pin, linha.pin_salt);
      const confere = iguais(hashTentativa, linha.pin_hash);

      if (confere) {
        let atualizacao;
        if (acao === "change") {
          const salHex = paraHex(crypto.getRandomValues(new Uint8Array(16)));
          const pinHash = await derivarHash(novoPin, salHex);
          atualizacao = await admin.from("acesso_pin").update({
            pin_hash: pinHash,
            pin_salt: salHex,
            tentativas_falhas: 0,
            bloqueado_ate: null,
            updated_at: new Date().toISOString(),
          }).eq("id", 1);
        } else {
          atualizacao = await admin
            .from("acesso_pin")
            .update({
              tentativas_falhas: 0,
              bloqueado_ate: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", 1);
        }

        if (atualizacao.error) {
          console.error("pin-access: falha ao atualizar o PIN", atualizacao.error);
          return json({ error: "falha_gravacao" }, 500);
        }
        return json({ ok: true, tentativasRestantes: MAX_TENTATIVAS });
      }

      const tentativas = linha.tentativas_falhas + 1;

      if (tentativas >= MAX_TENTATIVAS) {
        const novoBloqueio = new Date(
          agora + MINUTOS_DE_BLOQUEIO * 60_000,
        ).toISOString();
        const { error: erroTentativa } = await admin
          .from("acesso_pin")
          .update({
            tentativas_falhas: 0,
            bloqueado_ate: novoBloqueio,
            updated_at: new Date().toISOString(),
          })
          .eq("id", 1);
        if (erroTentativa) {
          console.error("pin-access: falha ao registrar tentativa", erroTentativa);
          return json({ error: "falha_gravacao" }, 500);
        }
        console.warn("pin-access: PIN bloqueado por tentativas demais");
        return json({
          ok: false,
          bloqueado: true,
          bloqueadoAte: novoBloqueio,
          tentativasRestantes: 0,
        }, 429);
      }

      const { error: erroTentativa } = await admin
        .from("acesso_pin")
        .update({
          tentativas_falhas: tentativas,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);
      if (erroTentativa) {
        console.error("pin-access: falha ao registrar tentativa", erroTentativa);
        return json({ error: "falha_gravacao" }, 500);
      }

      console.warn("pin-access: PIN incorreto", {
        tentativas,
        restantes: MAX_TENTATIVAS - tentativas,
      });
      return json({
        ok: false,
        bloqueado: false,
        tentativasRestantes: MAX_TENTATIVAS - tentativas,
      });
    }

    return json({ error: "acao_invalida" }, 400);
  } catch (erro) {
    console.error("pin-access: erro inesperado", erro);
    return json({ error: "erro_inesperado" }, 500);
  }
});
