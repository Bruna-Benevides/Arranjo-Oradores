// Modal de novo arranjo / edição de arranjo.
//
// Regras de negócio que valem a pena destacar:
//  - Evento especial: some com Tema/Orador/Telefone e pede só a descrição
//    (visita do superintendente, assembleia...). O banco tem CHECK para isso.
//  - Ao escolher um orador cadastrado, preenchemos nome, telefone e congregação
//    como SUGESTÃO: tudo continua editável à mão.
//  - A congregação só é preenchida automaticamente no tipo "vem", porque ali o
//    irmão é de outra congregação (a de ORIGEM). No tipo "vai" o orador é da
//    nossa congregação, então quem define o destino é você.
//  - Salvar já confirma o compromisso (não há etapa de confirmação).

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { startOfMonth } from "date-fns";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { EntityCombobox } from "@/components/common/entity-combobox";
import { PhoneInput } from "@/components/common/phone-input";
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
import { IrmaoFormDialog } from "@/features/irmaos/irmao-form-dialog";
import { useCongregacoes } from "@/hooks/use-congregacoes";
import { useDiscursosComHistorico } from "@/hooks/use-discursos";
import { useIrmaos } from "@/hooks/use-irmaos";
import { useSalvarArranjo } from "@/hooks/use-programacoes-mes";
import { monthKey, toISODate, todayISO } from "@/lib/date";
import {
  TIPO_CONGREGACAO_LABEL,
  TIPO_CONGREGACAO_PLACEHOLDER,
  TIPO_DESCRICOES,
  TIPO_LABELS,
} from "@/lib/labels";
import type { ArranjoDetalhado, Irmao, TipoArranjo } from "@/types/domain";
import { DiscursoCombobox } from "./discurso-combobox";
import { OradorCombobox } from "./orador-combobox";

const esquema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida."),
  evento_especial: z.boolean(),
  discurso_id: z.string().nullable(),
  orador_id: z.string().nullable(),
  orador_nome: z.string(),
  orador_telefone: z.string(),
  congregacao_id: z.string().nullable(),
  descricao_evento: z.string(),
});

type Valores = z.infer<typeof esquema>;

const VALORES_INICIAIS: Valores = {
  data: "",
  evento_especial: false,
  discurso_id: null,
  orador_id: null,
  orador_nome: "",
  orador_telefone: "",
  congregacao_id: null,
  descricao_evento: "",
};

interface ArrangementFormDialogProps {
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  tipo: TipoArranjo;
  /** Mês aberto na tela: define a data sugerida de um novo arranjo. */
  mesDate: Date;
  /** Preenchido = edição. */
  arranjo?: ArranjoDetalhado | null;
}

export function ArrangementFormDialog({
  aberto,
  onOpenChange,
  tipo,
  mesDate,
  arranjo,
}: ArrangementFormDialogProps) {
  const [novoIrmaoAberto, setNovoIrmaoAberto] = useState(false);

  const { data: congregacoes = [] } = useCongregacoes();
  const { data: irmaos = [] } = useIrmaos();
  const { data: discursos = [] } = useDiscursosComHistorico();
  const salvar = useSalvarArranjo();

  const { control, handleSubmit, register, reset, setError, setValue, watch, formState } =
    useForm<Valores>({ resolver: zodResolver(esquema), defaultValues: VALORES_INICIAIS });

  const eventoEspecial = watch("evento_especial");

  /** Data sugerida: hoje, se o mês aberto for o atual; senão, o dia 1º do mês. */
  const dataSugerida = (): string => {
    const hoje = todayISO();
    return hoje.startsWith(monthKey(mesDate)) ? hoje : toISODate(startOfMonth(mesDate));
  };

  useEffect(() => {
    if (!aberto) return;
    reset(
      arranjo
        ? {
            data: arranjo.data,
            evento_especial: arranjo.evento_especial,
            discurso_id: arranjo.discurso_id,
            orador_id: arranjo.orador_id,
            orador_nome: arranjo.orador_nome ?? "",
            orador_telefone: arranjo.orador_telefone ?? "",
            congregacao_id: arranjo.congregacao_id,
            descricao_evento: arranjo.descricao_evento ?? "",
          }
        : { ...VALORES_INICIAIS, data: dataSugerida() },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, arranjo, reset, mesDate]);

  /** Preenche nome, telefone e (só no tipo "vem") a congregação de origem. */
  const aplicarIrmao = (irmao: Irmao) => {
    setValue("orador_id", irmao.id);
    setValue("orador_nome", irmao.nome);
    setValue("orador_telefone", irmao.telefone ?? "");
    if (tipo === "vem" && irmao.congregacao_id) {
      setValue("congregacao_id", irmao.congregacao_id);
    }
  };

  const enviar = handleSubmit(async (valores) => {
    // As exigências mudam conforme o evento especial, por isso a checagem
    // condicional fica aqui (e não no formato do zod).
    if (valores.evento_especial) {
      if (!valores.descricao_evento.trim()) {
        setError("descricao_evento", { message: "Descreva o evento." });
        return;
      }
    } else {
      if (!valores.discurso_id) {
        setError("discurso_id", { message: "Escolha o tema." });
        return;
      }
      if (!valores.orador_nome.trim()) {
        setError("orador_nome", { message: "Informe o nome do orador." });
        return;
      }

      const congregacaoLocal = congregacoes.find((congregacao) => congregacao.is_local);
      if (!congregacaoLocal) {
        setError("congregacao_id", { message: "Defina a congregação local antes de salvar." });
        return;
      }

      const congregacaoSelecionada = congregacoes.find(
        (congregacao) => congregacao.id === valores.congregacao_id,
      );
      if (!congregacaoSelecionada) {
        setError("congregacao_id", { message: "Selecione a congregação." });
        return;
      }
      if (congregacaoSelecionada.is_local) {
        setError("congregacao_id", {
          message: "Selecione uma congregação diferente da local.",
        });
        return;
      }

      const irmaoSelecionado = irmaos.find((irmao) => irmao.id === valores.orador_id);
      if (valores.orador_id && !irmaoSelecionado) {
        setError("orador_id", { message: "O irmão selecionado não está mais cadastrado." });
        return;
      }
      if (irmaoSelecionado) {
        const congregacaoDoIrmao = congregacoes.find(
          (congregacao) => congregacao.id === irmaoSelecionado.congregacao_id,
        );
        if (tipo === "vem") {
          if (congregacaoDoIrmao?.is_local) {
            setError("orador_id", {
              message: 'Em "Quem vem", o orador deve ser de outra congregação.',
            });
            return;
          }
          if (irmaoSelecionado.congregacao_id !== valores.congregacao_id) {
            setError("congregacao_id", {
              message: "A congregação de origem deve ser a do irmão selecionado.",
            });
            return;
          }
        } else if (!congregacaoDoIrmao?.is_local) {
          setError("orador_id", {
            message: 'Em "Quem vai", o orador cadastrado deve ser da congregação local.',
          });
          return;
        }
      }
    }

    try {
      await salvar.mutateAsync({
        id: arranjo?.id,
        input: {
          data: valores.data,
          tipo,
          discurso_id: valores.discurso_id,
          orador_id: valores.orador_id,
          orador_nome: valores.orador_nome,
          orador_telefone: valores.orador_telefone,
          congregacao_id: valores.congregacao_id,
          evento_especial: valores.evento_especial,
          descricao_evento: valores.descricao_evento,
        },
      });
      toast.success(arranjo ? "Arranjo atualizado." : "Arranjo salvo.");
      onOpenChange(false);
    } catch (excecao) {
      toast.error(excecao instanceof Error ? excecao.message : "Não foi possível salvar.");
    }
  });

  return (
    <>
      <Dialog open={aberto} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {arranjo ? "Editar arranjo" : "Novo arranjo"} · {TIPO_LABELS[tipo]}
            </DialogTitle>
            <DialogDescription>{TIPO_DESCRICOES[tipo]}</DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={enviar}>
            <div className="space-y-2">
              <Label htmlFor="arranjo-data">Data</Label>
              <Input id="arranjo-data" type="date" {...register("data")} />
              {formState.errors.data ? (
                <p className="text-sm text-destructive">{formState.errors.data.message}</p>
              ) : null}
            </div>

            <Controller
              control={control}
              name="evento_especial"
              render={({ field }) => (
                <label className="flex cursor-pointer items-center gap-3">
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(valor) => field.onChange(valor === true)}
                  />
                  <span className="text-sm font-medium">Evento especial (sem orador)</span>
                </label>
              )}
            />

            {eventoEspecial ? (
              <div className="space-y-2">
                <Label htmlFor="arranjo-evento">Descrição do evento</Label>
                <Textarea
                  id="arranjo-evento"
                  placeholder="Visita do superintendente de circuito, assembleia..."
                  {...register("descricao_evento")}
                />
                {formState.errors.descricao_evento ? (
                  <p className="text-sm text-destructive">
                    {formState.errors.descricao_evento.message}
                  </p>
                ) : null}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="arranjo-tema">Tema</Label>
                  <Controller
                    control={control}
                    name="discurso_id"
                    render={({ field }) => (
                      <DiscursoCombobox
                        id="arranjo-tema"
                        value={field.value}
                        onChange={field.onChange}
                        discursos={discursos}
                      />
                    )}
                  />
                  {formState.errors.discurso_id ? (
                    <p className="text-sm text-destructive">
                      {formState.errors.discurso_id.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="arranjo-orador-cadastrado">Orador cadastrado</Label>
                  <Controller
                    control={control}
                    name="orador_id"
                    render={({ field }) => (
                      <OradorCombobox
                        id="arranjo-orador-cadastrado"
                        value={field.value}
                        onChange={(irmaoId) => {
                          const irmao = irmaos.find((item) => item.id === irmaoId);
                          if (irmao) aplicarIrmao(irmao);
                        }}
                        irmaos={irmaos}
                        congregacoes={congregacoes}
                        onAdicionarNovo={() => setNovoIrmaoAberto(true)}
                      />
                    )}
                  />
                  {formState.errors.orador_id ? (
                    <p className="text-sm text-destructive">
                      {formState.errors.orador_id.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="arranjo-orador">Nome do orador</Label>
                  <Input id="arranjo-orador" {...register("orador_nome")} />
                  {formState.errors.orador_nome ? (
                    <p className="text-sm text-destructive">
                      {formState.errors.orador_nome.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="arranjo-telefone">Telefone</Label>
                  <Controller
                    control={control}
                    name="orador_telefone"
                    render={({ field }) => (
                      <PhoneInput
                        id="arranjo-telefone"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="arranjo-congregacao">{TIPO_CONGREGACAO_LABEL[tipo]}</Label>
              <Controller
                control={control}
                name="congregacao_id"
                render={({ field }) => (
                  <EntityCombobox
                    id="arranjo-congregacao"
                    value={field.value}
                    onChange={field.onChange}
                    placeholder={TIPO_CONGREGACAO_PLACEHOLDER[tipo]}
                    groups={[
                      {
                        options: congregacoes.map((congregacao) => ({
                          value: congregacao.id,
                          label: congregacao.nome,
                          description: congregacao.endereco ?? undefined,
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

            <div className="space-y-2 border-t border-border pt-4">
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

      {/* Atalho para cadastrar um irmão sem sair do arranjo */}
      <IrmaoFormDialog
        aberto={novoIrmaoAberto}
        onOpenChange={setNovoIrmaoAberto}
        onSalvo={aplicarIrmao}
      />
    </>
  );
}
