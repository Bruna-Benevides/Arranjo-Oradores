// Cadastro/edição de discurso (número único + tema).

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
import { useSalvarDiscurso } from "@/hooks/use-discursos";
import type { Discurso } from "@/types/domain";

const esquema = z.object({
  numero: z.coerce.number().int("Use um número inteiro.").positive("O número deve ser positivo."),
  tema: z.string().min(1, "Informe o tema."),
});

type ValoresEntrada = z.input<typeof esquema>;
type Valores = z.output<typeof esquema>;

const VALORES_INICIAIS: ValoresEntrada = { numero: "", tema: "" };

interface DiscursoFormDialogProps {
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  discurso?: Discurso | null;
}

export function DiscursoFormDialog({
  aberto,
  onOpenChange,
  discurso,
}: DiscursoFormDialogProps) {
  const salvar = useSalvarDiscurso();

  const { handleSubmit, register, reset, formState } = useForm<ValoresEntrada, unknown, Valores>({
    resolver: zodResolver(esquema),
    defaultValues: VALORES_INICIAIS,
  });

  useEffect(() => {
    if (!aberto) return;
    reset(discurso ? { numero: discurso.numero, tema: discurso.tema } : VALORES_INICIAIS);
  }, [aberto, discurso, reset]);

  const enviar = handleSubmit(async (valores) => {
    try {
      await salvar.mutateAsync({
        id: discurso?.id,
        input: { numero: valores.numero, tema: valores.tema },
      });
      toast.success(discurso ? "Discurso atualizado." : "Discurso cadastrado.");
      onOpenChange(false);
    } catch (excecao) {
      toast.error(excecao instanceof Error ? excecao.message : "Não foi possível salvar o discurso.");
    }
  });

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {discurso ? "Editar discurso" : "Novo discurso"}
          </DialogTitle>
          <DialogDescription>
            O número identifica o discurso e aparece no combobox de tema e no relatório.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={enviar}>
          <div className="space-y-2">
            <Label htmlFor="discurso-numero">Número</Label>
            <Input id="discurso-numero" inputMode="numeric" {...register("numero")} />
            {formState.errors.numero ? (
              <p className="text-sm text-destructive">{formState.errors.numero.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="discurso-tema">Tema</Label>
            <Input id="discurso-tema" {...register("tema")} />
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
