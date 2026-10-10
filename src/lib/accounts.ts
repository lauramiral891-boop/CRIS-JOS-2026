/* Contas de utilizador (proprietários), verificação e sessão local
   Cada conta tem um ID único e o seu próprio espaço de dados isolado.
   Tudo fica guardado neste dispositivo; um servidor remoto apenas autentica e sincroniza. */
import { checkPass, hashPass, normCode, randomCode } from "./auth";
import { loadDataFor } from "./storage";

export type LoginKind = "email" | "phone";

export interface Account {
  id: string; // ex.: CJ-7K3M9QXA — único, nunca muda
  kind: LoginKind;
  login: string; // email em minúsculas, ou telefone só com dígitos
  display: string; // como o utilizador escreveu
  passHash: string;
  ownerName: string;
  houseName: string;
  photo: string; // data URL — obrigatória
  createdAt: number;
  /** Controlo de Teste e Assinatura */
  trialExpiresAt?: number;
  status?: "trial" | "active" | "blocked";
  /** conta «sombra»: sala de um proprietário que nos visitou */
  shadow?: boolean;
}

interface Pending {
  login: string;
  kind: LoginKind;
  display: string;
  codeHash: string;
  expiresAt: number;
  attempts: number;
  draft: { ownerName: string; houseName: string; photo: string; passHash: string }
}

const ACC_KEY = "cjg-accounts-v1";
const PEND_KEY = "cjg-pending-v1";
const SESSION_KEY = "cjg-session-v1";
const LOCK_KEY = "cjg-locks-v1";

export const CODE_TTL_MIN = 10;
export const MIN_PASS = 6;

const read = <T,>(key: string, fallback: T): T => {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "null") as T | null;
    return v ?? fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, v: unknown): boolean => {
  try { localStorage.setItem(key, JSON.stringify(v)); return true; } catch { return false; }
};

/* ---------- email / telefone ---------- */
export type Parsed = { ok: true; kind: LoginKind; login: string; display: string } | { ok: false; error: string };

export function parseLogin(raw: string): Parsed {
  const t = raw.trim();
  if (!t) return { ok: false, error: "Indique o email ou número de telemóvel." };
  if (t.includes("@")) {
    const e = t.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return { ok: false, error: "Email inválido." };
    return { ok: true, kind: "email", login: e, display: e };
  }
  let d = t.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 12 && d.startsWith("244")) d = d.slice(3);
  if (d.length < 9 || d.length > 15) return { ok: false, error: "Número de telemóvel inválido (ex: 923456789)." };
  return { ok: true, kind: "phone", login: d, display: t };
}

/* ---------- contas ---------- */
export const loadAccounts = (): Account[] => read<Account[]>(ACC_KEY, []);
const saveAccounts = (a: Account[]) => write(ACC_KEY, a);
export const getAccount = (id: string) => loadAccounts().find((a) => a.id === id) ?? null;
const findByLogin = (login: string) => loadAccounts().find((a) => a.login === login) ?? null;

function newAccountId(taken: Set<string>): string {
  let id = "";
  do id = `CJ-${randomCode(8)}`; while (taken.has(id));
  return id;
}

export function updateAccount(id: string, patch: Partial<Account>): Account | null {
  const all = loadAccounts();
  const i = all.findIndex((a) => a.id === id);
  if (i < 0) return null;
  all[i] = { ...all[i], ...patch };
  saveAccounts(all);
  return all[i];
}

/* ---------- criar conta (2 passos: dados → código) ---------- */
const codeHash = (login: string, code: string) => hashPass(`${login}|${code}|cjg`, "cjg-salt");
const pendMap = () => read<Record<string, Pending>, Record<string, Pending>>(PEND_KEY, {});

export interface SignupInput { raw: string; ownerName: string; houseName: string; photo: string; password: string }
export type StartResult = { ok: true; login: string; display: string; kind: LoginKind; code: string } | { ok: false; error: string };

function issueCode(p: Omit<Pending, "codeHash" | "expiresAt" | "attempts">): { code: string } | null {
  const code = randomCode(6, "0123456789");
  const map = pendMap();
  map[p.login] = { ...p, codeHash: codeHash(p.login, code), expiresAt: Date.now() + CODE_TTL_MIN * 60000, attempts: 0 };
  return write(PEND_KEY, map) ? { code } : null;
}

export function startSignup(i: SignupInput): StartResult {
  const pr = parseLogin(i.raw);
  if (!pr.ok) return pr;
  if (!i.photo) return { ok: false, error: "A fotografia é obrigatória." };
  if (!i.houseName.trim()) return { ok: false, error: "Indique o nome da casa de jogos." };
  if (!i.ownerName.trim()) return { ok: false, error: "Indique o nome do proprietário." };
  if (i.password.length < MIN_PASS) return { ok: false, error: `A palavra-passe deve ter pelo menos ${MIN_PASS} carateres.` };
  if (findByLogin(pr.login)) return { ok: false, error: "Já existe uma conta com este email/número. Entre na sua conta." };
  const r = issueCode({
    login: pr.login, kind: pr.kind, display: pr.display,
    draft: { ownerName: i.ownerName.trim(), houseName: i.houseName.trim(), photo: i.photo, passHash: hashPass(i.password) }
  });
  if (!r) return { ok: false, error: "Sem espaço no telemóvel para iniciar o registo." };
  return { ok: true, login: pr.login, display: pr.display, kind: pr.kind, code: r.code };
}

/** Gera um código novo para um registo que ainda não concluiu */
export function resendCode(login: string): { ok: true; code: string } | { ok: false; error: string } {
  const p = pendMap()[login];
  if (!p) return { ok: false, error: "Este registo expirou ou não existe. Recomece o cadastro." };
  const r = issueCode({ login: p.login, kind: p.kind, display: p.display, draft: p.draft });
  if (!r) return { ok: false, error: "Erro ao gerar novo código." };
  return { ok: true, code: r.code };
}

export function cancelSignup(login: string) {
  const map = pendMap();
  delete map[login];
  write(PEND_KEY, map);
}

export type VerifyResult = { ok: true; account: Account } | { ok: false; error: string; dead?: boolean };

export function verifySignup(login: string, codeRaw: string): VerifyResult {
  const map = pendMap();
  const p = map[login];
  if (!p) return { ok: false, error: "Registo não encontrado ou expirou. Recomece.", dead: true };
  if (Date.now() > p.expiresAt) {
    delete map[login]; write(PEND_KEY, map);
    return { ok: false, error: "O código expirou. Recomece o cadastro.", dead: true };
  }
  const code = normCode(codeRaw);
  if (codeHash(login, code) !== p.codeHash) {
    p.attempts += 1;
    if (p.attempts >= 5) {
      delete map[login]; write(PEND_KEY, map);
      return { ok: false, error: "Demasiadas tentativas erradas. Recomece o cadastro.", dead: true };
    }
    write(PEND_KEY, map);
    return { ok: false, error: `Código incorreto. Tentativa ${p.attempts} de 5.` };
  }
  return commitPending(login, map, p);
}

/** Com a nuvem: o código já foi confirmado pelo Supabase */
export function completeSignup(login: string): VerifyResult {
  const map = pendMap();
  const p = map[login];
  if (!p) return { ok: false, error: "Registo não encontrado. Recomece.", dead: true };
  return commitPending(login, map, p);
}

/** Remove uma conta deste telemóvel e todos os seus dados locais */
export function removeAccount(id: string) {
  saveAccounts(loadAccounts().filter((a) => a.id !== id));
  try {
    for (const base of ["cjg-data", "cjg-admin", "cjg-ai", "cjg-live-base", "cjg-staff-token"]) localStorage.removeItem(`${base}:${id}`);
  } catch { /* ignora */ }
}

/** Instala (ou atualiza) neste telemóvel uma conta vinda da nuvem. */
export function installAccount(acc: Account): boolean {
  const all = loadAccounts();
  const i = all.findIndex((a) => a.id === acc.id || a.login === acc.login);
  if (i >= 0) all[i] = acc; else all.push(acc);
  return saveAccounts(all);
}

function commitPending(login: string, map: Record<string, Pending>, p: Pending): VerifyResult {
  const all = loadAccounts();
  if (all.some((a) => a.login === login)) {
    delete map[login]; write(PEND_KEY, map);
    return { ok: false, error: "Já existe uma conta com este email/número.", dead: true };
  }
  const now = Date.now();
  const trialDays = 7;
  const acc: Account = {
    id: newAccountId(new Set(all.map((a) => a.id))),
    kind: p.kind, login: p.login, display: p.display, passHash: p.draft.passHash,
    ownerName: p.draft.ownerName, houseName: p.draft.houseName, photo: p.draft.photo, createdAt: now,
    trialExpiresAt: now + (trialDays * 24 * 60 * 60 * 1000),
    status: "trial",
  };
  if (!saveAccounts([...all, acc])) return { ok: false, error: "Sem espaço no telemóvel para guardar a conta." };
  delete map[login];
  write(PEND_KEY, map);
  return { ok: true, account: acc };
}

/* ---------- limite de tentativas (guardado, não se perde ao recarregar) ---------- */
type Locks = Record<string, { n: number; until: number }>;

export function lockLeft(key: string): number {
  const l = read<Locks>(LOCK_KEY, {})[key];
  return l && l.until > Date.now() ? Math.ceil((l.until - Date.now()) / 1000) : 0;
}
export function recordFail(key: string): number {
  const all = read<Locks>(LOCK_KEY, {});
  const cur = all[key] ?? { n: 0, until: 0 };
  const n = cur.n + 1;
  const lockMs = n >= 5 ? 300000 : n >= 3 ? 30000 : 0;
  all[key] = { n, until: Date.now() + lockMs };
  write(LOCK_KEY, all);
  return lockLeft(key);
}
export function clearFails(key: string) {
  const all = read<Locks>(LOCK_KEY, {});
  delete all[key];
  write(LOCK_KEY, all);
}

/* ---------- entrar ---------- */
export type LoginResult = { ok: true; account: Account } | { ok: false; error: string };

export function loginOwner(raw: string, password: string): LoginResult {
  const pr = parseLogin(raw);
  if (!pr.ok) return pr;
  const key = `owner:${pr.login}`;
  const left = lockLeft(key);
  if (left > 0) return { ok: false, error: `Demasiadas tentativas. Aguarde ${left}s.` };
  const acc = findByLogin(pr.login);
  if (!acc) return { ok: false, error: "Esta conta não existe neste telemóvel." };
  if (!password || !checkPass(password, acc.passHash)) {
    const l = recordFail(key);
    return { ok: false, error: l > 0 ? `Palavra-passe errada. Bloqueado ${l}s.` : "Palavra-passe incorreta." };
  }
  clearFails(key);
  return { ok: true, account: acc };
}

/* ---------- funcionários: só entram na sala do dono ---------- */
export type StaffLoginResult = { ok: true; accountId: string; staffId: string } | { ok: false; error: string };

export function loginStaff(invite: string, userCode: string, password: string): StaffLoginResult {
  const inv = normCode(invite);
  const uc = normCode(userCode);
  const key = `staff:${inv}`;
  const left = lockLeft(key);
  if (left > 0) return { ok: false, error: `Demasiadas tentativas. Aguarde ${left}s.` };
  const bad = (): StaffLoginResult => {
    const l = recordFail(key);
    return { ok: false, error: l > 0 ? `Dados errados. Bloqueado ${l}s.` : "Código ou palavra-passe incorretos." };
  };
  for (const acc of loadAccounts()) {
    if (acc.shadow) continue; // salas «sombra»
    const data = loadDataFor(acc.id);
    const st = data.staff.find((s) => normCode(s.invite) === inv);
    if (!st || !st.active) continue;
    if (normCode(st.code) !== uc) continue;
    if (!checkPass(password, st.pass)) continue;
    clearFails(key);
    return { ok: true, accountId: acc.id, staffId: st.id };
  }
  return bad();
}

/** Verifica se o funcionário existe numa conta guardada neste telemóvel. */
export function staffKnownLocally(invite: string, userCode: string): boolean {
  const inv = normCode(invite), uc = normCode(userCode);
  return loadAccounts().some((a) => !a.shadow && !!loadDataFor(a.id)?.staff.some((x) => normCode(x.inviteCode) === inv && normCode(x.userCode) === uc));
}

/** Impede que o mesmo convite seja usado em contas diferentes. */
export function inviteTaken(invite: string, exceptAccountId: string): boolean {
  const inv = normCode(invite);
  return loadAccounts().some((a) => !a.shadow && a.id !== exceptAccountId && loadDataFor(a.id)?.staff.some((s) => normCode(s.inviteCode) === inv));
}

/* ---------- sessão (quem está dentro neste telemóvel) ---------- */
export type Session = { accountId: string; role: "owner" | "staff"; staffId?: string };

export function loadSession(): Session | null {
  const s = read<Session | null>(SESSION_KEY, null);
  if (!s || typeof s.accountId !== "string") return null;
  if (!getAccount(s.accountId)) return null;
  if (s.role === "owner") return { accountId: s.accountId, role: "owner" };
  if (s.role === "staff" && typeof s.staffId === "string") return { accountId: s.accountId, role: "staff", staffId: s.staffId };
  return null;
}
export function saveSession(s: Session | null) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch { /* ignora */ }
}
