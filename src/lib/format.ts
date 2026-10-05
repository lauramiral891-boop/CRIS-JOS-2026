import type { Player } from "./types";

export const pad = (n: number) => String(n).padStart(2, "0");

/** Kwanzas: AOA 1.150,00 */
export const formatAOA = (v: number) => {
  const neg = v < 0;
  const [i, d] = Math.abs(v).toFixed(2).split(".");
  return `${neg ? "-" : ""}AOA ${i.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${d}`;
};

export const formatAOAshort = (v: number) => formatAOA(v).replace(",00", "");

export const compactAOA = (v: number) => {
  const a = Math.abs(v);
  if (a >= 1e6) return `${(v / 1e6).toFixed(1).replace(".", ",").replace(",0", "")}M`;
  if (a >= 1e3) return `${(v / 1e3).toFixed(a >= 1e4 ? 0 : 1).replace(".", ",").replace(",0", "")}k`;
  return String(Math.round(v));
};

export const formatClock = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(r)}` : `${pad(m)}:${pad(r)}`;
};

export const clockHM = (ts: number) => {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const timeAgo = (ts: number, now: number) => {
  const s = Math.max(0, (now - ts) / 1000);
  if (s < 45) return "agora mesmo";
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${Math.max(1, m)} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)} d`;
};

export const initialsOf = (name: string) =>
  name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";

export const playerMatches = (p: Player, name: string) => {
  const n = name.trim().toLowerCase();
  return !!n && (p.name.toLowerCase() === n || p.tag.replace("@", "").toLowerCase() === n);
};
