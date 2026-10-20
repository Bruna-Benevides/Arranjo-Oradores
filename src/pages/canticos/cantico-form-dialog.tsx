// Cadastro/edição de cântico (número único + tema).

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSalvarCantico } from "@/hooks/use-canticos";
import type { Cantico } from "@/types/domain";

const esquema = z.object({
  numero: z.coerce.number().int("Use um número inteiro.").positive("O número deve ser positivo."),
  tema: z.string().min(1, "Informe o tema."),
});

type ValoresEntrada = z.input<typeof esquema>;
type Valores = z.output<typeof esquema>;

const VALORES_INICIAIS: ValoresEntrada = { numero: "", tema: "" };

interface CanticoFormDialogProps {
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  cantico?: Cantico | null;
}

export function CanticoFormDialog({ aberto, onOpenChange, cantico }: CanticoFormDialogProps) {
  const salvar = useSalvarCantico();

  const { handleSubmit, register, reset, formState } = useForm<ValoresEntrada, unknown, Valores>({
    resolver: zodResolver(esquema),
    defaultValues: VALORES_INICIAIS,
  });

  useEffect(() => {
    if (!aberto) return;
    reset(cantico ? { numero: cantico.numero, tema: cantico.tema } : VALORES_INICIAIS);
  }, [aberto, cantico, reset]);

  const enviar = handleSubmit(async (valores) => {
    try {
      await salvar.mutateAsync({
        id: cantico?.id,
        input: { numero: valores.numero, tema: valores.tema },
      });
      toast.success(cantico ? "Cântico atualizado." : "Cântico cadastrado.");
      onOpenChange(false);
    } catch (excecao) {
      toast.error(excecao instanceof Error ? excecao.message : "Não foi possível salvar o cântico.");
    }
  });

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {cantico ? "Editar cântico" : "Novo cântico"}
          </DialogTitle>
          <DialogDescription>Número e tema do cântico.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={enviar}>
          <div className="space-y-2">
            <Label htmlFor="cantico-numero">Número</Label>
            <Input id="cantico-numero" inputMode="numeric" {...register("numero")} />
            {formState.errors.numero ? (
              <p className="text-sm text-destructive">{formState.errors.numero.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cantico-tema">Tema</Label>
            <Input id="cantico-tema" {...register("tema")} />
            {formState.errors.tema ? (
              <p className="text-sm text-destructive">{formState.errors.tema.message}</p>
            ) : null}
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
