import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Download, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createAppBackup,
  downloadAppBackup,
  parseAppBackup,
  restoreAppBackup,
  type BackupPreview,
} from "@/services/backup";

interface BackupEmailDialogProps {
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
}

export function BackupEmailDialog({ aberto, onOpenChange }: BackupEmailDialogProps) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [restaurando, setRestaurando] = useState(false);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [arquivoNome, setArquivoNome] = useState("");
  const [confirmado, setConfirmado] = useState(false);

  const enviar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSalvando(true);

    const janelaEmail = window.open("about:blank", "_blank");
    try {
      const backup = await createAppBackup();
      const filename = downloadAppBackup(backup);
      const subject = encodeURIComponent("Backup do Arranjo de Discursos");
      const body = encodeURIComponent(
        `Olá,\n\nEstou enviando o backup do Arranjo de Discursos, criado em ${new Date(backup.exportedAt).toLocaleString("pt-BR")}.\n\nAnexe a este e-mail o arquivo baixado: ${filename}\n`,
      );
      const mailto = `mailto:${encodeURIComponent(email.trim())}?subject=${subject}&body=${body}`;

      if (janelaEmail) {
        janelaEmail.location.href = mailto;
      } else {
        toast.info("O backup foi baixado. Anexe o arquivo manualmente ao seu e-mail.");
      }
      toast.success("Backup baixado. Anexe o arquivo à mensagem de e-mail antes de enviar.");
      setEmail("");
      onOpenChange(false);
    } catch (error) {
      janelaEmail?.close();
      toast.error(
        error instanceof Error ? error.message : "Não foi possível criar o backup.",
      );
    } finally {
      setSalvando(false);
    }
  };

  const selecionarBackup = async (file?: File) => {
    setPreview(null);
    setArquivoNome("");
    setConfirmado(false);
    if (!file) return;

    try {
      const result = parseAppBackup(await file.text());
      setPreview(result);
      setArquivoNome(file.name);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível ler o arquivo de backup.",
      );
    }
  };

  const restaurar = async () => {
    if (!preview || !confirmado) return;
    setRestaurando(true);
    try {
      await restoreAppBackup(preview.backup);
      await queryClient.invalidateQueries();
      setPreview(null);
      setArquivoNome("");
      setConfirmado(false);
      toast.success("Backup restaurado e mesclado aos dados atuais.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível restaurar o backup.",
      );
    } finally {
      setRestaurando(false);
    }
  };

  return (
    <Dialog
      open={aberto}
      onOpenChange={(novoEstado) => {
        if (!novoEstado && !salvando && !restaurando) onOpenChange(false);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Backup e restauração</DialogTitle>
          <DialogDescription>
            Exporte os dados do aplicativo ou restaure uma cópia salva anteriormente.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={enviar}>
          <div className="space-y-2">
            <h3 className="font-medium">Fazer backup por e-mail</h3>
            <Label htmlFor="backup-email">Enviar para</Label>
            <Input
              id="backup-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seu-email@exemplo.com"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            O backup inclui congregações, irmãos, discursos, cânticos, arranjos e configurações.
            Não inclui senha nem dados de autenticação. Guarde o arquivo e o e-mail em local
            privado.
          </p>
          <Button type="submit" size="lg" className="w-full gap-2" disabled={salvando || restaurando}>
            <Download className="h-4 w-4" />
            {salvando ? "Preparando backup..." : "Baixar e abrir e-mail"}
          </Button>
        </form>

        <div className="space-y-4 border-t pt-4">
          <div>
            <h3 className="font-medium">Restaurar backup</h3>
            <p className="text-sm text-muted-foreground">
              Selecione um arquivo JSON criado pelo aplicativo. A restauração mescla os dados:
              mantém os registros atuais, adiciona os que faltam e preenche campos vazios sem
              substituir informações já preenchidas.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="restore-backup-file">Arquivo de backup</Label>
            <Input
              id="restore-backup-file"
              type="file"
              accept=".json,application/json"
              disabled={salvando || restaurando}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.currentTarget.value = "";
                void selecionarBackup(file);
              }}
            />
          </div>
          {preview && (
            <div className="space-y-3 rounded-md border p-3 text-sm">
              <p className="break-all font-medium">{arquivoNome}</p>
              <p>
                Criado em:{" "}
                {new Date(preview.backup.exportedAt).toLocaleString("pt-BR")}
              </p>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                <li>Congregações: {preview.counts.congregacoes}</li>
                <li>Irmãos: {preview.counts.irmaos}</li>
                <li>Discursos: {preview.counts.discursos}</li>
                <li>Cânticos: {preview.counts.canticos}</li>
                <li>Arranjos: {preview.counts.programacoes}</li>
                <li>Configurações: {preview.counts.configuracoes}</li>
              </ul>
            </div>
          )}
          {preview && (
            <>
              <div className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <p className="text-sm">
                  Os registros que só existem no app serão mantidos. Os que só existem no backup
                  serão adicionados; quando um registro existir nos dois, os campos já preenchidos
                  no app serão preservados e os campos vazios poderão ser completados pelo backup.
                  Sua conta e autorização de acesso não serão alteradas.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="confirm-restore-backup"
                  checked={confirmado}
                  disabled={restaurando}
                  onCheckedChange={(checked) => setConfirmado(checked === true)}
                />
                <Label htmlFor="confirm-restore-backup" className="cursor-pointer leading-5">
                  Entendo que a mesclagem poderá acrescentar registros e preencher campos vazios.
                </Label>
              </div>
              <Button
                type="button"
                variant="destructive"
                className="w-full gap-2"
                disabled={!confirmado || restaurando || salvando}
                onClick={() => void restaurar()}
              >
                <Upload className="h-4 w-4" />
                {restaurando ? "Mesclando backup..." : "Restaurar e mesclar dados"}
              </Button>
            </>
          )}
        </div>

        <div className="border-t pt-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={salvando || restaurando}
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
