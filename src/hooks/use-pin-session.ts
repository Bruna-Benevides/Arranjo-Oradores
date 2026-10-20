// Sessão do PIN do lado do navegador.
//
// Quem confere o PIN é o servidor (ver `src/services/pin.ts`). Aqui guardamos
// apenas a marca de "já destravado" na máquina: conforme combinado, o app fica
// destravado até o usuário clicar em "Sair" — inclusive depois de fechar e
// reabrir o navegador.

import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import { getPinStatus } from "@/services/pin";

const CHAVE_DESTRAVADO = "arranjo-de-discursos.destravado";

function lerDestravado(): boolean {
  try {
    return window.localStorage.getItem(CHAVE_DESTRAVADO) === "1";
  } catch {
    return false;
  }
}

export interface PinSession {
  destravado: boolean;
  /** Marca o app como destravado (após o servidor confirmar o PIN). */
  destravar: () => void;
  /** "Sair": volta para a tela do PIN. */
  bloquear: () => void;
}

export function usePinSession(): PinSession {
  const [destravado, setDestravado] = useState<boolean>(lerDestravado);

  const destravar = useCallback(() => {
    try {
      window.localStorage.setItem(CHAVE_DESTRAVADO, "1");
    } catch {
      // sem localStorage o app continua destravado apenas nesta aba
    }
    setDestravado(true);
  }, []);

  const bloquear = useCallback(() => {
    try {
      window.localStorage.removeItem(CHAVE_DESTRAVADO);
    } catch {
      // ignora
    }
    setDestravado(false);
  }, []);

  return { destravado, destravar, bloquear };
}

/** Confere se o PIN padrão foi instalado antes de exibir a tela de acesso. */
export function usePinStatus() {
  return useQuery({
    queryKey: queryKeys.pinStatus,
    queryFn: getPinStatus,
    retry: false,
  });
}
