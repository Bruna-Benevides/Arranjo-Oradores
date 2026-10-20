import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import { createIrmao, deleteIrmao, listIrmaos, updateIrmao } from "@/services/irmaos";
import type { IrmaoInput } from "@/types/domain";

export function useIrmaos() {
  return useQuery({ queryKey: queryKeys.irmaos, queryFn: listIrmaos });
}

function useInvalidarIrmaos() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.irmaos });
  };
}

export function useSalvarIrmao() {
  const invalidar = useInvalidarIrmaos();
  return useMutation({
    mutationFn: (payload: { id?: string; input: IrmaoInput }) =>
      payload.id ? updateIrmao(payload.id, payload.input) : createIrmao(payload.input),
    onSuccess: invalidar,
  });
}

export function useExcluirIrmao() {
  const invalidar = useInvalidarIrmaos();
  return useMutation({
    mutationFn: (id: string) => deleteIrmao(id),
    onSuccess: invalidar,
  });
}
