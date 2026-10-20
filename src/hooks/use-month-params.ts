// Mês e tipo selecionados, guardados na URL (?mes=2016-10&tipo=vem).
//
// Guardar na URL permite que o botão "Relatório do mês" abra a tela de
// relatório já filtrada no mês e no tipo escolhidos.

import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { formatMonthLabel, monthFromKey, normalizeMonthKey, shiftMonthKey } from "@/lib/date";
import { toTipoArranjo, type TipoArranjo } from "@/types/domain";

export interface MonthParams {
  /** Mês no formato "yyyy-MM". */
  mes: string;
  mesDate: Date;
  /** "Outubro 2026" */
  mesLabel: string;
  tipo: TipoArranjo;
  setMes: (mes: string) => void;
  setTipo: (tipo: TipoArranjo) => void;
  /** Navega ‹ › (delta em meses). */
  shiftMes: (delta: number) => void;
}

export function useMonthParams(): MonthParams {
  const [searchParams, setSearchParams] = useSearchParams();

  const mes = normalizeMonthKey(searchParams.get("mes"));
  const tipo = toTipoArranjo(searchParams.get("tipo"));

  const update = useCallback(
    (proximo: { mes?: string; tipo?: TipoArranjo }) => {
      const params = new URLSearchParams(searchParams);
      if (proximo.mes) params.set("mes", proximo.mes);
      if (proximo.tipo) params.set("tipo", proximo.tipo);
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const mesDate = useMemo(() => monthFromKey(mes), [mes]);

  return {
    mes,
    mesDate,
    mesLabel: formatMonthLabel(mesDate),
    tipo,
    setMes: (valor) => update({ mes: valor }),
    setTipo: (valor) => update({ tipo: valor }),
    shiftMes: (delta) => update({ mes: shiftMonthKey(mes, delta) }),
  };
}
