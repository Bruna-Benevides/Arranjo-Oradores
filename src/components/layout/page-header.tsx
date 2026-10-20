// Cabeçalho das telas: etiqueta de seção em âmbar, título serifado e subtítulo.

interface PageHeaderProps {
  /** Ex.: "Programação mensal" — aparece em caixa alta com espaçamento. */
  eyebrow: string;
  titulo: string;
  subtitulo?: string;
}

export function PageHeader({ eyebrow, titulo, subtitulo }: PageHeaderProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
        {eyebrow}
      </p>
      <h1 className="font-display text-[2rem] font-semibold leading-tight text-foreground">
        {titulo}
      </h1>
      {subtitulo ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{subtitulo}</p>
      ) : null}
    </div>
  );
}
