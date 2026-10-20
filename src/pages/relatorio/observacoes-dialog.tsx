import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSalvarObservacoesRelatorio } from "@/hooks/use-configuracoes";

interface ObservacoesDialogProps {
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  valorAtual: string;
}

export function ObservacoesDialog({
  aberto,
  onOpenChange,
  valorAtual,
}: ObservacoesDialogProps) {
  const [valor, setValor] = useState(valorAtual);
  const salvar = useSalvarObservacoesRelatorio();

  const enviar = async () => {
    try {
      await salvar.mutateAsync(valor);
      toast.success("Observações salvas.");
      onOpenChange(false);
    } catch (excecao) {
      toast.error(excecao instanceof Error ? excecao.message : "Não foi possível salvar.");
    }
  };

  return (
    <Dialog
      open={aberto}
      onOpenChange={(novoEstado) => {
        if (novoEstado) setValor(valorAtual);
        onOpenChange(novoEstado);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Observações do relatório</DialogTitle>
          <DialogDescription>
            Aparecem no fim de todos os documentos. Escreva uma linha por marcador e use
            **asteriscos duplos** para deixar um trecho em negrito.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(evento) => {
            evento.preventDefault();
            void enviar();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="observacoes">Texto das observações</Label>
            <Textarea
              id="observacoes"
              rows={8}
              value={valor}
              onChange={(evento) => setValor(evento.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Button type="submit" size="lg" className="w-full" disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando..." : "Salvar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
