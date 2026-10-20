import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import { CHAVE_OBSERVACOES_RELATORIO, getConfiguracao, setConfiguracao } from "@/services/configuracoes";

/** Observações finais do documento do relatório (texto editável pelo usuário). */
export function useObservacoesRelatorio() {
  return useQuery({
    queryKey: queryKeys.observacoesRelatorio,
    queryFn: () => getConfiguracao(CHAVE_OBSERVACOES_RELATORIO),
  });
}

export function useSalvarObservacoesRelatorio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (valor: string) => setConfiguracao(CHAVE_OBSERVACOES_RELATORIO, valor),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.observacoesRelatorio });
    },
  });
}