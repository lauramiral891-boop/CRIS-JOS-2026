/* Ligação ao Supabase (sem SDK, só fetch): login por código enviado ao email,
   dados de cada casa e conteúdo global do ADM. Se as variáveis não estiverem
   definidas, a app continua a funcionar só neste telemóvel (modo local). */

const env = import.meta.env;
/* aceita os nomes VITE_… e também os do painel do Supabase (NEXT_PUBLIC_…) */
const URL_ = (env.VITE_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/$/, "");
const KEY = (env.VITE_SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
export const ADM_EMAIL = (env.VITE_ADM_EMAIL ?? "tvvibeoficial@gmail.com").trim().toLowerCase();

export const cloudOn = () => !!URL_ && !!KEY;

export type Res<T = void> = { ok: true; data: T } | { ok: false; error: string };

interface Stored { access: string; refresh: string; exp: number; uid: string }
const sk = (email: string) => `cjg-cloud-auth:${email.toLowerCase()}`;
const readS = (email: string): Stored | null => { try { return JSON.parse(localStorage.getItem(sk(email)) ?? "null") as Stored | null; } catch { return null; } };
const writeS = (email: string, s: Stored | null) => { try { s ? localStorage.setItem(sk(email), JSON.stringify(s)) : localStorage.removeItem(sk(email)); } catch { /* ignora */ } };

export const hasSession = (email: string) => !!readS(email)?.refresh;
export const signOutCloud = (email: string) => writeS(email, null);

async function raw(path: string, init: RequestInit & { token?: string } = {}) {
  const { token, ...rest } = init;
  return fetch(`${URL_}${path}`, {
    ...rest,
    headers: {
      apikey: KEY,
      // chave antiga (anon, JWT «eyJ…») vai também em Authorization; a nova «sb_publishable_…» só em apikey
      ...(token ? { Authorization: `Bearer ${token}` } : KEY.startsWith("eyJ") ? { Authorization: `Bearer ${KEY}` } : {}),
      "Content-Type": "application/json", ...(rest.headers as Record<string, string> | undefined),
    },
  });
}

const errText = async (r: Response, fallback: string) => {
  if (r.status === 429) return "Muitos pedidos seguidos. Aguarde um minuto e tente de novo.";
  try {
    const j = await r.json() as { msg?: string; error_description?: string; message?: string; error_code?: string };
    const m = (j.msg || j.error_description || j.message || "").toLowerCase();
    if (/otp|token|expired|invalid/.test(m)) return "Código incorreto ou expirado.";
    if (/rate|limit/.test(m)) return "Muitos pedidos seguidos. Aguarde um minuto e tente de novo.";
    if (/smtp|email.*(send|sending)|error sending/.test(m)) return "Não foi possível enviar o email agora. A nossa equipa já foi avisada — tente mais tarde.";
  } catch { /* ignora */ }
  return fallback;
};
export const OFFLINE_MSG = "Sem ligação à internet. Ligue-se e tente de novo.";
const offline = OFFLINE_MSG;

/* ---------- login por código (OTP) ---------- */
export async function sendCode(email: string): Promise<Res> {
  if (!cloudOn()) return { ok: false, error: "Nuvem não configurada." };
  try {
    const r = await raw("/auth/v1/otp", { method: "POST", body: JSON.stringify({ email: email.toLowerCase(), create_user: true }) });
    return r.ok ? { ok: true, data: undefined } : { ok: false, error: await errText(r, "Não foi possível enviar o código.") };
  } catch { return { ok: false, error: offline }; }
}

export async function verifyCode(email: string, code: string): Promise<Res<{ uid: string }>> {
  try {
    const r = await raw("/auth/v1/verify", { method: "POST", body: JSON.stringify({ type: "email", email: email.toLowerCase(), token: code.replace(/\D/g, "") }) });
    if (!r.ok) return { ok: false, error: await errText(r, "Código incorreto ou expirado.") };
    const j = await r.json() as { access_token: string; refresh_token: string; expires_in?: number; user?: { id: string } };
    const s: Stored = { access: j.access_token, refresh: j.refresh_token, exp: Date.now() + (j.expires_in ?? 3600) * 1000, uid: j.user?.id ?? "" };
    writeS(email, s);
    return { ok: true, data: { uid: s.uid } };
  } catch { return { ok: false, error: offline }; }
}

async function token(email: string): Promise<string | null> {
  const s = readS(email);
  if (!s) return null;
  if (s.exp - 60000 > Date.now()) return s.access;
  try {
    const r = await raw("/auth/v1/token?grant_type=refresh_token", { method: "POST", body: JSON.stringify({ refresh_token: s.refresh }) });
    if (!r.ok) { if (r.status === 400 || r.status === 401) writeS(email, null); return null; }
    const j = await r.json() as { access_token: string; refresh_token: string; expires_in?: number; user?: { id: string } };
    const n: Stored = { access: j.access_token, refresh: j.refresh_token, exp: Date.now() + (j.expires_in ?? 3600) * 1000, uid: j.user?.id ?? s.uid };
    writeS(email, n);
    return n.access;
  } catch { return null; }
}

/* ---------- chamada de funções do servidor (RPC) ---------- */
async function rpc<T>(fn: string, args: Record<string, unknown>, email?: string): Promise<Res<T>> {
  let t: string | null = null;
  if (email) {
    t = await token(email);
    if (!t) return { ok: false, error: "Sem sessão na nuvem." };
  }
  try {
    const r = await raw(`/rest/v1/rpc/${fn}`, { method: "POST", token: t ?? undefined, body: JSON.stringify(args) });
    if (!r.ok) return { ok: false, error: await errText(r, "Não foi possível falar com a nuvem.") };
    return { ok: true, data: (await r.json()) as T };
  } catch { return { ok: false, error: offline }; }
}

/* ---------- dados de cada casa (proprietário) ---------- */
export interface HouseGet { ok: boolean; error?: string; exists?: boolean; rev?: number; changed?: boolean; account?: unknown; data?: unknown; admin?: unknown }

/** Lê a casa. Se «knownRev» for a versão atual, devolve só `changed: false` (pedido muito leve). */
export async function houseGet(email: string, knownRev: number | null): Promise<Res<HouseGet>> {
  const r = await rpc<HouseGet>("house_get", { p_known_rev: knownRev }, email);
  if (!r.ok) return r;
  if (!r.data.ok) return { ok: false, error: r.data.error === "auth" ? "Sem sessão na nuvem." : "Não foi possível ler da nuvem." };
  return r;
}

export type HousePush =
  | { ok: true; rev: number }
  | { ok: false; conflict: true; rev: number; account: unknown; data: unknown; admin: unknown };

/** Grava a casa partindo da versão «baseRev». Se entretanto mudou (funcionário), devolve o conflito para fundir. */
export async function housePush(email: string, p: { account: unknown; data: unknown; admin: unknown }, baseRev: number): Promise<Res<HousePush>> {
  const r = await rpc<{ ok: boolean; error?: string; rev?: number; account?: unknown; data?: unknown; admin?: unknown }>(
    "house_push", { p_account: p.account, p_data: p.data, p_admin: p.admin, p_base_rev: baseRev }, email);
  if (!r.ok) return r;
  const j = r.data;
  if (j.ok) return { ok: true, data: { ok: true, rev: j.rev ?? 0 } };
  if (j.error === "conflict") return { ok: true, data: { ok: false, conflict: true, rev: j.rev ?? 0, account: j.account, data: j.data, admin: j.admin } };
  return { ok: false, error: "Não foi possível guardar na nuvem." };
}

/** O código de convite está livre em toda a nuvem? (erro de rede = não sabemos) */
export async function inviteFree(email: string, invite: string, staffId?: string): Promise<Res<boolean>> {
  return rpc<boolean>("invite_free", { p_invite: invite, p_staff_id: staffId ?? null }, email);
}

export interface StaffAccessRow { staff_id: string; invite: string; user_code: string; pass: string; name: string; perms: string[]; active: boolean }

/** Publica os acessos dos funcionários para que possam entrar noutro telemóvel. Apaga os que já não existem. */
export async function publishStaffAccess(email: string, rows: StaffAccessRow[]): Promise<Res> {
  const t = await token(email); const s = readS(email);
  if (!t || !s) return { ok: false, error: "Sem sessão na nuvem." };
  try {
    if (rows.length) {
      const r = await raw("/rest/v1/staff_access?on_conflict=owner_uid,staff_id", {
        method: "POST", token: t, headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(rows.map((x) => ({ ...x, owner_uid: s.uid, updated_at: new Date().toISOString() }))),
      });
      if (!r.ok) {
        if (r.status === 409) return { ok: false, error: "Um código de convite já está em uso noutra conta. Gere outro convite." };
        return { ok: false, error: await errText(r, "Não foi possível publicar os acessos dos funcionários.") };
      }
    }
    const keep = rows.length ? `&staff_id=not.in.(${rows.map((x) => `"${x.staff_id}"`).join(",")})` : "";
    const d = await raw(`/rest/v1/staff_access?owner_uid=eq.${s.uid}${keep}`, { method: "DELETE", token: t });
    return d.ok ? { ok: true, data: undefined } : { ok: false, error: await errText(d, "Não foi possível atualizar os acessos.") };
  } catch { return { ok: false, error: offline }; }
}

/* ---------- funcionário noutro telemóvel (sem conta Supabase) ---------- */
export async function staffSalt(invite: string, user: string): Promise<Res<string>> {
  if (!cloudOn()) return { ok: false, error: "Nuvem não configurada." };
  return rpc<string>("staff_salt", { p_invite: invite, p_user: user });
}

export interface StaffLoginOk { token: string; staffId: string; account: Record<string, unknown> }

export async function staffLogin(invite: string, user: string, passHash: string): Promise<Res<StaffLoginOk>> {
  const r = await rpc<{ ok: boolean; error?: string; wait?: number; token?: string; staff_id?: string; account?: Record<string, unknown> }>(
    "staff_login", { p_invite: invite, p_user: user, p_pass: passHash });
  if (!r.ok) return r;
  const j = r.data;
  if (j.ok && j.token && j.staff_id && j.account) return { ok: true, data: { token: j.token, staffId: j.staff_id, account: j.account } };
  if (j.error === "locked") return { ok: false, error: `Demasiadas tentativas. Aguarde ${j.wait ?? 30}s.` };
  if (j.error === "blocked") return { ok: false, error: "Este acesso está bloqueado. Fale com o proprietário." };
  if (j.error === "nohouse") return { ok: false, error: "A sala do proprietário ainda não está online. Peça-lhe para abrir a app com internet." };
  return { ok: false, error: "Dados incorretos. Confirme os códigos com o proprietário." };
}

export interface StaffPull { ok: boolean; error?: string; rev?: number; changed?: boolean; data?: unknown; account?: Record<string, unknown>; billing?: Record<string, unknown> }
export type StaffPullRes = Res<StaffPull> | { ok: false; error: string; denied: true };

/** «denied» = o acesso foi bloqueado/removido (o funcionário tem de sair). */
export async function staffPull(tok: string, knownRev: number | null): Promise<StaffPullRes> {
  const r = await rpc<StaffPull>("staff_pull", { p_token: tok, p_known_rev: knownRev });
  if (!r.ok) return r;
  if (r.data.ok) return r;
  if (r.data.error === "auth") return { ok: false, error: "O seu acesso foi bloqueado ou removido pelo proprietário.", denied: true };
  return { ok: false, error: "A sala do proprietário não está disponível." };
}

export type StaffPush =
  | { ok: true; rev: number }
  | { ok: false; conflict: true; rev: number; data: unknown; billing?: Record<string, unknown> }
  | { ok: false; denied: true; error: string };

export async function staffPush(tok: string, data: unknown, baseRev: number): Promise<Res<StaffPush>> {
  const r = await rpc<{ ok: boolean; error?: string; rev?: number; data?: unknown; billing?: Record<string, unknown> }>(
    "staff_push", { p_token: tok, p_data: data, p_base_rev: baseRev });
  if (!r.ok) return r;
  const j = r.data;
  if (j.ok) return { ok: true, data: { ok: true, rev: j.rev ?? 0 } };
  if (j.error === "conflict") return { ok: true, data: { ok: false, conflict: true, rev: j.rev ?? 0, data: j.data, billing: j.billing } };
  if (j.error === "auth") return { ok: true, data: { ok: false, denied: true, error: "O seu acesso foi bloqueado ou removido pelo proprietário." } };
  return { ok: false, error: "Não foi possível guardar na nuvem." };
}

export async function staffLogout(tok: string): Promise<void> {
  try { await rpc("staff_logout", { p_token: tok }); } catch { /* ignora */ }
}

/* ---------- conteúdo global do ADM ---------- */
export async function globalStamp(): Promise<string | null> {
  if (!cloudOn()) return null;
  try {
    const r = await raw("/rest/v1/adm_global?select=updated_at&id=eq.1");
    if (!r.ok) return null;
    return ((await r.json()) as { updated_at: string }[])[0]?.updated_at ?? null;
  } catch { return null; }
}

export async function globalPull(): Promise<{ data: unknown; updated_at: string } | null> {
  try {
    const r = await raw("/rest/v1/adm_global?select=data,updated_at&id=eq.1");
    if (!r.ok) return null;
    return ((await r.json()) as { data: unknown; updated_at: string }[])[0] ?? null;
  } catch { return null; }
}

export async function globalPush(data: unknown): Promise<Res<string>> {
  const t = await token(ADM_EMAIL);
  if (!t) return { ok: false, error: "O ADM não está ligado à nuvem." };
  try {
    const at = new Date().toISOString();
    const r = await raw("/rest/v1/adm_global?on_conflict=id", {
      method: "POST", token: t, headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ id: 1, data, updated_at: at }),
    });
    return r.ok ? { ok: true, data: at } : { ok: false, error: await errText(r, "Não foi possível publicar.") };
  } catch { return { ok: false, error: offline }; }
}
