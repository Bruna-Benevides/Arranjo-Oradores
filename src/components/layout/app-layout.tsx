// Layout das telas internas: menu fixo no topo + conteúdo centralizado.
// O menu não é impresso (.no-print dentro do TopNav).

import { Outlet } from "react-router-dom";

import { usePinSessionContext } from "@/features/auth/pin-session-context";
import { TopNav } from "./top-nav";

export function AppLayout() {
  const { bloquear } = usePinSessionContext();

  return (
    <div className="min-h-screen bg-background">
      <TopNav onSair={bloquear} />
      <main className="mx-auto w-full max-w-[680px] px-4 pb-16 pt-6">
        <Outlet />
      </main>
    </div>
  );
}
