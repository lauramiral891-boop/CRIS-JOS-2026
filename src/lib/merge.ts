/* Fusão a três vias («base» = último estado combinado com a nuvem, «local» = este telemóvel, «remoto» = a nuvem).
   Regras:
   - só um lado mudou → fica a mudança desse lado;
   - listas de registos com `id` (vendas, sessões, jogadores…) fundem-se registo a registo: o que um adicionou e o outro não vê, mantém-se;
   - apagar só vale se o outro lado não mexeu nesse registo entretanto (nunca se perde uma alteração por uma remoção alheia);
   - stock e saldo somam as diferenças dos dois lados (duas vendas ao mesmo tempo baixam o stock duas vezes);
   - o mesmo campo alterado nos dois lados: ganha o lado local (a última gravação).
   Sem base (primeira sincronização) a fusão é uma união: nada se apaga. */
import type { AppData, AppNotification } from "./types";

type Rec = Record<string, unknown> & { id: string | number };

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const hasId = (v: unknown): v is Rec => isObj(v) && (typeof v.id === "number" || typeof v.id === "string");
const isIdArr = (v: unknown): v is Rec[] => Array.isArray(v) && v.every(hasId);

/** Campos numéricos em que se somam as diferenças dos dois lados. */
const DELTA = new Set(["stock", "balance"]);

export function deepEq(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== "object") return false;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEq(a[i], b[i])) return false;
    return true;
  }
  if (Array.isArray(b)) return false;
  const ka = Object.keys(a as object).filter((k) => (a as Record<string, unknown>)[k] !== undefined);
  const kb = Object.keys(b as object).filter((k) => (b as Record<string, unknown>)[k] !== undefined);
  if (ka.length !== kb.length) return false;
  for (const k of ka) if (!deepEq((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])) return false;
  return true;
}

function sortDir(a: Rec[]): "asc" | "desc" | null {
  if (a.length < 2 || !a.every((x) => typeof x.id === "number")) return null;
  let asc = true, desc = true;
  for (let i = 1; i < a.length; i++) {
    if ((a[i].id as number) < (a[i - 1].id as number)) asc = false;
    if ((a[i].id as number) > (a[i - 1].id as number)) desc = false;
  }
  return asc ? "asc" : desc ? "desc" : null;
}

function mergeIdArr(b: Rec[] | undefined, l: Rec[], r: Rec[], key: string): Rec[] {
  const bm = new Map((b ?? []).map((x) => [x.id, x]));
  const lm = new Map(l.map((x) => [x.id, x]));
  const rm = new Map(r.map((x) => [x.id, x]));
  const out: Rec[] = [];
  const seen = new Set<string | number>();
  const take = (id: string | number) => {
    if (seen.has(id)) return;
    seen.add(id);
    const bi = bm.get(id), li = lm.get(id), ri = rm.get(id);
    if (li && ri) { out.push(merge3(bi, li, ri, key) as Rec); return; }
    if (li) { if (bi === undefined || !deepEq(bi, li)) out.push(li); return; } // o remoto apagou: só vale se o local não mexeu
    if (ri) { if (bi === undefined || !deepEq(bi, ri)) out.push(ri); return; } // o local apagou: só vale se o remoto não mexeu
  };
  r.forEach((x) => take(x.id));
  l.forEach((x) => take(x.id));

  const dir = sortDir(r.length >= l.length ? r : l) ?? sortDir(l.length > r.length ? r : l);
  if (dir && out.every((x) => typeof x.id === "number")) {
    out.sort((x, y) => (dir === "asc" ? (x.id as number) - (y.id as number) : (y.id as number) - (x.id as number)));
  }
  return out;
}

export function merge3(b: unknown, l: unknown, r: unknown, key = ""): unknown {
  if (deepEq(l, r)) return l;
  if (deepEq(b, l)) return r;
  if (deepEq(b, r)) return l;
  // os dois lados mudaram, de forma diferente
  if (typeof l === "number" && typeof r === "number" && typeof b === "number" && DELTA.has(key)) return r + (l - b);
  if (isObj(l) && isObj(r)) {
    const bo = isObj(b) ? b : {};
    const out: Record<string, unknown> = {};
    for (const k of new Set([...Object.keys(r), ...Object.keys(l)])) {
      const v = merge3(bo[k], l[k], r[k], k);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }
  if (isIdArr(l) && isIdArr(r)) return mergeIdArr(isIdArr(b) ? b : undefined, l, r, key);
  return l;
}

/* ---------- dados da casa ---------- */
const notifKey = (n: AppNotification) => `${n.title}|${n.desc ?? ""}|${Math.floor(n.ts / 60000)}`;

export function dedupeNotifs(list: AppNotification[]): AppNotification[] {
  const seen = new Set<string>();
  return list.filter((n) => {
    const k = notifKey(n);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Stock e saldos: os dois lados alteraram o mesmo registo → somam-se as duas diferenças.
    (Duas vendas iguais ao mesmo tempo dão valores iguais nos dois lados; sem isto contava-se só uma.) */
function fixDeltas(base: AppData, local: AppData, remote: AppData, out: AppData) {
  const targets: [keyof AppData, string][] = [["inventory", "stock"], ["players", "balance"]];
  for (const [col, field] of targets) {
    const bm = new Map((base[col] as unknown as Rec[]).map((x) => [x.id, x]));
    const lm = new Map((local[col] as unknown as Rec[]).map((x) => [x.id, x]));
    const rm = new Map((remote[col] as unknown as Rec[]).map((x) => [x.id, x]));
    (out[col] as unknown as Rec[]) = (out[col] as unknown as Rec[]).map((item) => {
      const b = bm.get(item.id)?.[field], l = lm.get(item.id)?.[field], r = rm.get(item.id)?.[field];
      if (typeof b === "number" && typeof l === "number" && typeof r === "number" && l !== b && r !== b) return { ...item, [field]: r + (l - b) };
      return item;
    });
  }
}

/** Funde os dados da casa. No telemóvel do funcionário, a configuração e a equipa vêm sempre do proprietário. */
export function mergeData(base: AppData | null, local: AppData, remote: AppData, role: "owner" | "staff"): AppData {
  const m = merge3(base ?? undefined, local, remote) as AppData;
  const mergeShifts = (...lists: (AppData["shifts"] | undefined)[]) => {
    const byId = new Map<number, NonNullable<AppData["shifts"]>[number]>();
    for (const list of lists) {
      for (const sh of list ?? []) {
        if (!sh) continue;
        const prev = byId.get(sh.id);
        byId.set(sh.id, prev ? { ...prev, ...sh, end: sh.end ?? prev.end, delivered: !!(prev.delivered || sh.delivered), deliveredAt: sh.deliveredAt ?? prev.deliveredAt } : sh);
      }
    }
    return [...byId.values()].sort((a, b) => b.start - a.start);
  };
  const mergeInvoicesByNumber = (...lists: (AppData["invoices"] | undefined)[]) => {
    const byNumber = new Map<string, NonNullable<AppData["invoices"]>[number]>();
    for (const list of lists) {
      for (const invoice of list ?? []) {
        if (invoice && invoice.number) {
          const previous = byNumber.get(invoice.number);
          if (!previous || invoice.ts >= previous.ts) {
            byNumber.set(invoice.number, invoice);
          }
        }
      }
    }
    return [...byNumber.values()].sort((a, b) => b.ts - a.ts);
  };
  const out: AppData = {
    ...m,
    invoices: mergeInvoicesByNumber(base?.invoices, local.invoices, remote.invoices),
    shifts: mergeShifts(base?.shifts, local.shifts, remote.shifts),
    lastTick: Math.max(local.lastTick, remote.lastTick),
    notifications: dedupeNotifs(m.notifications ?? []).slice(0, 300),
    activity: (m.activity ?? []).slice(0, 3000),
  };
  if (base) fixDeltas(base, local, remote, out);
  if (role === "staff") { out.config = remote.config; out.staff = remote.staff; }
  return out;
}
