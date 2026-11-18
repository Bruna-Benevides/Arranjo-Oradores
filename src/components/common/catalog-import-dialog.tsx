import { useId, useState, type ChangeEvent } from "react";
import { Download, FileUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { parseCatalogCsv, type CatalogEntry } from "@/lib/catalog-csv";

interface CatalogImportDialogProps {
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  nomeCatalogo: string;
  itensExistentes: Array<{ numero: number; tema: string }>;
  salvando: boolean;
  onImportar: (
    linhas: CatalogEntry[],
    estatisticas: { novos: number; atualizados: number; iguais: number },
  ) => Promise<void>;
}

function baixarModelo() {
  const arquivo = new Blob(["numero,tema\r\n"], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement("a");
  link.href = url;
  link.download = "modelo-catalogo.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function CatalogImportDialog({
  aberto,
  onOpenChange,
  nomeCatalogo,
  itensExistentes,
  salvando,
  onImportar,
}: CatalogImportDialogProps) {
  const inputId = useId();
  const [linhas, setLinhas] = useState<CatalogEntry[]>([]);
  const [arquivoNome, setArquivoNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const existentes = new Map(itensExistentes.map((item) => [item.numero, item.tema]));
  const atualizados = linhas.filter(
    (linha) => existentes.has(linha.numero) && existentes.get(linha.numero) !== linha.tema,
  ).length;
  const iguais = linhas.filter(
    (linha) => existentes.has(linha.numero) && existentes.get(linha.numero) === linha.tema,
  ).length;
  const novos = linhas.length - atualizados - iguais;

  const limpar = () => {
    setLinhas([]);
    setArquivoNome("");
    setErro(null);
  };

  const selecionarArquivo = async (event: ChangeEvent<HTMLInputElement>) => {
    const arquivo = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!arquivo) return;

    setLinhas([]);
    setArquivoNome(arquivo.name);
    setErro(null);
    try {
      const parsed = parseCatalogCsv(await arquivo.text());
      setLinhas(parsed);
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : "Não foi possível ler o CSV.");
    }
  };

  const importar = async () => {
    try {
      await onImportar(linhas, { novos, atualizados, iguais });
      limpar();
      onOpenChange(false);
    } catch {
      // A tela que iniciou a importação apresenta a mensagem do serviço.
    }
  };

  return (
    <Dialog
      open={aberto}
      onOpenChange={(novoEstado) => {
        if (!novoEstado) limpar();
        onOpenChange(novoEstado);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Importar {nomeCatalogo}</DialogTitle>
          <DialogDescription>
            Importe somente número e tema. Números já cadastrados terão o tema atualizado; letras
            não são aceitas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
            <p className="font-medium">Formato do arquivo</p>
            <p className="mt-1 text-muted-foreground">
              CSV UTF-8 com duas colunas, nesta ordem: <code>numero,tema</code>. São aceitos
              separadores vírgula ou ponto e vírgula.
            </p>
            <Button type="button" variant="link" className="mt-2 h-auto p-0" onClick={baixarModelo}>
              <Download className="mr-1 h-4 w-4" />
              Baixar modelo CSV
            </Button>
          </div>

          <div className="space-y-2">
            <label htmlFor={inputId} className="text-sm font-medium">
              Arquivo CSV
            </label>
            <Input id={inputId} type="file" accept=".csv,text/csv" onChange={selecionarArquivo} />
          </div>

          {arquivoNome ? (
            <p className="text-sm text-muted-foreground">Arquivo: {arquivoNome}</p>
          ) : null}
          {erro ? <p className="text-sm font-medium text-destructive">{erro}</p> : null}

          {linhas.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Prévia: {novos} novos, {atualizados} para atualizar, {iguais} sem alteração
              </p>
              <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-3 text-sm">
                {linhas.slice(0, 8).map((linha) => (
                  <li key={linha.numero}>
                    {linha.numero} — {linha.tema}{" "}
                    <span className="text-muted-foreground">
                      (
                      {!existentes.has(linha.numero)
                        ? "novo"
                        : existentes.get(linha.numero) === linha.tema
                          ? "já igual"
                          : "atualizar tema"}
                      )
                    </span>
                  </li>
                ))}
                {linhas.length > 8 ? (
                  <li className="text-muted-foreground">e mais {linhas.length - 8} registros…</li>
                ) : null}
              </ul>
            </div>
          ) : null}

          <div className="space-y-2">
            <Button
              type="button"
              size="lg"
              className="w-full gap-2"
              disabled={linhas.length === 0 || salvando}
              onClick={() => void importar()}
            >
              <FileUp className="h-4 w-4" />
              {salvando ? "Importando..." : "Importar e atualizar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              disabled={salvando}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
