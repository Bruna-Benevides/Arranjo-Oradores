import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { AccessScreen } from "./access-screen";

type AccessState = "checking" | "allowed" | "denied" | "error";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError("Não foi possível entrar. Confira o e-mail e a senha.");
      }
    } catch {
      setError("Não foi possível entrar. Confira o e-mail e a senha.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="space-y-2">
        <Label htmlFor="login-email">E-mail</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="login-password">Senha</Label>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState(false);
  const [accessState, setAccessState] = useState<AccessState>("checking");
  const [signOutError, setSignOutError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setSessionLoading(false);
      setSessionError(false);
    });

    void (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!active) return;
        setSession(data.session);
        setSessionError(Boolean(error));
      } catch {
        if (active) setSessionError(true);
      } finally {
        if (active) setSessionLoading(false);
      }
    })();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session) {
      setAccessState("denied");
      return;
    }

    let active = true;
    setAccessState("checking");

    void (async () => {
      try {
        const { data, error } = await supabase
          .from("usuarios_autorizados")
          .select("user_id")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (active) setAccessState(error ? "error" : data ? "allowed" : "denied");
      } catch {
        if (active) setAccessState("error");
      }
    })();

    return () => {
      active = false;
    };
  }, [session, sessionLoading]);

  const sair = async () => {
    setSignOutError(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) setSignOutError("Não foi possível encerrar a sessão. Tente novamente.");
    } catch {
      setSignOutError("Não foi possível encerrar a sessão. Tente novamente.");
    }
  };

  if (sessionLoading || accessState === "checking") {
    return (
      <AccessScreen titulo="Acesso seguro" subtitulo="Verificando sua conta autorizada...">
        <div className="h-11 w-full animate-pulse rounded-lg bg-muted" />
      </AccessScreen>
    );
  }

  if (sessionError || accessState === "error") {
    return (
      <AccessScreen
        titulo="Não foi possível conectar"
        subtitulo="Verifique a conexão e as configurações do Supabase."
      >
        <Button className="w-full" onClick={() => window.location.reload()}>
          Tentar novamente
        </Button>
      </AccessScreen>
    );
  }

  if (!session) {
    return (
      <AccessScreen
        titulo="Acesso dos responsáveis"
        subtitulo="Entre com o e-mail e a senha autorizados para este aplicativo."
      >
        <LoginForm />
      </AccessScreen>
    );
  }

  if (accessState === "denied") {
    return (
      <AccessScreen
        titulo="Conta sem autorização"
        subtitulo="Esta conta ainda não foi autorizada para acessar os dados do aplicativo."
      >
        {signOutError ? (
          <p className="mb-3 text-sm font-medium text-destructive">{signOutError}</p>
        ) : null}
        <Button className="w-full" variant="outline" onClick={() => void sair()}>
          Sair
        </Button>
      </AccessScreen>
    );
  }

  return <>{children}</>;
}
