import type { AdminData, AppData, Config } from "./types";
import { randomCode } from "./auth";

/* Cada conta tem o seu próprio espaço de dados: o utilizador A nunca lê as chaves do B. */
let NS = "";
export const setNamespace = (id: string) => { NS = id; };
export const getNamespace = () => NS;
const nk = (base: string, id: string = NS) => `${base}:${id}`;

let seq = 0;
export const uid = () => Date.now() * 1000 + (seq++ % 1000);

export const emptyConfig = (): Config => ({
  setupDone: false,
  houseName: "",
  ownerName: "",
  email: "",
  phone: "",
  address: "",
  password: "",
  openTime: "09:00",
  closeTime: "23:00",
  openDays: [0, 1, 2, 3, 4, 5, 6],
  dailyGoal: 0,
  openingBalance: 0,
  subPlan: "pro",
  subSince: Date.now(),
  theme: "dark",
  notifOn: true,
  lang: "pt-AO",
  soundOn: true,
  vibrateOn: true,
  defaultPlans: [],
  lastBackup: null,
  waDdi: "+244",
  waNumber: "",
  pdfFont: "times",
  pdfSize: 11,
  pdfCase: "normal",
  aiKey: "",
});

export const defaultData = (): AppData => ({
  config: emptyConfig(),
  stations: [],
  sessions: [],
  bookings: [],
  players: [],
  transactions: [],
  invoices: [],
  shifts: [],
  notifications: [],
  inventory: [],
  stockMoves: [],
  catalog: [],
  staff: [],
  activity: [],
  history: [],
  lastTick: Date.now(),
});

export function normalize(p: Partial<AppData> | null | undefined): AppData | null {
  if (!p || typeof p !== "object" || !p.config) return null;
  const base = defaultData();
  return {
    ...base,
    ...p,
    config: { ...base.config, ...p.config },
    stations: p.stations ?? [],
    sessions: p.sessions ?? [],
    bookings: p.bookings ?? [],
    players: p.players ?? [],
    transactions: p.transactions ?? [],
    invoices: p.invoices ?? [],
    shifts: p.shifts ?? [],
    notifications: p.notifications ?? [],
    inventory: p.inventory ?? [],
    stockMoves: p.stockMoves ?? [],
    catalog: p.catalog ?? [],
    staff: p.staff ?? [],
    activity: p.activity ?? [],
    history: p.history ?? [],
    lastTick: p.lastTick ?? Date.now(),
  };
}

export function loadDataFor(id: string): AppData | null {
  try {
    const raw = localStorage.getItem(nk("cjg-data", id));
    if (!raw) return null;
    return normalize(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function loadData(): AppData | null {
  if (!NS) return null;
  try {
    const raw = localStorage.getItem(nk("cjg-data"));
    if (!raw) return null;
    return normalize(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Devolve false se não conseguiu guardar (sem espaço / modo privado). */
export function saveData(d: AppData): boolean {
  if (!NS) return false;
  try {
    localStorage.setItem(nk("cjg-data"), JSON.stringify(d));
    return true;
  } catch {
    return false;
  }
}

export type Auth = { role: "owner" } | { role: "staff"; staffId: string };

export function clearData() {
  if (!NS) return;
  try {
    localStorage.removeItem(nk("cjg-data"));
    localStorage.removeItem(nk("cjg-ai"));
  } catch {
    /* ignora */
  }
}

export function downloadFile(name: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- Dados do ADM: guardados à parte (não entram na cópia de segurança nem no "apagar tudo") ---------- */


export const defaultAdmin = (): AdminData => ({
  passHash: "",
  houseId: `HG-${randomCode(6)}`,
  billing: {
    enabled: false, amount: 0, periodDays: 30, dueAt: null, graceDays: 3, warnDays: 3,
    manualBlock: false, instructions: "", note: "", payments: [],
  },
  ads: [],
  adsOn: true,
  rooms: [],
});

export function normalizeAdmin(p: Partial<AdminData> | null | undefined): AdminData {
  const base = defaultAdmin();
  if (!p || typeof p !== "object") return base;
  return {
    ...base, ...p,
    billing: { ...base.billing, ...(p.billing ?? {}), payments: p.billing?.payments ?? [] },
    ads: [],
    rooms: [],
    houseId: p.houseId || base.houseId,
  };
}

export function loadAdminFor(id: string): AdminData {
  if (!id) return defaultAdmin();
  try {
    return normalizeAdmin(JSON.parse(localStorage.getItem(nk("cjg-admin", id)) ?? "null") as Partial<AdminData> | null);
  } catch {
    return defaultAdmin();
  }
}

export function saveAdminFor(id: string, a: AdminData): boolean {
  if (!id) return false;
  try { localStorage.setItem(nk("cjg-admin", id), JSON.stringify({ ...a, ads: [], rooms: [] })); return true; } catch { return false; }
}

/** Dados da casa ativa (cobrança e ID). Anúncios e salas vivem no ADM global (lib/adm.ts). */
export const loadAdmin = (): AdminData => loadAdminFor(NS);
export function saveAdmin(a: AdminData) { saveAdminFor(NS, a); }

/** Grava os dados de uma casa específica (usado pela Sala do ADM, fora de qualquer sessão). */
export function saveDataFor(id: string, d: AppData): boolean {
  if (!id) return false;
  try { localStorage.setItem(nk("cjg-data", id), JSON.stringify(d)); return true; } catch { return false; }
}
