// Texto com negrito simples.
//
// As observações do relatório são editáveis pelo usuário e podem conter trechos
// em negrito (por exemplo o telefone de quem recebe o cântico e as imagens).
// Usamos a marcação `**texto**`, que vira <strong> no documento e *texto* no
// texto copiado para o WhatsApp (que usa asteriscos como negrito).

export interface SegmentoTexto {
  texto: string;
  negrito: boolean;
}

/** Quebra uma linha em trechos normais e trechos em negrito. */
export function parseDestaques(linha: string): SegmentoTexto[] {
  const segmentos: SegmentoTexto[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let ultimoIndice = 0;
  let resultado = regex.exec(linha);

  while (resultado !== null) {
    if (resultado.index > ultimoIndice) {
      segmentos.push({
        texto: linha.slice(ultimoIndice, resultado.index),
        negrito: false,
      });
    }
    segmentos.push({ texto: resultado[1], negrito: true });
    ultimoIndice = resultado.index + resultado[0].length;
    resultado = regex.exec(linha);
  }

  if (ultimoIndice < linha.length) {
    segmentos.push({ texto: linha.slice(ultimoIndice), negrito: false });
  }

  return segmentos;
}

/** Converte `**negrito**` para o estilo do WhatsApp (`*negrito*`). */
export function paraWhatsApp(linha: string): string {
  return linha.replace(/\*\*(.+?)\*\*/g, "*$1*");
}

/**
 * Quebra o texto guardado em `configuracoes.observacoes_relatorio` em linhas
 * (uma linha = um marcador), descartando linhas vazias.
 */
export function linhasObservacoes(valor: string | null | undefined): string[] {
  if (!valor) return [];
  return valor
    .split("\n")
    .map((linha) => linha.trim())
    .filter((linha) => linha.length > 0);
}
