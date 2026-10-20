// Botões de editar e excluir de uma linha de lista.

import type { ReactNode } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface RowActionsProps {
  onEditar: () => void;
  onExcluir: () => void;
  /** Ação extra (ex.: bloquear/desbloquear um discurso). */
  extra?: ReactNode;
  rotuloEditar?: string;
  rotuloExcluir?: string;
}

export function RowActions({
  onEditar,
  onExcluir,
  extra,
  rotuloEditar = "Editar",
  rotuloExcluir = "Excluir",
}: RowActionsProps) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      {extra}

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={rotuloEditar} onClick={onEditar}>
            <Pencil className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{rotuloEditar}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={rotuloExcluir} onClick={onExcluir}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{rotuloExcluir}</TooltipContent>
      </Tooltip>
    </div>
  );
}
