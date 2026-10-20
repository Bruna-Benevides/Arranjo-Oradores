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
import { useBloquearDiscurso } from "@/hooks/use-discursos";
import type { Discurso } from "@/types/domain";

const SUGESTOES = ["tema sensível", "já usado recentemente demais", "fora de uso"];

interface BloqueioDialogProps {
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  discurso: Discurso | null;
}

export function BloqueioDialog({ aberto, onOpenChange, discurso }: BloqueioDialogProps) {
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const bloquear = useBloquearDiscurso();

  const enviar = async () => {
    if (!discurso) return;
    if (motivo.trim().length === 0) {
      setErro("Informe o motivo do bloqueio.");
      return;
    }

    try {
      await bloquear.mutateAsync({ id: discurso.id, motivo });
      toast.success("Discurso bloqueado para novos arranjos.");
      onOpenChange(false);
    } catch (excecao) {
      toast.error(excecao instanceof Error ? excecao.message : "Não foi possível bloquear.");
    }
  };

  return (
    <Dialog
      open={aberto}
      onOpenChange={(novoEstado) => {
        if (novoEstado) {
          setMotivo("");
          setErro(null);
        }
        onOpenChange(novoEstado);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Bloquear discurso</DialogTitle>
          <DialogDescription>
            {discurso ? `${discurso.numero} — ${discurso.tema}. ` : ""}
            O discurso deixa de aparecer para escolha em novos arranjos, mas continua no
            histórico.
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
            <Label htmlFor="motivo-bloqueio">Motivo do bloqueio</Label>
            <Textarea
              id="motivo-bloqueio"
              rows={3}
              value={motivo}
              onChange={(evento) => setMotivo(evento.target.value)}
              placeholder="Ex.: já usado recentemente demais"
            />
            {erro ? <p className="text-sm text-destructive">{erro}</p> : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {SUGESTOES.map((sugestao) => (
              <Button
                key={sugestao}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMotivo(sugestao)}
              >
                {sugestao}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <Button type="submit" size="lg" className="w-full" disabled={bloquear.isPending}>
              {bloquear.isPending ? "Bloqueando..." : "Bloquear"}
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
