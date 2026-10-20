// Rótulos em português usados na interface, num só lugar.

import type { PrivilegioIrmao, TipoArranjo } from "@/types/domain";

export const PRIVILEGIO_LABELS: Record<PrivilegioIrmao, string> = {
  anciao: "Ancião",
  servo_ministerial: "Servo Ministerial",
};

export const PRIVILEGIO_OPCOES: readonly PrivilegioIrmao[] = [
  "anciao",
  "servo_ministerial",
];

/** Nome curto do tipo, usado nas pills e no toggle. */
export const TIPO_LABELS: Record<TipoArranjo, string> = {
  vem: "Quem vem",
  vai: "Quem vai",
};

/** Frase explicativa mostrada no topo do modal de novo arranjo. */
export const TIPO_DESCRICOES: Record<TipoArranjo, string> = {
  vem: "Orador de outra congregação que fará o discurso aqui.",
  vai: "Orador da nossa congregação que fará o discurso em outra congregação.",
};

/**
 * Como o campo de congregação do arranjo se chama em cada tipo: em `vem` a
 * congregação é a de origem do orador visitante; em `vai` é o destino.
 */
export const TIPO_CONGREGACAO_LABEL: Record<TipoArranjo, string> = {
  vem: "Congregação de origem",
  vai: "Congregação de destino",
};

export const TIPO_CONGREGACAO_PLACEHOLDER: Record<TipoArranjo, string> = {
  vem: "Selecione a congregação de origem",
  vai: "Selecione a congregação de destino",
};
