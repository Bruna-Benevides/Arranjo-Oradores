// Cadastro de irmão (orador). O mesmo diálogo é usado na página Irmãos e,
// como atalho, dentro do modal de novo arranjo ("+ Adicionar novo irmão").

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { EntityCombobox } from "@/components/common/entity-combobox";
import { PhoneInput } from "@/components/common/phone-input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCongregacoes } from "@/hooks/use-congregacoes";
import { useSalvarIrmao } from "@/hooks/use-irmaos";
import { PRIVILEGIO_LABELS, PRIVILEGIO_OPCOES } from "@/lib/labels";
import type { Irmao } from "@/types/domain";

const SEM_PRIVILEGIO = "nenhum";

const esquema = z.object({
  nome: z.string().min(1, "Informe o nome."),
  congregacao_id: z.string().min(1, "Selecione a congregação."),
  privilegio: z.enum(["anciao", "servo_ministerial"]).nullable(),
  telefone: z.string().nullable(),
  observacoes: z.string().nullable(),
});

type Valores = z.infer<typeof esquema>;

const VALORES_INICIAIS: Valores = {
  nome: "",
  congregacao_id: "",
  privilegio: null,
  telefone: "",
  observacoes: "",
};

interface IrmaoFormDialogProps {
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  /** Preenchido = edição; vazio = novo cadastro. */
  irmao?: Irmao | null;
  /** Chamado após salvar (o arranjo usa para já selecionar o irmão). */
  onSalvo?: (irmao: Irmao) => void;
}

export function IrmaoFormDialog({
  aberto,
  onOpenChange,
  irmao,
  onSalvo,
}: IrmaoFormDialogProps) {
  const { data: congregacoes = [] } = useCongregacoes();
  const salvar = useSalvarIrmao();

  const { control, handleSubmit, register, reset, formState } = useForm<Valores>({
    resolver: zodResolver(esquema),
    defaultValues: VALORES_INICIAIS,
  });

  // Recarrega os valores sempre que o diálogo abre.
  useEffect(() => {
    if (!aberto) return;
    reset(
      irmao
        ? {
            nome: irmao.nome,
            congregacao_id: irmao.congregacao_id ?? "",
            privilegio:
              irmao.privilegio === "anciao" || irmao.privilegio === "servo_ministerial"
                ? irmao.privilegio
                : null,
            telefone: irmao.telefone ?? "",
            observacoes: irmao.observacoes ?? "",
          }
        : VALORES_INICIAIS,
    );
  }, [aberto, irmao, reset]);

  const enviar = handleSubmit(async (valores) => {
    try {
      const salvo = await salvar.mutateAsync({
        id: irmao?.id,
        input: {
          nome: valores.nome,
          congregacao_id: valores.congregacao_id,
          privilegio: valores.privilegio,
          telefone: valores.telefone,
          observacoes: valores.observacoes,
        },
      });
      toast.success(irmao ? "Irmão atualizado." : "Irmão cadastrado.");
      onSalvo?.(salvo);
      onOpenChange(false);
    } catch (excecao) {
      toast.error(excecao instanceof Error ? excecao.message : "Não foi possível salvar o irmão.");
    }
  });

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {irmao ? "Editar irmão" : "Novo irmão"}
          </DialogTitle>
          <DialogDescription>
            Orador cadastrado para os arranjos. A congregação e o telefone aparecem como
            sugestão ao montar um arranjo.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={enviar}>
          <div className="space-y-2">
            <Label htmlFor="irmao-nome">Nome</Label>
            <Input id="irmao-nome" {...register("nome")} />
            {formState.errors.nome ? (
              <p className="text-sm text-destructive">{formState.errors.nome.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="irmao-congregacao">Congregação</Label>
            <Controller
              control={control}
              name="congregacao_id"
              render={({ field }) => (
                <EntityCombobox
                  id="irmao-congregacao"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Selecione a congregação"
                  groups={[
                    {
                      options: congregacoes.map((congregacao) => ({
                        value: congregacao.id,
                        label: congregacao.nome,
                      })),
                    },
                  ]}
                />
              )}
            />
            {formState.errors.congregacao_id ? (
              <p className="text-sm text-destructive">
                {formState.errors.congregacao_id.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="irmao-privilegio">Privilégio</Label>
            <Controller
              control={control}
              name="privilegio"
              render={({ field }) => (
                <Select
                  value={field.value ?? SEM_PRIVILEGIO}
                  onValueChange={(valor) =>
                    field.onChange(valor === SEM_PRIVILEGIO ? null : valor)
                  }
                >
                  <SelectTrigger id="irmao-privilegio" className="h-11 rounded-lg bg-field">
                    <SelectValue placeholder="Não informado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SEM_PRIVILEGIO}>Não informado</SelectItem>
                    {PRIVILEGIO_OPCOES.map((valor) => (
                      <SelectItem key={valor} value={valor}>
                        {PRIVILEGIO_LABELS[valor]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="irmao-telefone">Telefone</Label>
            <Controller
              control={control}
              name="telefone"
              render={({ field }) => (
                <PhoneInput
                  id="irmao-telefone"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="irmao-observacoes">Observações</Label>
            <Textarea id="irmao-observacoes" {...register("observacoes")} />
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