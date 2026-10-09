import {
  ADM_EMAIL, OFFLINE_MSG, cloudOn, globalPull, globalPush, globalStamp, hasSession, houseGet, housePush, publishStaffAccess,
  staffLogin, staffLogout, staffPull, staffPush, staffSalt,
} from "./cloud";
import {
  clearFails, getAccount, installAccount, lockLeft, recordFail, removeAccount, updateAccount, type Account,
} from "./accounts";
import { defaultAdmin, defaultData, loadAdminFor, loadDataFor, normalize, normalizeAdmin, saveAdminFor, saveDataFor } from "./storage";
import { loadGlobalAdm, saveGlobalAdm } from "./adm";
import { hashPass, isHashed, normCode } from "./auth";
import { deepEq, merge3, mergeData } from "./merge";
import type { AdminData, AppData, GlobalAdm, Staff } from "./types";

/* =====================================================================
   Sincronização da casa entre telemóveis (proprietário A ↔ funcionário B)
   - O proprietário fala com a nuvem com a sua sessão (email).
   - O funcionário fala com a nuvem com um «token» que recebe ao entrar (convite + código + palavra-passe).
   - Cada gravação parte de uma versão («rev»). Se entretanto o outro lado gravou, a app funde os dois
     (ver merge.ts) e grava de novo — nada se perde.
   ===================================================================== */

export interface AccView { ownerName: string; houseName: string; photo: string; passHash: string }
export interface Snap { data: AppData; admin: AdminData; acc: AccView }
interface Base { rev: number; snap: Snap }
export type Channel = { kind: "owner"; email: string } | { kind: "staff"; token: string };
export type Role = "owner" | "staff";
export interface IO {
  read: () => Snap;
  /** `prev` = o que foi lido no início; `merged` = o resultado combinado a aplicar ao estado vivo. */
  apply: (prev: Snap, merged: Snap, role: Role) => void;
}
export type SyncRes =
  | { ok: true; pulled: boolean; pushed: boolean; warn?: string }
  | { ok: false; reason: "nocloud" | "offline" | "denied"; error: string };

const accView = (a: Account): AccView => ({ ownerName: a.ownerName, houseName: a.houseName, photo: a.photo, passHash: a.passHash });
const strip = (s: Snap): Snap => ({ ...s, data: { ...s.data, lastTick: 0 } });
const snapEq = (a: Snap, b: Snap) => deepEq(strip(a), strip(b));

/* ---------- estado guardado: última versão combinada com a nuvem ---------- */
const baseKey = (id: string) => `cjg-live-base:${id}`;
const memBase = new Map<string, Base>();
const loadBase = (id: string): Base | null => {
  const m = memBase.get(id);
  if (m) return m;
  try {
    const b = JSON.parse(localStorage.getItem(baseKey(id)) ?? "null") as Base | null;
    if (b && typeof b.rev === "number" && b.snap?.data) { b.snap.data = normalize(b.snap.data) ?? defaultData(); b.snap.admin = normalizeAdmin(b.snap.admin); memBase.set(id, b); return b; }
  } catch { /* ignora */ }
  return null;
};
const saveBase = (id: string, b: Base) => {
  memBase.set(id, b);
  try { localStorage.setItem(baseKey(id), JSON.stringify(b)); } catch { /* sem espaço: fica só em memória nesta sessão */ }
};

/* ---------- token do funcionário (só nas salas «sombra») ---------- */
const tokKey = (id: string) => `cjg-staff-token:${id}`;
export const loadStaffToken = (id: string): { token: string; staffId: string } | null => {
  try { const t = JSON.parse(localStorage.getItem(tokKey(id)) ?? "null") as { token: string; staffId: string } | null; return t?.token ? t : null; } catch { return null; }
};
const saveStaffToken = (id: string, t: { token: string; staffId: string }) => { try { localStorage.setItem(tokKey(id), JSON.stringify(t)); } catch { /* ignora */ } };
const clearStaffToken = (id: string) => { try { localStorage.removeItem(tokKey(id)); } catch { /* ignora */ } };

/** Como esta conta fala com a nuvem neste telemóvel (ou null se não fala). */
export function channelFor(acc: Account | null): Channel | null {
  if (!acc || !cloudOn()) return null;
  if (acc.shadow) { const t = loadStaffToken(acc.id); return t ? { kind: "staff", token: t.token } : null; }
  if (acc.kind === "email" && hasSession(acc.login)) return { kind: "owner", email: acc.login };
  return null;
}

/* ---------- ligação à nuvem: ler e gravar ---------- */
const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);
const accFrom = (a: unknown, fb: AccView): AccView => {
  const o = (a && typeof a === "object" ? a : {}) as Record<string, unknown>;
  return { ownerName: str(o.ownerName, fb.ownerName), houseName: str(o.houseName, fb.houseName), photo: str(o.photo, fb.photo), passHash: str(o.passHash, fb.passHash) };
};
const staffAdmin = (local: AdminData, billing: unknown): AdminData => ({
  ...local, billing: { ...local.billing, ...((billing && typeof billing === "object" ? billing : {}) as object), payments: local.billing.payments },
});

type Fail = { ok: false; reason: "offline" | "denied"; error: string };
const fail = (error: string, denied = false): Fail => ({ ok: false, reason: denied ? "denied" : "offline", error });

interface Remote { exists: boolean; rev: number; changed: boolean; snap: Snap | null }

async function fetchRemote(ch: Channel, base: Base | null, local: Snap): Promise<{ ok: true; data: Remote } | Fail> {
  if (ch.kind === "owner") {
    const r = await houseGet(ch.email, base?.rev ?? null);
    if (!r.ok) return fail(r.error);
    const j = r.data;
    if (!j.exists) return { ok: true, data: { exists: false, rev: 0, changed: false, snap: null } };
    const snap = j.changed ? { data: normalize(j.data as Partial<AppData>) ?? defaultData(), admin: normalizeAdmin(j.admin as Partial<AdminData>), acc: accFrom(j.account, local.acc) } : null;
    return { ok: true, data: { exists: true, rev: j.rev ?? 0, changed: !!j.changed, snap } };
  }
  const r = await staffPull(ch.token, base?.rev ?? null);
  if (!r.ok) return fail(r.error, "denied" in r);
  const j = r.data;
  const snap = j.changed ? { data: normalize(j.data as Partial<AppData>) ?? defaultData(), admin: staffAdmin(local.admin, j.billing), acc: accFrom(j.account, local.acc) } : null;
  return { ok: true, data: { exists: true, rev: j.rev ?? 0, changed: !!j.changed, snap } };
}

type PushOut = { ok: true; rev: number } | { ok: false; conflict: true; rev: number; snap: Snap } | Fail;

async function pushRemote(ch: Channel, acc: Account | null, merged: Snap, baseRev: number): Promise<PushOut> {
  if (ch.kind === "owner") {
    const r = await housePush(ch.email, { account: { ...(acc ?? {}), ...merged.acc }, data: merged.data, admin: merged.admin }, baseRev);
    if (!r.ok) return fail(r.error);
    const j = r.data;
    if (j.ok) return { ok: true, rev: j.rev };
    return { ok: false, conflict: true, rev: j.rev, snap: { data: normalize(j.data as Partial<AppData>) ?? defaultData(), admin: normalizeAdmin(j.admin as Partial<AdminData>), acc: accFrom(j.account, merged.acc) } };
  }
  const r = await staffPush(ch.token, merged.data, baseRev);
  if (!r.ok) return fail(r.error);
  const j = r.data;
  if (j.ok) return { ok: true, rev: j.rev };
  if ("denied" in j) return fail(j.error, true);
  return { ok: false, conflict: true, rev: j.rev, snap: { data: normalize(j.data as Partial<AppData>) ?? defaultData(), admin: staffAdmin(merged.admin, j.billing), acc: merged.acc } };
}

function mergeSnap(base: Snap | null, local: Snap, remote: Snap, role: Role): Snap {
  return {
    data: mergeData(base?.data ?? null, local.data, remote.data, role),
    admin: role === "staff" ? remote.admin : normalizeAdmin(merge3(base?.admin, local.admin, remote.admin) as AdminData),
    acc: role === "staff" ? remote.acc : (merge3(base?.acc, local.acc, remote.acc) as AccView),
  };
}

/* ---------- publicar os acessos dos funcionários (para entrarem noutro telemóvel) ---------- */
const pubSig = new Map<string, string>();
async function publishStaff(email: string, staff: Staff[]): Promise<string | undefined> {
  const rows = staff.map((st) => ({
    staff_id: st.id, invite: normCode(st.inviteCode), user_code: normCode(st.userCode),
    pass: isHashed(st.pass) ? st.pass : hashPass(st.pass, st.id.replace(/\W/g, "").slice(-10) || "cj"),
    name: st.name, perms: st.perms, active: st.active,
  }));
  const sig = JSON.stringify(rows);
  if (pubSig.get(email) === sig) return undefined;
  const r = await publishStaffAccess(email, rows);
  if (r.ok) { pubSig.set(email, sig); return undefined; }
  return r.error;
}

/* ---------- uma volta de sincronização ---------- */
async function syncOnce(accountId: string, ch: Channel, io: IO): Promise<SyncRes> {
  const role: Role = ch.kind === "staff" ? "staff" : "owner";
  const acc = getAccount(accountId);
  const local0 = io.read();
  const base = loadBase(accountId);
  const dirty = !base || !snapEq(local0, base.snap);

  const rr = await fetchRemote(ch, base, local0);
  if (!rr.ok) return rr;
  const remote = rr.data;
  let warn: string | undefined;
  if (ch.kind === "owner" && remote.exists && !remote.changed && !dirty) {
    warn = await publishStaff(ch.email, local0.data.staff);
    return { ok: true, pulled: false, pushed: false, warn };
  }
  if (ch.kind === "staff" && !remote.changed && !dirty) return { ok: true, pulled: false, pushed: false };

  let remoteSnap: Snap | null = remote.exists ? remote.snap ?? base?.snap ?? null : null;
  let rev = remote.rev;
  let merged = local0;
  // «mergeBase» = a versão da nuvem contra a qual `merged` foi calculado (assim, num conflito repetido, só contam as nossas alterações)
  let mergeBase: Snap | null = base?.snap ?? null;
  if (remote.exists && remote.changed && remote.snap) { merged = mergeSnap(mergeBase, local0, remote.snap, role); mergeBase = remote.snap; }
  // funcionário: a configuração da casa e a equipa são sempre as do proprietário (nunca as locais)
  if (role === "staff" && remoteSnap) merged = { ...merged, data: { ...merged.data, config: remoteSnap.data.config, staff: remoteSnap.data.staff } };

  let needPush = !remoteSnap || !snapEq(merged, remoteSnap);
  let pushed = false;
  for (let i = 0; needPush && i < 4; i++) {
    const pr = await pushRemote(ch, acc, merged, rev);
    if (!pr.ok && !("conflict" in pr)) return pr;
    if ("conflict" in pr && !pr.ok) {
      remoteSnap = pr.snap; rev = pr.rev;
      merged = mergeSnap(mergeBase, merged, pr.snap, role);
      mergeBase = pr.snap;
      needPush = !snapEq(merged, pr.snap);
      continue;
    }
    if (pr.ok) { rev = pr.rev; pushed = true; needPush = false; }
  }
  if (needPush) return fail("A casa foi alterada noutro telemóvel. Tente de novo dentro de instantes.");

  saveBase(accountId, { rev, snap: merged });
  const changedLocal = !snapEq(merged, local0);
  if (changedLocal) io.apply(local0, merged, role);
  if (ch.kind === "owner") warn = await publishStaff(ch.email, merged.data.staff);
  return { ok: true, pulled: changedLocal, pushed, warn };
}

const inflight = new Map<string, Promise<SyncRes>>();
/** Uma só sincronização de cada vez por conta. */
export function runSync(accountId: string, ch: Channel, io: IO): Promise<SyncRes> {
  const cur = inflight.get(accountId);
  if (cur) return cur;
  const p = syncOnce(accountId, ch, io).catch((): SyncRes => ({ ok: false, reason: "offline", error: OFFLINE_MSG })).finally(() => inflight.delete(accountId));
  inflight.set(accountId, p);
  return p;
}

/* ---------- sincronizar sem a app aberta (criação de conta, «Sincronizar agora» fora da sala) ---------- */
function storageIO(accountId: string): IO {
  const read = (): Snap => ({
    data: loadDataFor(accountId) ?? defaultData(), admin: loadAdminFor(accountId),
    acc: accView(getAccount(accountId) ?? { ownerName: "", houseName: "", photo: "", passHash: "" } as Account),
  });
  return {
    read,
    apply: (prev, merged, role) => {
      const cur = read();
      saveDataFor(accountId, mergeData(prev.data, cur.data, merged.data, role));
      saveAdminFor(accountId, role === "staff" ? staffAdmin(cur.admin, merged.admin.billing) : normalizeAdmin(merge3(prev.admin, cur.admin, merged.admin) as AdminData));
      const patch: Partial<AccView> = {};
      (["ownerName", "houseName", "photo"] as const).forEach((k) => { if (merged.acc[k] && merged.acc[k] !== cur.acc[k]) patch[k] = merged.acc[k]; });
      if (role === "owner" && merged.acc.passHash && merged.acc.passHash !== cur.acc.passHash) patch.passHash = merged.acc.passHash;
      if (Object.keys(patch).length) updateAccount(accountId, patch);
    },
  };
}

interface Live { accountId: string; run: () => Promise<SyncRes> }
let live: Live | null = null;
/** A sala aberta regista-se aqui para que «Sincronizar agora» use o estado vivo e não o guardado. */
export const registerLive = (l: Live | null) => { live = l; };

/** Sincroniza esta conta agora (true = ficou em dia com a nuvem). */
export async function pushAccount(accountId: string, _force = false): Promise<boolean> {
  if (live?.accountId === accountId) return (await live.run()).ok;
  const ch = channelFor(getAccount(accountId));
  if (!ch) return false;
  return (await runSync(accountId, ch, storageIO(accountId))).ok;
}

/** Recupera a conta inteira neste telemóvel (depois de verificar o email por código). */
export async function restoreAccount(email: string): Promise<{ ok: true; account: Account } | { ok: false; error: string }> {
  const r = await houseGet(email, null);
  if (!r.ok) return { ok: false, error: r.error };
  if (!r.data.exists) return { ok: false, error: "Não encontrámos nenhuma Game House ligada a este email. Crie uma conta." };
  const acc = r.data.account as Account;
  if (!acc?.id || acc.login !== email.toLowerCase()) return { ok: false, error: "Os dados desta conta estão incompletos." };
  if (!installAccount(acc)) return { ok: false, error: "Sem espaço no telemóvel para guardar a conta." };
  const data = normalize(r.data.data as Partial<AppData>) ?? defaultData();
  const admin = normalizeAdmin(r.data.admin as Partial<AdminData>);
  saveDataFor(acc.id, data);
  saveAdminFor(acc.id, admin);
  saveBase(acc.id, { rev: r.data.rev ?? 0, snap: { data, admin, acc: accView(acc) } });
  return { ok: true, account: acc };
}

/* ---------- funcionário noutro telemóvel ---------- */
export type StaffCloudResult = { ok: true; accountId: string; staffId: string } | { ok: false; error: string };

export async function loginStaffCloud(invite: string, userCode: string, password: string): Promise<StaffCloudResult> {
  const key = `staff:${normCode(invite)}`;
  const left = lockLeft(key);
  if (left > 0) return { ok: false, error: `Demasiadas tentativas. Aguarde ${left}s.` };
  const bad = (error: string): StaffCloudResult => {
    if (error === OFFLINE_MSG) return { ok: false, error };
    const l = recordFail(key);
    return { ok: false, error: l > 0 ? `Demasiadas tentativas. Aguarde ${l}s.` : error };
  };

  const salt = await staffSalt(invite, userCode);
  if (!salt.ok) return { ok: false, error: salt.error };
  const lg = await staffLogin(invite, userCode, hashPass(password, salt.data));
  if (!lg.ok) return bad(lg.error);

  const a = lg.data.account;
  const id = str(a.id);
  if (!id) return { ok: false, error: "A sala do proprietário está incompleta. Peça-lhe para abrir a app com internet." };
  const existing = getAccount(id);
  if (existing && !existing.shadow) {
    void staffLogout(lg.data.token);
    return { ok: false, error: "Esta sala é do proprietário e já existe neste telemóvel. Peça-lhe os dados para entrar pelo aparelho dele ou use outro telemóvel." };
  }
  const pr = await staffPull(lg.data.token, null);
  if (!pr.ok || !pr.data.data) { void staffLogout(lg.data.token); return { ok: false, error: pr.ok ? "Não foi possível abrir a sala do proprietário." : pr.error }; }

  const shadow: Account = {
    id, kind: "phone", login: `shadow:${id}`, display: "", passHash: "",
    ownerName: str(a.ownerName), houseName: str(a.houseName), photo: str(a.photo),
    createdAt: typeof a.createdAt === "number" ? a.createdAt : Date.now(), shadow: true,
  };
  if (!installAccount(shadow)) { void staffLogout(lg.data.token); return { ok: false, error: "Sem espaço no telemóvel para guardar a sala." }; }

  const data = normalize(pr.data.data as Partial<AppData>) ?? defaultData();
  const localData = loadDataFor(id);
  if (localData && loadBase(id)) {
    // sobraram alterações por enviar de uma entrada anterior: ficam, e a sincronização funde-as
    saveDataFor(id, { ...localData, config: data.config, staff: data.staff });
  } else {
    const admin = staffAdmin(defaultAdmin(), pr.data.billing);
    saveDataFor(id, data);
    saveAdminFor(id, admin);
    saveBase(id, { rev: pr.data.rev ?? 0, snap: { data, admin, acc: accView(shadow) } });
  }
  saveStaffToken(id, { token: lg.data.token, staffId: lg.data.staffId });
  clearFails(key);
  return { ok: true, accountId: id, staffId: lg.data.staffId };
}

/** Apaga deste telemóvel a sala de um proprietário (só salas «sombra»). */
export function wipeShadow(accountId: string) {
  if (!getAccount(accountId)?.shadow) return;
  memBase.delete(accountId);
  removeAccount(accountId);
}

/** O funcionário sai: envia o que falta, termina a sessão na nuvem e apaga a sala deste telemóvel (se nada ficou por enviar). */
export async function leaveShadow(accountId: string, io: IO): Promise<void> {
  if (!getAccount(accountId)?.shadow) return;
  const t = loadStaffToken(accountId);
  if (!t) return;
  let synced = false;
  try {
    synced = await Promise.race([
      runSync(accountId, { kind: "staff", token: t.token }, io).then((r) => !!r?.ok),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 4000)),
    ]);
  } catch {
    return;
  }
  if (!synced) return;
  const base = loadBase(accountId);
  if (!base || !snapEq(io.read(), base.snap)) return;
  void staffLogout(t.token);
  clearStaffToken(accountId);
  wipeShadow(accountId);
}
/* ---------- conteúdo global do ADM ---------- */
const getStamp = (k: string) => { try { return localStorage.getItem(k) ?? ""; } catch { return ""; } };
const setStamp = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignora */ } };
const GKEY = "cjg-gstamp";
const DIRTY = "cjg-adm-dirty";
export const admDirty = () => getStamp(DIRTY) === "1";
export let lastPublishError = "";
const setDirty = (v: boolean) => { try { v ? localStorage.setItem(DIRTY, "1") : localStorage.removeItem(DIRTY); } catch { /* ignora */ } };

/** Todos os telemóveis: traz anúncios, salas, avisos, gerentes e memórias publicados pelo ADM. */
export async function syncGlobalDown() {
  if (!cloudOn() || admDirty()) return;
  const st = await globalStamp();
  if (!st || st === getStamp(GKEY)) return;
  const row = await globalPull();
  if (!row?.data || typeof row.data !== "object") return;
  const base = loadGlobalAdm();
  const g = row.data as Partial<GlobalAdm>;
  saveGlobalAdm({
    ...base, ...g,
    ads: Array.isArray(g.ads) ? g.ads : [], rooms: Array.isArray(g.rooms) ? g.rooms : [], notices: Array.isArray(g.notices) ? g.notices : [],
    managers: Array.isArray(g.managers) ? g.managers : base.managers, memories: Array.isArray(g.memories) ? g.memories : [], games: Array.isArray(g.games) ? g.games : [],
  });
  setStamp(GKEY, row.updated_at);
}

/** ADM: publica o conteúdo para todos. Se falhar (sem net/sem sessão), fica marcado para não ser apagado. */
export async function pushGlobalUp(g: GlobalAdm): Promise<boolean> {
  lastPublishError = "";
  if (!cloudOn()) return true;
  if (!hasSession(ADM_EMAIL)) { setDirty(true); return false; }
  const r = await globalPush(g);
  if (r.ok) { lastPublishError = ""; setStamp(GKEY, r.data); setDirty(false); return true; }
  lastPublishError = r.error;
  console.error("[CJ] Falha ao publicar:", r.error);
  setDirty(true);
  return false;
}
