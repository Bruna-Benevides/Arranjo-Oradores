// Menu superior fixo, só com ícones (cada um com tooltip e aria-label).
// A ordem é: Programações, Relatório, Irmãos, Discursos, Cânticos,
// Congregações e, no fim, Sair.

import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Building2,
  CalendarDays,
  Download,
  FileText,
  LogOut,
  UserCheck,
  Users,
} from "lucide-react";
import { NavLink } from "react-router-dom";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { BackupEmailDialog } from "@/components/common/backup-email-dialog";
import { PushNotificationButton } from "@/components/common/push-notification-button";
import { useState } from "react";

interface ItemMenu {
  to: string;
  label: string;
  icon: LucideIcon;
}

const ITENS: ItemMenu[] = [
  { to: "/", label: "Programações", icon: CalendarDays },
  { to: "/relatorio", label: "Relatório", icon: FileText },
  { to: "/irmaos", label: "Irmãos", icon: UserCheck },
  { to: "/discursos", label: "Discursos", icon: BookOpen },
  { to: "/canticos", label: "Cânticos", icon: Users },
  { to: "/congregacoes", label: "Congregações", icon: Building2 },
];

interface TopNavProps {
  onSair: () => void;
}

export function TopNav({ onSair }: TopNavProps) {
  const [backupAberto, setBackupAberto] = useState(false);

  return (
    <header className="no-print sticky top-0 z-40 bg-nav text-nav-foreground shadow-sm">
      <div className="mx-auto flex w-full max-w-[680px] items-center gap-1 px-2 py-1">
        <span
          aria-hidden="true"
          className="ml-1 mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand font-display text-lg font-semibold text-brand-foreground"
        >
          A
        </span>

        <nav aria-label="Seções do app" className="flex flex-1 items-center overflow-x-auto">
          {ITENS.map(({ to, label, icon: Icon }) => (
            <Tooltip key={to}>
              <TooltipTrigger asChild>
                <NavLink
                  to={to}
                  end={to === "/"}
                  aria-label={label}
                  className={({ isActive }) =>
                    cn(
                      "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-lg transition-colors",
                      "hover:bg-nav-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nav-foreground/50",
                      isActive && "bg-nav-foreground/10 after:absolute after:inset-x-2 after:bottom-0 after:h-1 after:rounded-full after:bg-brand",
                    )
                  }
                >
                  <Icon className="h-5 w-5" />
                </NavLink>
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          ))}
        </nav>

        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex" title="Ativar ou desativar notificações neste aparelho">
              <PushNotificationButton />
            </span>
          </TooltipTrigger>
          <TooltipContent>Notificações deste aparelho</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setBackupAberto(true)}
              aria-label="Fazer backup por e-mail"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-nav-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nav-foreground/50"
            >
              <Download className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Fazer backup por e-mail</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onSair}
              aria-label="Sair"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-nav-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nav-foreground/50"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Sair</TooltipContent>
        </Tooltip>
      </div>
      <BackupEmailDialog aberto={backupAberto} onOpenChange={setBackupAberto} />
    </header>
  );
}
