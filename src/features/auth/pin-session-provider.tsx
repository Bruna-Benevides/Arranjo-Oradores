// Provider da sessão do PIN.
//
// O estado "destravado" precisa ser lido em dois lugares (a tela de PIN e o
// botão "Sair" do menu), por isso ele vive num contexto — e não em dois
// useState independentes que ficariam dessincronizados.

import type { ReactNode } from "react";

import { usePinSession } from "@/hooks/use-pin-session";
import { PinSessionContext } from "./pin-session-context";

export function PinSessionProvider({ children }: { children: ReactNode }) {
  const sessao = usePinSession();
  return (
    <PinSessionContext.Provider value={sessao}>{children}</PinSessionContext.Provider>
  );
}
