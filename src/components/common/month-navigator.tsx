// Navegador de mês ("‹ Outubro 2026 ›"), usado em Programações e no Relatório.

import { ChevronLeft, ChevronRight } from "lucide-react";

interface MonthNavigatorProps {
  /** "Outubro 2026" */
  label: string;
  onPrev: () => void;
  onNext: () => void;
}

export function MonthNavigator({ label, onPrev, onNext }: MonthNavigatorProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card px-2 py-1 shadow-card">
      <button
        type="button"
        onClick={onPrev}
        aria-label="Mês anterior"
        className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <span className="font-display text-lg font-semibold text-foreground">{label}</span>

      <button
        type="button"
        onClick={onNext}
        aria-label="Próximo mês"
        className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
