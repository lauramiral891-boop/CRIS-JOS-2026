export type Role = "adm" | "dev" | "user";

export interface Msg {
  id: string;
  channel: string;
  name: string;
  role: Role;
  text: string;
  ts: number;
}

export const TTL = 24 * 3600 * 1000;

export const CHANNELS = [
  { id: "geral", icon: "💬", desc: "Conversa livre" },
  { id: "procura-grupo", icon: "🎮", desc: "Encontre jogadores" },
  { id: "torneios", icon: "🔥", desc: "Competições" },
  { id: "high-scores", icon: "🏆", desc: "Recordes" },
];

const KEY = "cjg-community-local";

function read(): Msg[] {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(p) ? (p as Msg[]) : [];
  } catch {
    return [];
  }
}

function write(l: Msg[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(l.slice(-400)));
  } catch {
    /* sem espaço */
  }
}

export function listMessages(channel: string): Msg[] {
  const now = Date.now();
  return read()
    .filter((m) => m.channel === channel && m.ts + TTL > now)
    .sort((a, b) => a.ts - b.ts);
}

export function sendMessage(m: Omit<Msg, "id" | "ts">): Msg {
  const ts = Date.now();
  const id = Math.random().toString(36).slice(2);
  const msg: Msg = { ...m, id, ts };
  write([...read().filter((x) => x.ts + TTL > ts), msg]);
  return msg;
}

export function mentionParts(text: string): { t: string; m: boolean }[] {
  return text
    .split(/(@[\wÀ-ÿ]+)/g)
    .filter(Boolean)
    .map((t) => ({ t, m: t.startsWith("@") }));
}

export const hhmm = (ts: number) =>
  new Date(ts).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
