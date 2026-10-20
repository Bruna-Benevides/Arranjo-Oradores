import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import {
  createCongregacao,
  deleteCongregacao,
  getCongregacaoLocal,
  listCongregacoes,
  setCongregacaoLocal,
  unsetCongregacaoLocal,
  updateCongregacao,
} from "@/services/congregacoes";

export function useCongregacoes() {
  return useQuery({ queryKey: queryKeys.congregacoes, queryFn: listCongregacoes });
}

/** A congregação marcada como local (a do responsável pelo arranjo). */
export function useCongregacaoLocal() {
  return useQuery({
    queryKey: queryKeys.congregacaoLocal,
    queryFn: getCongregacaoLocal,
  });
}

function useInvalidarCongregacoes() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.congregacoes });
  };
}

export function useSalvarCongregacao() {
  const invalidar = useInvalidarCongregacoes();
  return useMutation({
    mutationFn: (payload: { id?: string; input: Parameters<typeof createCongregacao>[0] }) =>
      payload.id
        ? updateCongregacao(payload.id, payload.input)
        : createCongregacao(payload.input),
    onSuccess: invalidar,
  });
}

export function useExcluirCongregacao() {
  const invalidar = useInvalidarCongregacoes();
  return useMutation({
    mutationFn: (id: string) => deleteCongregacao(id),
    onSuccess: invalidar,
  });
}

/** Define (ou remove) a congregação local. Sempre invalida as duas consultas. */
export function useDefinirCongregacaoLocal() {
  const invalidar = useInvalidarCongregacoes();
  return useMutation({
    mutationFn: (payload: { id: string; isLocal: boolean }) =>
      payload.isLocal ? setCongregacaoLocal(payload.id) : unsetCongregacaoLocal(payload.id),
    onSuccess: invalidar,
  });
}
