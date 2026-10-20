import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import {
  bloquearDiscurso,
  createDiscurso,
  deleteDiscurso,
  desbloquearDiscurso,
  listDiscursos,
  listDiscursosComHistorico,
  updateDiscurso,
} from "@/services/discursos";
import type { DiscursoInput } from "@/types/domain";

export function useDiscursos() {
  return useQuery({ queryKey: queryKeys.discursos, queryFn: listDiscursos });
}

/** Discursos com a data do último uso — usados no combobox de Tema. */
export function useDiscursosComHistorico() {
  return useQuery({
    queryKey: queryKeys.discursosComHistorico,
    queryFn: listDiscursosComHistorico,
  });
}

function useInvalidarDiscursos() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.discursos });
  };
}

export function useSalvarDiscurso() {
  const invalidar = useInvalidarDiscursos();
  return useMutation({
    mutationFn: (payload: { id?: string; input: DiscursoInput }) =>
      payload.id
        ? updateDiscurso(payload.id, payload.input)
        : createDiscurso(payload.input),
    onSuccess: invalidar,
  });
}

export function useExcluirDiscurso() {
  const invalidar = useInvalidarDiscursos();
  return useMutation({
    mutationFn: (id: string) => deleteDiscurso(id),
    onSuccess: invalidar,
  });
}

/** Bloqueia um discurso para novos arranjos (nada é apagado). */
export function useBloquearDiscurso() {
  const invalidar = useInvalidarDiscursos();
  return useMutation({
    mutationFn: (payload: { id: string; motivo: string }) =>
      bloquearDiscurso(payload.id, payload.motivo),
    onSuccess: invalidar,
  });
}

export function useDesbloquearDiscurso() {
  const invalidar = useInvalidarDiscursos();
  return useMutation({
    mutationFn: (id: string) => desbloquearDiscurso(id),
    onSuccess: invalidar,
  });
}
