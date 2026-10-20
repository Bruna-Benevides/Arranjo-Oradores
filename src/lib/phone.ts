// Máscara de telefone brasileira: (11) 90000-0000.
// O valor fica sempre com a máscara na interface e é gravado como texto,
// porque o telefone serve apenas para contato (não para discagem automática).

/** Mantém somente os dígitos (no máximo 11). */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11);
}

/**
 * Aplica a máscara progressivamente enquanto o usuário digita:
 * `(11`, `(11) 9`, `(11) 9000-0000` (fixo) ou `(11) 90000-0000` (celular).
 */
export function formatPhone(value: string): string {
  const digits = onlyDigits(value);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;

  const ddd = digits.slice(0, 2);
  const restante = digits.slice(2);
  if (restante.length <= 4) return `(${ddd}) ${restante}`;

  // 11 dígitos = celular (5 antes do hífen); 10 = fixo (4 antes do hífen).
  const corte = restante.length <= 8 ? 4 : 5;
  return `(${ddd}) ${restante.slice(0, corte)}-${restante.slice(corte)}`;
}
