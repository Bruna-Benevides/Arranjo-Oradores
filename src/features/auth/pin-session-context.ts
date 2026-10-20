// Contexto e hook da sessão do PIN, num arquivo sem componentes (para o
// fast-refresh do Vite continuar funcionando).

import { createContext, useContext } from "react";

import type { PinSession } from "@/hooks/use-pin-session";

export const PinSessionContext = createContext<PinSession | null>(null);

export function usePinSessionContext(): PinSession {
  const sessao = useContext(PinSessionContext);
  if (!sessao) {
    throw new Error("usePinSessionContext precisa estar dentro de PinSessionProvider.");
  }
  return sessao;
}
