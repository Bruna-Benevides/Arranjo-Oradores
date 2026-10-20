// Datas do app.
//
// REGRA IMPORTANTE: a coluna `programacoes.data` (e tudo que vem dela) é
// tratada como string "yyyy-MM-dd", NUNCA com `new Date("2026-10-04")`.
// O construtor de Date interpreta a forma ISO curta como UTC, então em
// qualquer fuso a oeste de Greenwich o dia "volta" um dia (04/10 viraria
// 03/10). Por isso usamos `parse` do date-fns com o formato explícito, que
// cria a data à meia-noite LOCAL, e `format` para devolver a string.

import { addMonths, format, lastDayOfMonth, parse, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export const ISO_DATE_FORMAT = "yyyy-MM-dd";

/** "2026-10-04" -> Date à meia-noite local. */
export function parseISODate(value: string): Date {
  return parse(value, ISO_DATE_FORMAT, new Date());
}

/** Date -> "2026-10-04" (meia-noite local, sem deslocamento de fuso). */
export function toISODate(date: Date): string {
  return format(date, ISO_DATE_FORMAT);
}

/** Hoje, no formato "yyyy-MM-dd". */
export function todayISO(): string {
  return toISODate(new Date());
}

/** Date -> "2026-10" (chave de mês usada na URL e nas consultas). */
export function monthKey(date: Date): string {
  return format(date, "yyyy-MM");
}

/** "2026-10" -> Date do primeiro dia do mês. */
export function monthFromKey(key: string): Date {
  return parse(key, "yyyy-MM", new Date());
}

/** Mês corrente em "yyyy-MM". */
export function currentMonthKey(): string {
  return monthKey(new Date());
}

/** Normaliza um parâmetro `mes` da URL, caindo no mês atual quando inválido. */
export function normalizeMonthKey(value: string | null): string {
  return value && /^\d{4}-\d{2}$/.test(value) ? value : currentMonthKey();
}

/** Avança/retrocede meses em relação a uma chave "yyyy-MM". */
export function shiftMonthKey(key: string, delta: number): string {
  return monthKey(addMonths(monthFromKey(key), delta));
}

/** Primeiro e último dia do mês como strings "yyyy-MM-dd", para `.gte`/`.lte`. */
export function monthRange(date: Date): { start: string; end: string } {
  return {
    start: toISODate(startOfMonth(date)),
    end: toISODate(lastDayOfMonth(date)),
  };
}

/** Mesmo intervalo, a partir de uma chave "yyyy-MM". */
export function monthRangeFromKey(key: string): { start: string; end: string } {
  return monthRange(monthFromKey(key));
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "Outubro 2026" — título do navegador de mês. */
export function formatMonthLabel(date: Date): string {
  return capitalize(format(date, "MMMM yyyy", { locale: ptBR }));
}

/** "OUTUBRO 2026" — usado no documento do relatório. */
export function formatMonthUpper(date: Date): string {
  return format(date, "MMMM yyyy", { locale: ptBR }).toUpperCase();
}

/** "10/2026" — usado no card de resumo ("0 arranjos em 10/2026"). */
export function formatMonthShort(date: Date): string {
  return format(date, "MM/yyyy");
}

/** "04/10" — coluna DATA do documento. */
export function formatDayMonth(value: string): string {
  return format(parseISODate(value), "dd/MM");
}

/** "04/10/2026" — listas e o rótulo "último: ..." do combobox de tema. */
export function formatFullDate(value: string): string {
  return format(parseISODate(value), "dd/MM/yyyy");
}
