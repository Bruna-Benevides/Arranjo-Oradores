import type { ReactNode } from "react";

interface EmptyListProps {
  mensagem: string;
  acao?: ReactNode;
}

export function EmptyList({ mensagem, acao }: EmptyListProps) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center">
      <p className="font-display text-lg text-muted-foreground">{mensagem}</p>
      {acao ? <div className="mt-4">{acao}</div> : null}
    </div>
  );
}
