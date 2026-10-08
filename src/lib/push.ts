/* Notificações do sistema: na barra de notificações do Android/iPhone (como o WhatsApp),
   com permissão pedida ao utilizador. App instalada (Capacitor) usa notificações nativas;
   no navegador/PWA usa as notificações web. */

type Cap = { isNativePlatform?: () => boolean; getPlatform?: () => string };
const cap = (): Cap | undefined => (typeof window !== "undefined" ? (window as unknown as { Capacitor?: Cap }).Capacitor : undefined);
export const isNative = () => !!cap()?.isNativePlatform?.();

type Perm = NotificationPermission | "unsupported";
let nativePerm: NotificationPermission = "default";

const ln = async () => (await import("@capacitor/local-notifications")).LocalNotifications;
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
  } catch (e) { alert("Init erro: " + (e instanceof Error ? e.message : String(e))); }
}

export const notifSupported = () => isNative() || (typeof window !== "undefined" && "Notification" in window);
export const notifPermission = (): Perm => (isNative() ? nativePerm : typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported");

/** Tem de ser chamado a partir de um toque do utilizador. No Android 13+ abre o pedido «Permitir notificações». */
export async function askNotifPermission(): Promise<Perm> {
  alert("Diag: nativo=" + isNative() + " plataforma=" + (cap()?.getPlatform?.() ?? "nenhuma"));
  if (isNative()) {
    try {
      const L = await ln();
      const a = await L.checkPermissions(); const b = await L.requestPermissions(); nativePerm = mapPerm(b.display); alert("Antes=" + a.display + " Depois=" + b.display);
    } catch (e) { alert("Erro notif: " + (e instanceof Error ? e.message : String(e))); }
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
  if (isNative()) {
    if (nativePerm !== "granted") return false;
    try {
      const L = await ln();
      await L.schedule({ notifications: [{ id: tag ? nid(tag.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) : nid(Date.now() + counter++), title, body: body ?? "", channelId: urgent ? CH_ALERT : CH_GENERAL }] });
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
    if (reg) { await reg.showNotification(title, opts); return true; }
    new Notification(title, opts);
    return true;
  } catch {
    return false;
  }
}

/* ---- Alarmes agendados: o telemóvel avisa na hora certa mesmo com a app fechada ---- */
export interface DueAlarm { id: number; at: number; title: string; body: string }
let scheduled = new Set<number>();

export async function syncAlarms(list: DueAlarm[]) {
  if (!isNative() || nativePerm !== "granted") return;
  try {
    const L = await ln();
    const keep = new Set(list.map((a) => nid(a.id)));
    const stale = [...scheduled].filter((i) => !keep.has(i));
    if (stale.length) await L.cancel({ notifications: stale.map((id) => ({ id })) });
    const future = list.filter((a) => a.at > Date.now() + 1000);
    if (future.length) {
      await L.schedule({
        notifications: future.map((a) => ({
          id: nid(a.id), title: a.title, body: a.body, channelId: CH_ALERT,
          schedule: { at: new Date(a.at), allowWhileIdle: true },
        })),
      });
    }
    scheduled = new Set(future.map((a) => nid(a.id)));
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
