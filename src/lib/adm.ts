import type { Ad, AiMemory, Game, GlobalAdm, Manager, Room } from "./types";
import { checkPass } from "./auth";
import { clearFails, lockLeft, recordFail } from "./accounts";

/* =====================================================================
   Acesso do ADM — só o proprietário do app CrisJoseGamer.
   Aqui fica APENAS o hash (SHA-256 com sal e 2000 rondas) da senha única.
   A senha em si nunca está no código. Para trocar: gere um novo hash com
   o mesmo método (v1$<sal>$<hash>) e substitua a constante abaixo.
   ===================================================================== */
const ADM_HASH = "v1$VYBVJSY9GF$a88f0a5bbf91b5e1f5dea8f587285daa6d11d1cf38bb56958594579337f9b942";
const LOCK_KEY = "adm:global";

export type AdmLogin = { ok: true } | { ok: false; error: string };

export function admLogin(pass: string): AdmLogin {
  const left = lockLeft(LOCK_KEY);
  if (left > 0) return { ok: false, error: `Demasiadas tentativas. Aguarde ${left}s.` };
  if (pass && checkPass(pass.trim(), ADM_HASH)) {
    clearFails(LOCK_KEY);
    return { ok: true };
  }
  const l = recordFail(LOCK_KEY);
  return { ok: false, error: l > 0 ? `Senha incorreta. Aguarde ${l}s para tentar de novo.` : "Senha do ADM incorreta." };
}

/* ---------- dados globais do ADM (anúncios com fotos, salas, avisos) ---------- */
const KEY = "cjg-adm-global";
export const ADM_EVENT = "cjg-adm-changed";

/** Gerentes embutidos no build (chegam a TODOS os telemóveis): VITE_MANAGERS="Nome|Função|923000000|Horário;Nome2|Função|924000000" */
const DEFAULT_MANAGERS: Manager[] = [
  { id: 1, name: "Gerência CJ", role: "Suporte e cobrança", whatsapp: "945379003", hours: "", active: true },
];
export function envManagers(): Manager[] {
  const raw = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_MANAGERS ?? "";
  return raw.split(";").map((x, i) => x.split("|").map((v) => v.trim())).filter((a) => a[0] && (a[2] ?? "").replace(/\D/g, "").length >= 9)
    .map((a, i) => ({ id: i + 1, name: a[0], role: a[1] || "Gerente", whatsapp: a[2], hours: a[3] || "", active: true }));
}
export function baseManagers(): Manager[] {
  const e = envManagers();
  return e.length ? e : DEFAULT_MANAGERS;
}

export const defaultGlobalAdm = (): GlobalAdm => ({ adsOn: true, slideSec: 5, ads: [], rooms: [], notices: [], managers: baseManagers(), memories: [], games: [] });

export function loadGlobalAdm(): GlobalAdm {
  const base = defaultGlobalAdm();
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<GlobalAdm> | null;
    if (!p || typeof p !== "object") return base;
    return {
      adsOn: p.adsOn ?? base.adsOn,
      slideSec: Math.min(30, Math.max(2, Number(p.slideSec) || base.slideSec)),
      ads: Array.isArray(p.ads) ? (p.ads as Ad[]) : [],
      rooms: Array.isArray(p.rooms) ? (p.rooms as Room[]) : [],
      notices: Array.isArray(p.notices) ? p.notices.slice(0, 50) : [],
      managers: Array.isArray(p.managers) && p.managers.length ? (p.managers as Manager[]).slice(0, 12) : base.managers,
      memories: Array.isArray(p.memories) ? (p.memories as AiMemory[]).slice(0, 300) : [],
      games: Array.isArray(p.games) ? (p.games as Game[]).slice(0, 60) : [],
      blockScreen: p.blockScreen && typeof p.blockScreen === "object" ? (p.blockScreen as GlobalAdm["blockScreen"]) : undefined,
    };
  } catch {
    return base;
  }
}

/** Devolve false se o telemóvel ficou sem espaço (fotos grandes enchem o armazenamento). */
export function saveGlobalAdm(g: GlobalAdm): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(g));
    window.dispatchEvent(new Event(ADM_EVENT));
    return true;
  } catch {
    return false;
  }
}

/** Avisos do ADM já mostrados por cada casa (para não repetir). */
const seenKey = (accountId: string) => `cjg-adm-seen:${accountId}`;
export const loadSeenNotices = (accountId: string): number[] => {
  try { return JSON.parse(localStorage.getItem(seenKey(accountId)) ?? "[]") as number[]; } catch { return []; }
};
export const saveSeenNotices = (accountId: string, ids: number[]) => {
  try { localStorage.setItem(seenKey(accountId), JSON.stringify(ids.slice(-100))); } catch { /* ignora */ }
};

/** Perguntas que a IA não soube responder (para o ADM as ensinar). Só neste telemóvel. */
const UNK = "cjg-ai-unknown";
export interface Unknown { q: string; n: number; ts: number }
export const loadUnknown = (): Unknown[] => {
  try { return JSON.parse(localStorage.getItem(UNK) ?? "[]") as Unknown[]; } catch { return []; }
};
export const saveUnknown = (l: Unknown[]) => { try { localStorage.setItem(UNK, JSON.stringify(l.slice(0, 60))); } catch { /* ignora */ } };
export function logUnknown(q: string) {
  const t = q.trim().slice(0, 200); if (t.length < 6) return;
  const l = loadUnknown(); const k = t.toLowerCase();
  const i = l.findIndex((x) => x.q.toLowerCase() === k);
  if (i >= 0) l[i] = { ...l[i], n: l[i].n + 1, ts: Date.now() }; else l.unshift({ q: t, n: 1, ts: Date.now() });
  saveUnknown(l.sort((a, b) => b.n - a.n || b.ts - a.ts));
}
