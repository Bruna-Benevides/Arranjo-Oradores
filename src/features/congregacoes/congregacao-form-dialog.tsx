// Cadastro de congregação.

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDefinirCongregacaoLocal, useSalvarCongregacao } from "@/hooks/use-congregacoes";
import { useCongregacaoLocal } from "@/hooks/use-congregacoes";
import type { Congregacao } from "@/types/domain";

const esquema = z.object({
    nome: z.string().min(1, "Informe o nome."),
    endereco: z.string().nullable(),
    dia_reuniao: z.string().nullable(),
    horario: z.string().nullable(),
    google_maps_url: z.string().nullable(),
    observacoes: z.string().nullable(),
    is_local: z.boolean(),
});

type Valores = z.infer<typeof esquema>;

const VALORES_INICIAIS: Valores = {
    nome: "",
    endereco: "",
    dia_reuniao: "",
    horario: "",
    google_maps_url: "",
    observacoes: "",
    is_local: false,
};

interface CongregacaoFormDialogProps {
    aberto: boolean;
    onOpenChange: (aberto: boolean) => void;
    congregacao?: Congregacao | null;
}

export function CongregacaoFormDialog({
    aberto,
    onOpenChange,
    congregacao,
}: CongregacaoFormDialogProps) {
    const salvar = useSalvarCongregacao();
    const definirLocal = useDefinirCongregacaoLocal();
    const { data: congregacaoLocal } = useCongregacaoLocal();

    const { control, handleSubmit, register, reset, formState } = useForm<Valores>({
        resolver: zodResolver(esquema),
        defaultValues: VALORES_INICIAIS,
    });

    useEffect(() => {
        if (!aberto) return;
        reset(
            congregacao
                ? {
                    nome: congregacao.nome,
                    endereco: congregacao.endereco ?? "",
                    dia_reuniao: congregacao.dia_reuniao ?? "",
                    horario: congregacao.horario ?? "",
                    google_maps_url: congregacao.google_maps_url ?? "",
                    observacoes: congregacao.observacoes ?? "",
                    is_local: congregacao.is_local,
                }
                : VALORES_INICIAIS,
        );
    }, [aberto, congregacao, reset]);

    const enviar = handleSubmit(async (valores) => {
        try {
            const salva = await salvar.mutateAsync({
                id: congregacao?.id,
                input: {
                    nome: valores.nome,
                    endereco: valores.endereco,
                    dia_reuniao: valores.dia_reuniao,
                    horario: valores.horario,
                    google_maps_url: valores.google_maps_url,
                    observacoes: valores.observacoes,
                },
            });

            // A regra "só uma congregação local" é aplicada no banco; aqui apenas
            // marcamos/desmarcamos conforme o checkbox.
            if (valores.is_local || congregacao?.is_local !== valores.is_local) {
                await definirLocal.mutateAsync({ id: salva.id, isLocal: valores.is_local });
            }

            toast.success(congregacao ? "Congregação atualizada." : "Congregação cadastrada.");
            onOpenChange(false);
        } catch (excecao) {
            toast.error(
                excecao instanceof Error ? excecao.message : "Não foi possível salvar a congregação.",
            );
        }
    });

    return (
        <Dialog open={aberto} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="font-display text-xl">
                        {congregacao ? "Editar congregação" : "Nova congregação"}
                    </DialogTitle>
                    <DialogDescription>
                        Os dados da congregação marcada como local aparecem no cabeçalho do documento
                        do relatório.
                    </DialogDescription>
                </DialogHeader>

                <form className="space-y-4" onSubmit={enviar}>
                    <div className="space-y-2">
                        <Label htmlFor="congregacao-nome">Nome</Label>
                        <Input id="congregacao-nome" {...register("nome")} />
                        {formState.errors.nome ? (
                            <p className="text-sm text-destructive">{formState.errors.nome.message}</p>
                        ) : null}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="congregacao-endereco">Endereço</Label>
                        <Textarea id="congregacao-endereco" {...register("endereco")} />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="congregacao-dia">Dia da reunião</Label>
                            <Input id="congregacao-dia" placeholder="Domingo" {...register("dia_reuniao")} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="congregacao-horario">Horário da reunião</Label>
                            <Input id="congregacao-horario" placeholder="Domingo às 9h" {...register("horario")} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="congregacao-link">Link do endereço do Salão do Reino</Label>
                        <Input
                            id="congregacao-link"
                            placeholder="https://maps.app.goo.gl/..."
                            {...register("google_maps_url")}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="congregacao-observacoes">Observações</Label>
                        <Textarea id="congregacao-observacoes" {...register("observacoes")} />
                    </div>

                    <Controller
                        control={control}
                        name="is_local"
                        render={({ field }) => (
                            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-field px-3 py-3">
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={(valor) => field.onChange(valor === true)}
                                />
                                <span className="text-sm">
                                    É a congregação local (a do responsável pelo arranjo)
                                    {congregacaoLocal && congregacaoLocal.id !== congregacao?.id ? (
                                        <span className="block text-xs text-muted-foreground">
                                            Hoje é {congregacaoLocal.nome}; marcar aqui troca a congregação local.
                                        </span>
                                    ) : null}
                                </span>
                            </label>
                        )}
                    />

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
