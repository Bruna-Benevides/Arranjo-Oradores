// Documento do relatório: um por congregação.
//
// O mesmo markup serve para a tela e para a impressão/PDF — a escala menor em
// A4 e a quebra de página são aplicadas em `src/index.css` (@media print),
// através das classes .print-doc e .print-page.

import { formatDayMonth } from "@/lib/date";
import { parseDestaques } from "@/lib/rich-text";
import {
  getNumeroArranjo,
  getTemaArranjo,
  type ArranjoDetalhado,
  type Congregacao,
  type GrupoRelatorio,
} from "@/types/domain";

interface ReportDocumentProps {
  /** "OUTUBRO 2026" */
  mesLabelUpper: string;
  /** A congregação do responsável pelo arranjo (cabeçalho do documento). */
  congregacaoLocal: Congregacao | null;
  grupo: GrupoRelatorio;
  observacoes: string[];
  incluirContato: boolean;
}

function celulaOradores(arranjo: ArranjoDetalhado): string {
  if (arranjo.evento_especial) return "—";
  return arranjo.orador_nome ?? "—";
}

function celulaTema(arranjo: ArranjoDetalhado): string {
  if (arranjo.evento_especial) return arranjo.descricao_evento ?? "Evento especial";
  return getTemaArranjo(arranjo) ?? "—";
}

export function ReportDocument({
  mesLabelUpper,
  congregacaoLocal,
  grupo,
  observacoes,
  incluirContato,
}: ReportDocumentProps) {
  return (
    <article className="print-doc print-page mx-auto w-full max-w-[780px] rounded-xl border border-border bg-card p-6 text-[15px] leading-relaxed text-foreground shadow-doc">
      <div className="print-doc-title border border-foreground/70 bg-doc px-4 py-4 text-center font-bold uppercase tracking-wide text-doc-foreground">
        Arranjo de discurso para o mês de {mesLabelUpper}
      </div>

      <hr className="my-6 border-foreground/30" />

      {congregacaoLocal ? (
        <div className="space-y-1">
          <p className="font-bold">{congregacaoLocal.nome}</p>
          {congregacaoLocal.horario ? (
            <p>
              <strong>Horário da Reunião:</strong> {congregacaoLocal.horario}
            </p>
          ) : null}
          {congregacaoLocal.endereco ? (
            <>
              <p className="font-bold">Endereço:</p>
              <p>{congregacaoLocal.endereco}</p>
            </>
          ) : null}
          {congregacaoLocal.google_maps_url ? (
            <>
              <p className="font-bold">Link do endereço do Salão do Reino:</p>
              <a
                className="doc-link"
                href={congregacaoLocal.google_maps_url}
                target="_blank"
                rel="noreferrer"
              >
                {congregacaoLocal.google_maps_url}
              </a>
            </>
          ) : null}
        </div>
      ) : (
        <p className="text-muted-foreground">
          Cadastre a congregação local para que os dados dela apareçam aqui.
        </p>
      )}

      <hr className="my-6 border-foreground/30" />

      <p className="font-bold uppercase">
        Congregação : <span className="underline">{grupo.congregacaoNome}</span>
      </p>

      <table className="print-doc-table mt-3 w-full border-collapse border border-foreground/70 text-[14px]">
        <thead>
          <tr className="bg-doc text-left font-bold uppercase text-doc-foreground">
            <th className="border border-foreground/70 px-2 py-1 font-bold">Data:</th>
            <th className="border border-foreground/70 px-2 py-1 font-bold">Oradores:</th>
            <th className="border border-foreground/70 px-2 py-1 font-bold">Nº</th>
            <th className="border border-foreground/70 px-2 py-1 font-bold">Tema:</th>
            {incluirContato ? (
              <th className="border border-foreground/70 px-2 py-1 font-bold">Contato</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {grupo.arranjos.map((arranjo) => (
            <tr key={arranjo.id} className="align-top">
              <td className="border border-foreground/70 px-2 py-1">
                {formatDayMonth(arranjo.data)}
              </td>
              <td className="border border-foreground/70 px-2 py-1">
                {celulaOradores(arranjo)}
              </td>
              <td className="border border-foreground/70 px-2 py-1">
                {arranjo.evento_especial ? "—" : (getNumeroArranjo(arranjo) ?? "—")}
              </td>
              <td className="border border-foreground/70 px-2 py-1">{celulaTema(arranjo)}</td>
              {incluirContato ? (
                <td className="border border-foreground/70 px-2 py-1">
                  {arranjo.orador_telefone ?? "—"}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>

      {observacoes.length > 0 ? (
        <>
          <hr className="my-6 border-foreground/30" />
          <ul className="list-disc space-y-1 pl-6">
            {observacoes.map((observacao) => (
              <li key={observacao}>
                {parseDestaques(observacao).map((segmento, indice) =>
                  segmento.negrito ? (
                    <strong key={indice}>{segmento.texto}</strong>
                  ) : (
                    <span key={indice}>{segmento.texto}</span>
                  ),
                )}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </article>
  );
}
