import type { PostgrestError } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";

type CongregacaoRow = Database["public"]["Tables"]["congregacoes"]["Row"];
type IrmaoRow = Database["public"]["Tables"]["irmaos"]["Row"];
type DiscursoRow = Database["public"]["Tables"]["discursos"]["Row"];
type CanticoRow = Database["public"]["Tables"]["canticos"]["Row"];
type ProgramacaoRow = Database["public"]["Tables"]["programacoes"]["Row"];
type ConfiguracaoRow = Database["public"]["Tables"]["configuracoes"]["Row"];

export interface AppBackup {
  format: "arranjo-discursos-backup";
  version: 1;
  exportedAt: string;
  data: {
    congregacoes: CongregacaoRow[];
    irmaos: IrmaoRow[];
    discursos: DiscursoRow[];
    canticos: CanticoRow[];
    programacoes: ProgramacaoRow[];
    configuracoes: ConfiguracaoRow[];
  };
}

export interface BackupPreview {
  backup: AppBackup;
  counts: Record<keyof AppBackup["data"], number>;
}

const PAGE_SIZE = 1000;
const TABELAS_BACKUP = [
  "congregacoes",
  "irmaos",
  "discursos",
  "canticos",
  "programacoes",
  "configuracoes",
] as const satisfies readonly (keyof AppBackup["data"])[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseAppBackup(text: string): BackupPreview {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("O arquivo selecionado não contém JSON válido.");
  }

  if (!isRecord(parsed) || parsed.format !== "arranjo-discursos-backup" || parsed.version !== 1) {
    throw new Error("Este arquivo não é um backup compatível do Arranjo de Discursos.");
  }
  if (
    typeof parsed.exportedAt !== "string" ||
    Number.isNaN(Date.parse(parsed.exportedAt)) ||
    !isRecord(parsed.data)
  ) {
    throw new Error("O arquivo de backup está incompleto ou inválido.");
  }

  for (const tabela of TABELAS_BACKUP) {
    const rows = parsed.data[tabela];
    if (!Array.isArray(rows) || !rows.every(isRecord)) {
      throw new Error(`O backup não contém uma lista válida de ${tabela}.`);
    }
  }

  const backup = parsed as unknown as AppBackup;
  return {
    backup,
    counts: {
      congregacoes: backup.data.congregacoes.length,
      irmaos: backup.data.irmaos.length,
      discursos: backup.data.discursos.length,
      canticos: backup.data.canticos.length,
      programacoes: backup.data.programacoes.length,
      configuracoes: backup.data.configuracoes.length,
    },
  };
}

async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{
    data: T[] | null;
    error: PostgrestError | null;
  }>,
  label: string,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Não foi possível incluir ${label} no backup: ${error.message}`);
    if (!data) throw new Error(`O Supabase não retornou os dados de ${label}.`);
    rows.push(...data);
    if (data.length < PAGE_SIZE) return rows;
  }
}

export async function createAppBackup(): Promise<AppBackup> {
  const [congregacoes, irmaos, discursos, canticos, programacoes, configuracoes] =
    await Promise.all([
      fetchAllRows(
        (from, to) => supabase.from("congregacoes").select("*").order("id").range(from, to),
        "as congregações",
      ),
      fetchAllRows(
        (from, to) => supabase.from("irmaos").select("*").order("id").range(from, to),
        "os irmãos",
      ),
      fetchAllRows(
        (from, to) => supabase.from("discursos").select("*").order("numero").range(from, to),
        "os discursos",
      ),
      fetchAllRows(
        (from, to) => supabase.from("canticos").select("*").order("numero").range(from, to),
        "os cânticos",
      ),
      fetchAllRows(
        (from, to) => supabase.from("programacoes").select("*").order("data").range(from, to),
        "as programações",
      ),
      fetchAllRows(
        (from, to) => supabase.from("configuracoes").select("*").order("chave").range(from, to),
        "as configurações",
      ),
    ]);

  return {
    format: "arranjo-discursos-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    data: { congregacoes, irmaos, discursos, canticos, programacoes, configuracoes },
  };
}

export function downloadAppBackup(backup: AppBackup): string {
  const timestamp = backup.exportedAt.replace(/[:.]/g, "-");
  const filename = `backup-arranjo-discursos-${timestamp}.json`;
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return filename;
}

export async function restoreAppBackup(backup: AppBackup): Promise<void> {
  const payload = JSON.parse(JSON.stringify(backup)) as Json;
  const { error } = await supabase.rpc("restaurar_backup_aplicativo", {
    backup_payload: payload,
  });
  if (error) {
    throw new Error(`Não foi possível restaurar o backup: ${error.message}`);
  }
}
