import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { removerInscricaoPush, salvarInscricaoPush } from "@/services/push-subscriptions";

type StatusPush = "checking" | "unsupported" | "disabled" | "enabled" | "working";

function applicationServerKey(publicKey: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (publicKey.length % 4)) % 4);
  const base64 = (publicKey + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const key = new Uint8Array(new ArrayBuffer(raw.length));
  for (let index = 0; index < raw.length; index += 1) {
    key[index] = raw.charCodeAt(index);
  }
  return key;
}

async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) await navigator.serviceWorker.register("/sw.js");
  return navigator.serviceWorker.ready;
}

export function PushNotificationButton() {
  const [status, setStatus] = useState<StatusPush>("checking");

  useEffect(() => {
    let active = true;
    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setStatus("unsupported");
      return;
    }

    void (async () => {
      try {
        const registration = await getServiceWorkerRegistration();
        const subscription = await registration.pushManager.getSubscription();
        if (!active) return;

        if (subscription && Notification.permission === "granted") {
          const { data, error } = await supabase.auth.getUser();
          if (error) throw error;
          if (!data.user) throw new Error("Entre novamente no aplicativo para configurar notificações.");
          await salvarInscricaoPush(data.user.id, subscription);
          if (active) setStatus("enabled");
        } else {
          setStatus("disabled");
        }
      } catch (error) {
        if (active) {
          setStatus("disabled");
          toast.error(
            error instanceof Error
              ? `Não foi possível verificar as notificações: ${error.message}`
              : "Não foi possível verificar as notificações deste aparelho.",
          );
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const alternar = async () => {
    if (status === "working" || status === "checking" || status === "unsupported") return;
    const previousStatus = status;
    setStatus("working");

    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!data.user) throw new Error("Entre novamente no aplicativo para configurar notificações.");

      const registration = await getServiceWorkerRegistration();
      const subscription = await registration.pushManager.getSubscription();

      if (status === "enabled") {
        if (subscription) {
          await removerInscricaoPush(data.user.id, subscription.endpoint);
          const removed = await subscription.unsubscribe();
          if (!removed) throw new Error("O navegador não conseguiu remover a inscrição deste aparelho.");
        }
        setStatus("disabled");
        toast.success("Notificações desativadas neste aparelho.");
        return;
      }

      const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        throw new Error("A chave pública VAPID ainda não foi configurada no ambiente do aplicativo.");
      }
      if (Notification.permission === "denied") {
        throw new Error("Notificações bloqueadas. Altere a permissão nas configurações do navegador.");
      }

      const permission =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Permita as notificações para ativá-las neste aparelho.");
      }

      const inscricao =
        subscription ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey(publicKey),
        }));
      await salvarInscricaoPush(data.user.id, inscricao);
      setStatus("enabled");
      toast.success("Notificações ativadas neste aparelho.");
    } catch (error) {
      setStatus(previousStatus);
      toast.error(error instanceof Error ? error.message : "Não foi possível configurar notificações.");
    }
  };

  const disabled = status === "checking" || status === "working" || status === "unsupported";
  const label =
    status === "enabled"
      ? "Desativar notificações neste aparelho"
      : status === "unsupported"
        ? "Notificações não são compatíveis com este navegador"
        : status === "checking"
          ? "Verificando notificações"
          : "Ativar notificações neste aparelho";
  const Icon = status === "enabled" ? Bell : BellOff;

  return (
    <button
      type="button"
      onClick={() => void alternar()}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-nav-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nav-foreground/50 disabled:opacity-50"
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
