import { useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePinStatus } from "@/hooks/use-pin-session";
import { changePin, verifyPin } from "@/services/pin";
import { PinScreen } from "./pin-screen";
import { usePinSessionContext } from "./pin-session-context";
import { PinSessionProvider } from "./pin-session-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const PIN_FORMAT = /^\d{4,6}$/;

function formatarHora(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

interface FormularioPinProps {
  onDestravado: () => void;
}

function FormularioEntrar({ onDestravado }: FormularioPinProps) {
  const [pin, setPin] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    if (!PIN_FORMAT.test(pin)) {
      setErro("O PIN deve ter de 4 a 6 dígitos.");
      return;
    }

    setEnviando(true);
    setErro(null);
    try {
      const resposta = await verifyPin(pin);
      if (resposta.ok) {
        onDestravado();
        return;
      }
      if (resposta.bloqueado) {
        setErro(
          `Muitas tentativas. Tente novamente depois das ${formatarHora(resposta.bloqueadoAte)}.`,
        );
      } else if (resposta.error === "nao_configurado") {
        setErro("O PIN padrão não foi instalado. Aplique o SQL de configuração do Supabase.");
      } else if (resposta.error && resposta.error !== "pin_invalido") {
        setErro(`Não foi possível validar o PIN (${resposta.error}).`);
      } else {
        const restantes = resposta.tentativasRestantes ?? 0;
        setErro(
          restantes > 0
            ? `PIN incorreto. Tentativas restantes: ${restantes}.`
            : "PIN incorreto.",
        );
      }
      setPin("");
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : "Não foi possível validar o PIN.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={enviar}>
      <div className="space-y-2">
        <Label htmlFor="pin">PIN</Label>
        <Input
          id="pin"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          maxLength={6}
          value={pin}
          onChange={(evento) => setPin(evento.target.value.replace(/\D/g, ""))}
        />
      </div>

      {erro ? <p className="text-sm font-medium text-destructive">{erro}</p> : null}

      <Button type="submit" size="lg" className="w-full" disabled={!PIN_FORMAT.test(pin) || enviando}>
        {enviando ? "Verificando..." : "Entrar"}
      </Button>
    </form>
  );
}

interface AlterarPinDialogProps {
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
}

function AlterarPinDialog({ aberto, onOpenChange }: AlterarPinDialogProps) {
  const [pinAtual, setPinAtual] = useState("");
  const [novoPin, setNovoPin] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    if (!PIN_FORMAT.test(pinAtual) || !PIN_FORMAT.test(novoPin)) {
      setErro("O PIN atual e o novo PIN devem ter de 4 a 6 dígitos.");
      return;
    }
    if (novoPin !== confirmacao) {
      setErro("A confirmação não corresponde ao novo PIN.");
      return;
    }

    setSalvando(true);
    setErro(null);
    try {
      const resposta = await changePin(pinAtual, novoPin);
      if (!resposta.ok) {
        if (resposta.bloqueado) {
          setErro(
            `Muitas tentativas. Tente novamente depois das ${formatarHora(resposta.bloqueadoAte)}.`,
          );
        } else if (resposta.error === "pin_invalido") {
          setErro("O PIN atual está incorreto.");
        } else if (resposta.error === "novo_pin_invalido") {
          setErro("O novo PIN deve ter de 4 a 6 dígitos.");
        } else if (resposta.error && resposta.error !== "pin_invalido") {
          setErro(`Não foi possível alterar o PIN (${resposta.error}).`);
        } else {
          setErro("Não foi possível alterar o PIN.");
        }
        return;
      }

      toast.success("PIN alterado.");
      onOpenChange(false);
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : "Não foi possível alterar o PIN.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog
      open={aberto}
      onOpenChange={(novoEstado) => {
        if (novoEstado) {
          setPinAtual("");
          setNovoPin("");
          setConfirmacao("");
          setErro(null);
        }
        onOpenChange(novoEstado);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Alterar PIN</DialogTitle>
          <DialogDescription>
            Informe o PIN atual e escolha um novo PIN de 4 a 6 dígitos.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={enviar}>
          <div className="space-y-2">
            <Label htmlFor="pin-atual">PIN atual</Label>
            <Input
              id="pin-atual"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              maxLength={6}
              value={pinAtual}
              onChange={(evento) => setPinAtual(evento.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="novo-pin">Novo PIN</Label>
            <Input
              id="novo-pin"
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              maxLength={6}
              value={novoPin}
              onChange={(evento) => setNovoPin(evento.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmar-pin">Confirme o novo PIN</Label>
            <Input
              id="confirmar-pin"
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              maxLength={6}
              value={confirmacao}
              onChange={(evento) => setConfirmacao(evento.target.value.replace(/\D/g, ""))}
            />
          </div>
          {erro ? <p className="text-sm font-medium text-destructive">{erro}</p> : null}
          <div className="space-y-2">
            <Button type="submit" size="lg" className="w-full" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar novo PIN"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PinGateConteudo({ children }: { children: ReactNode }) {
  const { destravado, destravar } = usePinSessionContext();
  const { data, isLoading, isError } = usePinStatus();
  const [alterarAberto, setAlterarAberto] = useState(false);

  if (destravado) return <>{children}</>;

  if (isLoading) {
    return (
      <PinScreen titulo="Acesso dos responsáveis" subtitulo="Verificando o acesso a este app...">
        <div className="h-11 w-full animate-pulse rounded-lg bg-muted" />
      </PinScreen>
    );
  }

  if (isError) {
    return (
      <PinScreen
        titulo="Não foi possível conectar"
        subtitulo="Verifique a URL e a chave pública do Supabase, a conexão e se a função de PIN foi publicada."
      >
        <p className="text-sm text-destructive">
          O app não conseguiu confirmar o acesso ao PIN. Confira a configuração no arquivo
          <code className="mx-1 rounded bg-muted px-1">.env.local</code> e no Supabase.
        </p>
      </PinScreen>
    );
  }

  if (!data?.configurado) {
    return (
      <PinScreen
        titulo="Configuração necessária"
        subtitulo="O PIN padrão ainda não foi instalado no Supabase. Aplique o schema e o seed descritos no README."
      >
        <p className="text-sm text-destructive">
          Não foi encontrado um PIN salvo no banco. Execute o seed do projeto Supabase.
        </p>
      </PinScreen>
    );
  }

  return (
    <PinScreen titulo="Acesso dos responsáveis" subtitulo="Digite o PIN compartilhado para entrar.">
      <FormularioEntrar onDestravado={destravar} />
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="mt-3 w-full"
        onClick={() => setAlterarAberto(true)}
      >
        Alterar PIN
      </Button>
      <AlterarPinDialog aberto={alterarAberto} onOpenChange={setAlterarAberto} />
    </PinScreen>
  );
}

export function PinGate({ children }: { children: ReactNode }) {
  return (
    <PinSessionProvider>
      <PinGateConteudo>{children}</PinGateConteudo>
    </PinSessionProvider>
  );
}
