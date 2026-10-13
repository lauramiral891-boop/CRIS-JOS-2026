import type { Game } from "./types";

export const safeLink = (raw: string): string => {
  let t = (raw ?? "").trim();
  if (!t) return "";
  if (!/^[a-z][a-z0-9+.-]*:/i.test(t)) t = `https://${t}`;
  try {
    const u = new URL(t);
    const ok = u.protocol === "http:" || u.protocol === "https:";
    return ok ? u.toString() : "";
  } catch {
    return "";
  }
};

const YT = /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/))([A-Za-z0-9_-]{11})/;

export function ytId(raw: string): string {
  const m = (raw ?? "").trim().match(YT);
  return m ? m[1] : "";
}

export const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export type Part = { label: string; href: string };

export function partsOf(g: Game): Part[] {
  const p = (g.parts ?? [])
    .map((x, i) => ({
      label: (x.label ?? "").trim() || `Parte ${i + 1}`,
      href: safeLink(x.link),
    }))
    .filter((x) => x.href);
  if (p.length) return p;
  const h = safeLink(g.link);
  return h ? [{ label: "Baixar via link", href: h }] : [];
}
