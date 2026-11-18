// Layout das telas internas: menu fixo no topo + conteúdo centralizado.
// O menu não é impresso (.no-print dentro do TopNav).

import { Outlet } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { TopNav } from "./top-nav";

export function AppLayout() {
  const queryClient = useQueryClient();

  const sair = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error("Não foi possível encerrar a sessão.");
        return;
      }
      queryClient.clear();
    } catch {
      toast.error("Não foi possível encerrar a sessão.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav onSair={() => void sair()} />
      <main className="mx-auto w-full max-w-[680px] px-4 pb-16 pt-6">
        <Outlet />
      </main>
    </div>
  );
}
