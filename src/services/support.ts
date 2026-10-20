// Apoio às funções de acesso ao backend: transforma o erro do cliente em uma
// exceção com mensagem legível, para os hooks mostrarem em toast.

import type { PostgrestError } from "@supabase/supabase-js";

interface RespostaBackend<T> {
  data: T | null;
  error: PostgrestError | null;
}

/**
 * Devolve `data` ou lança um erro com contexto. Sempre que a linha pode
 * legitimamente não existir, use as consultas que retornam array (`list...`)
 * ou o retorno `| null` — o cliente só erra quando o backend realmente falha.
 */
export function unwrap<T>(resposta: RespostaBackend<T>, contexto: string): T {
  if (resposta.error) {
    throw new Error(`${contexto}: ${resposta.error.message}`);
  }
  if (resposta.data === null) {
    throw new Error(`${contexto}: o backend não devolveu dados.`);
  }
  return resposta.data;
}

/** Versão para consultas que podem não encontrar nenhuma linha. */
export function unwrapNullable<T>(
  resposta: RespostaBackend<T>,
  contexto: string,
): T | null {
  if (resposta.error) {
    throw new Error(`${contexto}: ${resposta.error.message}`);
  }
  return resposta.data;
}

/** Converte string vazia em `null`, para o banco guardar ausência de valor. */
export function emptyToNull(valor: string | null | undefined): string | null {
  const limpo = valor?.trim();
  return limpo && limpo.length > 0 ? limpo : null;
}
