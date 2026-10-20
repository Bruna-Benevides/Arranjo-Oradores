import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import { createCantico, deleteCantico, listCanticos, updateCantico } from "@/services/cantico";
import type { CanticoInput } from "@/types/domain";

export function useCanticos() {
  return useQuery({ queryKey: queryKeys.canticos, queryFn: listCanticos });
}

function useInvalidarCanticos() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.canticos });
  };
}

export function useSalvarCantico() {
  const invalidar = useInvalidarCanticos();
  return useMutation({
    mutationFn: (payload: { id?: string; input: CanticoInput }) =>
      payload.id ? updateCantico(payload.id, payload.input) : createCantico(payload.input),
    onSuccess: invalidar,
  });
}

export function useExcluirCantico() {
  const invalidar = useInvalidarCanticos();
  return useMutation({
    mutationFn: (id: string) => deleteCantico(id),
    onSuccess: invalidar,
  });
}
