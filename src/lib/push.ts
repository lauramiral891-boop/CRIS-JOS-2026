/* Notificações do sistema: na barra de notificações do Android/iPhone (como o WhatsApp),
   com permissão pedida ao utilizador. App instalada (Capacitor) usa notificações nativas;
   no navegador/PWA usa as notificações web. */

type Cap = { isNativePlatform?: () => boolean; getPlatform?: () => string };
const cap = (): Cap | undefined => (typeof window !== "undefined" ? (window as unknown as { Capacitor?: Cap }).Capacitor : undefined);
export const isNative = () => !!cap()?.isNativePlatform?.();

type Perm = NotificationPermission | "unsupported";
let nativePerm: NotificationPermission = "default";

const ln = async () => { const P = (await import("@capacitor/local-notifications")).LocalNotifications; return new Proxy({} as typeof P, { get: (_t, k) => (k === "then" ? undefined : (...a: unknown[]) => (P as unknown as Record<string, (...x: unknown[]) => unknown>)[k as string](...a)) }); };
const mapPerm = (d: string): NotificationPermission => (d === "granted" ? "granted" : d === "denied" ? "denied" : "default");

export const CH_ALERT = "cj-alertas";
export const CH_GENERAL = "cj-geral";

/** Chamar uma vez ao abrir a app: lê a permissão e cria os canais do Android. */
export async function initNotifications() {
  if (!isNative()) return;
  try {
    const L = await ln();
    nativePerm = mapPerm((await L.checkPermissions()).display);
    if (cap()?.getPlatform?.() === "android") {
      await L.createChannel({ id: CH_ALERT, name: "Alertas (tempo esgotado)", description: "Fim de sessões e avisos urgentes", importance: 5, visibility: 1, vibration: true, lights: true });
      await L.createChannel({ id: CH_GENERAL, name: "Avisos da Game House", description: "Vendas, reservas, relatórios e avisos da CJ", importance: 4, visibility: 1, vibration: true });
    }
  } catch { /* a app continua utilizável mesmo se o sistema bloquear notificações */ }
}

export const notifSupported = () => isNative() || (typeof window !== "undefined" && "Notification" in window);
export const notifPermission = (): Perm => (isNative() ? nativePerm : typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported");

/** Tem de ser chamado a partir de um toque do utilizador. No Android 13+ abre o pedido «Permitir notificações». */
export async function askNotifPermission(): Promise<Perm> {
  if (isNative()) {
    try {
      const L = await ln();
      const before = await L.checkPermissions();
      nativePerm = mapPerm(before.display);
      if (nativePerm !== "granted") nativePerm = mapPerm((await L.requestPermissions()).display);
    } catch { /* mostrar a situação nas definições, sem interromper o utilizador com alertas */ }
    return nativePerm;
  }
  if (!notifSupported()) return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

const nid = (n: number) => Math.abs(Math.floor(n % 2147483000)) || 1;
let counter = 0;

export async function systemNotify(title: string, body?: string, tag?: string, urgent = false) {
  const brandedTitle = title.startsWith("CJ Gerenciamento") ? title : `CJ Gerenciamento • ${title}`;
  if (isNative()) {
    if (nativePerm !== "granted") return false;
    try {
      const L = await ln();
      await L.schedule({ notifications: [{ id: tag ? nid(tag.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) : nid(Date.now() + counter++), title: brandedTitle, body: body ?? "", channelId: urgent ? CH_ALERT : CH_GENERAL }] });
      return true;
    } catch { return false; }
  }
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return false;
  const opts: NotificationOptions & { vibrate?: number[]; renotify?: boolean } = {
    body, tag, icon: "./icon-192.png", badge: "./icon-192.png",
    vibrate: urgent ? [300, 150, 300, 150, 600] : [120, 60, 120],
    renotify: !!tag, requireInteraction: urgent,
  };
  try {
    const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) { await reg.showNotification(brandedTitle, opts); return true; }
    new Notification(brandedTitle, opts);
    return true;
  } catch {
    return false;
  }
}

/* ---- Alarmes agendados: o telemóvel avisa na hora certa mesmo com a app fechada ---- */
export interface DueAlarm { id: number; at: number; title: string; body: string }
const SCHEDULED_KEY = "cjg-scheduled-alarm-ids";
const scheduled = new Set<number>(readScheduled());
function readScheduled(): number[] {
  try { const v = JSON.parse(localStorage.getItem(SCHEDULED_KEY) ?? "[]"); return Array.isArray(v) ? v.filter((n) => Number.isInteger(n)) : []; }
  catch { return []; }
}
function saveScheduled() {
  try { localStorage.setItem(SCHEDULED_KEY, JSON.stringify([...scheduled])); } catch { /* opcional */ }
}

export async function syncAlarms(list: DueAlarm[]) {
  if (!isNative() || nativePerm !== "granted") return;
  try {
    const L = await ln();
    const keep = new Set(list.map((a) => nid(a.id)));
    const stale = [...scheduled].filter((i) => !keep.has(i));
    if (stale.length) await L.cancel({ notifications: stale.map((id) => ({ id })) });
    stale.forEach((id) => scheduled.delete(id));
    saveScheduled();
    const future = list.filter((a) => a.at > Date.now() + 1000);
    if (future.length) {
      await L.schedule({
        notifications: future.map((a) => ({
          id: nid(a.id), title: a.title.startsWith("CJ Gerenciamento") ? a.title : `CJ Gerenciamento • ${a.title}`, body: a.body, channelId: CH_ALERT,
          schedule: { at: new Date(a.at), allowWhileIdle: true },
        })),
      });
    }
    scheduled.clear();
    future.forEach((a) => scheduled.add(nid(a.id)));
    saveScheduled();
  } catch { /* ignora */ }
}
/* ---- Notificação persistente da máquina com tempo restante ---- */

export interface MachineCountdown {
  id: number;
  station: string;
  player: string;
  remainingSec: number;
}

export async function updateMachineCountdown(list: MachineCountdown[]) {
  if (!isNative() || nativePerm !== "granted") return;

  try {
    const L = await ln();

    for (const machine of list) {
      const remaining = Math.max(0, Math.ceil(machine.remainingSec));
      const min = Math.floor(remaining / 60);
      const sec = remaining % 60;
      const clock = `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;

      await L.cancel({
        notifications: [{ id: nid(900000 + machine.id) }],
      });

      if (remaining > 0) {
        await L.schedule({
          notifications: [{
            id: nid(900000 + machine.id),
            title: `🎮 ${machine.station}`,
            body: `${clock} restantes • ${machine.player}`,
            channelId: CH_ALERT,
            ongoing: true,
            autoCancel: false,
          }],
        });
      }
    }
  } catch {
    /* ignora falhas nativas */
  }
}
