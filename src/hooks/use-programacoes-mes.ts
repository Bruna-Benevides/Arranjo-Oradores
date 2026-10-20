import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import {
  countArranjosDoMes,
  createArranjo,
  deleteArranjo,
  listArranjosDoMes,
  updateArranjo,
} from "@/services/programacoes";
import type { ArranjoInput, TipoArranjo } from "@/types/domain";

/** Arranjos do mês e do tipo selecionados, ordenados por data. */
export function useArranjosDoMes(mes: string, tipo: TipoArranjo) {
  return useQuery({
    queryKey: queryKeys.arranjos(mes, tipo),
    queryFn: () => listArranjosDoMes(mes, tipo),
  });
}

/** Quantidade de arranjos do mês em cada tipo (contadores das pills). */
export function useContadoresDoMes(mes: string) {
  return useQuery({
    queryKey: queryKeys.contadores(mes),
    queryFn: () => countArranjosDoMes(mes),
  });
}

/**
 * Toda gravação de arranjo também invalida os discursos: o histórico de
 * "último uso" de cada discurso muda quando um novo arranjo é salvo.
 */
function useInvalidarArranjos() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["programacoes"] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.discursos });
  };
}

export function useSalvarArranjo() {
  const invalidar = useInvalidarArranjos();
  return useMutation({
    mutationFn: (payload: { id?: string; input: ArranjoInput }) =>
      payload.id ? updateArranjo(payload.id, payload.input) : createArranjo(payload.input),
    onSuccess: invalidar,
  });
}

export function useExcluirArranjo() {
  const invalidar = useInvalidarArranjos();
  return useMutation({
    mutationFn: (id: string) => deleteArranjo(id),
    onSuccess: invalidar,
  });
}
