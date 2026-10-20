// Diálogo de confirmação de exclusão, reutilizado por todas as listas.

import type { ReactNode } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConfirmDeleteDialogProps {
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  titulo: string;
  descricao: ReactNode;
  onConfirmar: () => void;
  confirmando?: boolean;
}

export function ConfirmDeleteDialog({
  aberto,
  onOpenChange,
  titulo,
  descricao,
  onConfirmar,
  confirmando,
}: ConfirmDeleteDialogProps) {
  return (
    <AlertDialog open={aberto} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-xl border-border bg-card">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-xl">{titulo}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-sm text-muted-foreground">{descricao}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-lg">Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirmar}
            disabled={confirmando}
            className={cn(buttonVariants({ variant: "destructive" }), "rounded-lg")}
          >
            {confirmando ? "Excluindo..." : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
