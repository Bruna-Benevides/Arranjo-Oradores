import { AppLayout } from "./components/layout/app-layout";
import { AuthGate } from "./features/auth/auth-gate";
import CanticosPage from "./pages/canticos";
import CongregacoesPage from "./pages/congregacoes";
import DiscursosPage from "./pages/discursos";
import IrmaosPage from "./pages/irmaos";
import NotFound from "./pages/NotFound";
import ProgramacoesPage from "./pages/programacoes";
import RelatorioPage from "./pages/relatorio";

// Todas as telas ficam dentro do AuthGate (conta autorizada) e do AppLayout
// (menu superior fixo + coluna centralizada).
export const routers = [
  {
    path: "/",
    name: "app",
    element: (
      <AuthGate>
        <AppLayout />
      </AuthGate>
    ),
    children: [
      { path: "/", name: "programacoes", element: <ProgramacoesPage /> },
      { path: "/relatorio", name: "relatorio", element: <RelatorioPage /> },
      { path: "/irmaos", name: "irmaos", element: <IrmaosPage /> },
      { path: "/discursos", name: "discursos", element: <DiscursosPage /> },
      { path: "/canticos", name: "canticos", element: <CanticosPage /> },
      { path: "/congregacoes", name: "congregacoes", element: <CongregacoesPage /> },
      /* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */
      { path: "*", name: "404", element: <NotFound /> },
    ],
  },
];

declare global {
  interface Window {
    __routers__: typeof routers;
  }
}

window.__routers__ = routers;
