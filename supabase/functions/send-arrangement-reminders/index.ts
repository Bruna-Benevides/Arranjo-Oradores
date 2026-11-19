import webpush from "web-push";

const TIME_ZONE = "America/Sao_Paulo";
const WEEKDAYS: Record<string, number> = {
  domingo: 0,
  segunda: 1,
  terca: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sabado: 6,
};

interface CongregationRow {
  id: string;
  dia_reuniao: string | null;
}

interface ArrangementRow {
  id: string;
  data: string;
  tipo: "vem" | "vai";
  evento_especial: boolean;
  descricao_evento: string | null;
  orador_nome: string | null;
  discurso: { tema: string } | null;
}

interface AuthorizedUserRow {
  user_id: string;
}

interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  subscription: webpush.PushSubscription;
}

interface DateParts {
  year: number;
  month: number;
  day: number;
}

interface PendingReminder {
  title: string;
  items: string[];
}

function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Segredo obrigatório não configurado: ${name}`);
  return value;
}

function todayInSaoPaulo(now: Date): DateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day") };
}

function targetMonthForReminder(today: DateParts): { year: number; month: number } | null {
  if (today.day < 12 || (today.day - 12) % 7 !== 0) return null;
  const date = new Date(Date.UTC(today.year, today.month, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function meetingWeekday(day: string | null): number | null {
  if (!day) return null;
  const normalized = day
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const weekday = Object.keys(WEEKDAYS).find((name) => normalized.includes(name));
  return weekday ? WEEKDAYS[weekday] : null;
}

function meetingDates(year: number, month: number, weekday: number): string[] {
  const dates: string[] = [];
  const numberOfDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  for (let day = 1; day <= numberOfDays; day += 1) {
    if (new Date(Date.UTC(year, month - 1, day)).getUTCDay() !== weekday) continue;
    dates.push(
      `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    );
  }
  return dates;
}

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function isAllowedPushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return (
      host === "fcm.googleapis.com" ||
      host.endsWith(".push.services.mozilla.com") ||
      host === "web.push.apple.com" ||
      host.endsWith(".notify.windows.com")
    );
  } catch {
    return false;
  }
}

function remindersText(monthName: string, pending: PendingReminder[]): string {
  return [
    `Há pendências na programação de ${monthName}:`,
    ...pending.flatMap(({ title, items }) => [title, ...items.map((item) => `• ${item}`), ""]),
    "Abra o Arranjo de Discursos para completar a programação.",
  ].join("\n");
}

async function supabaseRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const baseUrl = env("SUPABASE_URL").replace(/\/$/, "");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  if (!response.ok) {
    throw new Error(`Supabase respondeu ${response.status}: ${await response.text()}`);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

async function deletePushSubscription(id: string): Promise<void> {
  const params = new URLSearchParams({ id: `eq.${id}` });
  await supabaseRequest<undefined>(`/rest/v1/push_subscriptions?${params}`, {
    method: "DELETE",
  });
}

async function getPendingReminders(
  year: number,
  month: number,
): Promise<PendingReminder[]> {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(endDate).padStart(2, "0")}`;
  const params = new URLSearchParams({
    select: "id,data,tipo,evento_especial,descricao_evento,orador_nome,discurso:discursos(tema)",
    and: `(data.gte.${start},data.lte.${end})`,
  });
  const [congregations, arrangements] = await Promise.all([
    supabaseRequest<CongregationRow[]>(
      "/rest/v1/congregacoes?select=id,dia_reuniao&is_local=eq.true",
    ),
    supabaseRequest<ArrangementRow[]>(`/rest/v1/programacoes?${params.toString()}`),
  ]);
  const localCongregation = congregations[0];
  if (!localCongregation) {
    throw new Error("Nenhuma congregação está marcada como local.");
  }

  const pending: PendingReminder[] = [];
  const weekday = meetingWeekday(localCongregation.dia_reuniao);
  if (weekday === null) {
    pending.push({
      title: "Configure o dia da reunião local",
      items: [
        "O cadastro da congregação local precisa informar um dia da semana, como Domingo, para identificar as reuniões sem arranjo.",
      ],
    });
  } else {
    const expectedDates = meetingDates(year, month, weekday);
    const vem = arrangements.filter((item) => item.tipo === "vem");
    const missingDates = expectedDates.filter(
      (date) => !vem.some((item) => item.data === date),
    );
    if (missingDates.length > 0) {
      pending.push({
        title: "Quem vem: reuniões sem programação",
        items: missingDates.map(formatDate),
      });
    }

    const incompleteVem = vem.filter(
      (item) =>
        !item.evento_especial &&
        (!item.orador_nome?.trim() || !item.discurso?.tema?.trim()),
    );
    if (incompleteVem.length > 0) {
      pending.push({
        title: "Quem vem: arranjos incompletos",
        items: incompleteVem.map(
          (item) => `${formatDate(item.data)} — falta ${missingFields(item)}`,
        ),
      });
    }
  }

  const incompleteVai = arrangements.filter(
    (item) =>
      item.tipo === "vai" &&
      !item.evento_especial &&
      (!item.orador_nome?.trim() || !item.discurso?.tema?.trim()),
  );
  if (incompleteVai.length > 0) {
    pending.push({
      title: "Quem vai: arranjos cadastrados incompletos",
      items: incompleteVai.map(
        (item) => `${formatDate(item.data)} — falta ${missingFields(item)}`,
      ),
    });
  }

  return pending;
}

function missingFields(item: ArrangementRow): string {
  const missing = [];
  if (!item.orador_nome?.trim()) missing.push("orador");
  if (!item.discurso?.tema?.trim()) missing.push("discurso/tema");
  return missing.join(" e ");
}

async function sendPushNotifications(
  monthName: string,
  pending: PendingReminder[],
): Promise<{ sent: number; failed: number; removed: number }> {
  webpush.setVapidDetails(
    env("VAPID_SUBJECT"),
    env("VAPID_PUBLIC_KEY"),
    env("VAPID_PRIVATE_KEY"),
  );

  const users = await supabaseRequest<AuthorizedUserRow[]>(
    "/rest/v1/usuarios_autorizados?select=user_id",
  );
  const subscriptionsByUser = await Promise.all(
    users.map(async ({ user_id }) => {
      const params = new URLSearchParams({
        select: "id,endpoint,subscription",
        user_id: `eq.${user_id}`,
      });
      return supabaseRequest<PushSubscriptionRow[]>(
        `/rest/v1/push_subscriptions?${params}`,
      );
    }),
  );
  const subscriptions = subscriptionsByUser.flat();
  const payload = JSON.stringify({
    title: `Programação de ${monthName}`,
    body: remindersText(monthName, pending),
  });
  let sent = 0;
  let failed = 0;
  let removed = 0;

  for (const row of subscriptions) {
    if (!isAllowedPushEndpoint(row.endpoint)) {
      console.error("Inscrição push removida por usar um endpoint não permitido.");
      await deletePushSubscription(row.id);
      removed += 1;
      continue;
    }

    try {
      await webpush.sendNotification(row.subscription, payload);
      sent += 1;
    } catch (error) {
      const status =
        typeof error === "object" &&
        error !== null &&
        "statusCode" in error &&
        typeof error.statusCode === "number"
          ? error.statusCode
          : undefined;
      if (status === 404 || status === 410) {
        await deletePushSubscription(row.id);
        removed += 1;
        continue;
      }
      failed += 1;
      console.error("Falha ao enviar uma notificação push.", {
        status,
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  }

  return { sent, failed, removed };
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const cronSecret = env("REMINDER_CRON_SECRET");
    if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    let payload: { test?: boolean };
    try {
      payload = (await request.json()) as { test?: boolean };
    } catch {
      return Response.json({ error: "O corpo precisa ser um JSON válido." }, { status: 400 });
    }

    const target = targetMonthForReminder(todayInSaoPaulo(new Date()));
    if (payload.test !== true && !target) {
      return Response.json({ sent: 0, reason: "not-a-reminder-day" });
    }

    const monthName = payload.test === true
      ? "teste"
      : monthLabel(target!.year, target!.month);
    const pending = payload.test === true
      ? [{ title: "Teste de configuração", items: ["As notificações push estão funcionando."] }]
      : await getPendingReminders(target!.year, target!.month);

    if (pending.length === 0) {
      return Response.json({ sent: 0, reason: "no-pending-arrangements" });
    }

    const result = await sendPushNotifications(monthName, pending);
    return Response.json({ ...result, test: payload.test === true, month: monthName });
  } catch (error) {
    console.error("Falha ao enviar lembretes de programação.", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Falha inesperada." },
      { status: 500 },
    );
  }
});
