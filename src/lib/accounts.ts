/* Contas de utilizador (proprietários), verificação por código, sessão e anti-força-bruta.
   Cada conta tem um ID único e o seu próprio espaço de dados (ver storage.ts).
   Tudo fica guardado neste dispositivo; um servidor só é preciso para entrar noutro telemóvel. */
import { checkPass, hashPass, normCode, randomCode, sha256Hex } from "./auth";
import { loadDataFor } from "./storage";

export type LoginKind = "email" | "phone";

export interface Account {
  id: string; // ex.: CJ-7K3M9QXA — único, nunca se repete
  kind: LoginKind;
  login: string; // email em minúsculas, ou telefone só com dígitos
  display: string; // como o utilizador escreveu
  passHash: string;
  ownerName: string;
  houseName: string;
  photo: string; // data URL — obrigatória
  createdAt: number;
  /** conta «sombra»: sala de um proprietário que só existe aqui para um funcionário entrar noutro telemóvel */
  shadow?: boolean;
}

interface Pending {
  login: string;
  kind: LoginKind;
  display: string;
  codeHash: string;
  expiresAt: number;
  attempts: number;
  draft: { ownerName: string; houseName: string; photo: string; passHash: string };
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
  if (!t) return { ok: false, error: "Indique o seu email ou número de telefone." };
  if (t.includes("@")) {
    const e = t.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return { ok: false, error: "Este email não é válido." };
    return { ok: true, kind: "email", login: e, display: e };
  }
  let d = t.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 12 && d.startsWith("244")) d = d.slice(3); // +244 923 000 000 = 923 000 000
  if (d.length < 9 || d.length > 15) return { ok: false, error: "Este número de telefone não é válido." };
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

export function updateAccount(id: string, patch: Partial<Pick<Account, "ownerName" | "houseName" | "photo" | "passHash">>): Account | null {
  const all = loadAccounts();
  const i = all.findIndex((a) => a.id === id);
  if (i < 0) return null;
  all[i] = { ...all[i], ...patch };
  saveAccounts(all);
  return all[i];
}

/* ---------- criar conta (2 passos: dados → código) ---------- */
const codeHash = (login: string, code: string) => sha256Hex(`${login}|${code}|cjg`);
const pendMap = () => read<Record<string, Pending>>(PEND_KEY, {});

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
  if (!i.photo) return { ok: false, error: "A foto da Game House é obrigatória." };
  if (!i.houseName.trim()) return { ok: false, error: "Indique o nome da sua Game House." };
  if (!i.ownerName.trim()) return { ok: false, error: "Indique o nome do proprietário." };
  if (i.password.length < MIN_PASS) return { ok: false, error: `A palavra-passe deve ter pelo menos ${MIN_PASS} caracteres.` };
  if (findByLogin(pr.login)) return { ok: false, error: "Já existe uma conta com este email/número. Entre na sua conta." };
  const r = issueCode({
    login: pr.login, kind: pr.kind, display: pr.display,
    draft: { ownerName: i.ownerName.trim(), houseName: i.houseName.trim(), photo: i.photo, passHash: hashPass(i.password) },
  });
  if (!r) return { ok: false, error: "Sem espaço no telemóvel para guardar a conta. Liberte memória e tente de novo." };
  return { ok: true, login: pr.login, display: pr.display, kind: pr.kind, code: r.code };
}

/** Gera um código novo para um registo que ainda não foi confirmado. */
export function resendCode(login: string): { ok: true; code: string } | { ok: false; error: string } {
  const p = pendMap()[login];
  if (!p) return { ok: false, error: "Este registo expirou. Volte a criar a conta." };
  const r = issueCode({ login: p.login, kind: p.kind, display: p.display, draft: p.draft });
  return r ? { ok: true, code: r.code } : { ok: false, error: "Não foi possível gerar o código." };
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
  if (!p) return { ok: false, error: "Este registo expirou. Volte a criar a conta.", dead: true };
  if (Date.now() > p.expiresAt) {
    delete map[login]; write(PEND_KEY, map);
    return { ok: false, error: "O código expirou. Peça um novo código.", dead: false };
  }
  const code = codeRaw.replace(/\D/g, "");
  if (code.length !== 6) return { ok: false, error: "Introduza os 6 dígitos do código." };
  if (codeHash(login, code) !== p.codeHash) {
    p.attempts += 1;
    if (p.attempts >= 5) {
      delete map[login]; write(PEND_KEY, map);
      return { ok: false, error: "Demasiadas tentativas erradas. Volte a criar a conta.", dead: true };
    }
    write(PEND_KEY, map);
    return { ok: false, error: `Código incorreto. Resta${5 - p.attempts === 1 ? "" : "m"} ${5 - p.attempts} tentativa${5 - p.attempts === 1 ? "" : "s"}.` };
  }
  return commitPending(login, map, p);
}

/** Com a nuvem: o código já foi confirmado pelo servidor (email), só falta criar a conta aqui. */
export function completeSignup(login: string): VerifyResult {
  const map = pendMap();
  const p = map[login];
  if (!p) return { ok: false, error: "Este registo expirou. Volte a criar a conta.", dead: true };
  return commitPending(login, map, p);
}

/** Remove uma conta deste telemóvel e todos os seus dados locais (usado só nas salas «sombra» de funcionários). */
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
  const acc: Account = {
    id: newAccountId(new Set(all.map((a) => a.id))),
    kind: p.kind, login: p.login, display: p.display, passHash: p.draft.passHash,
    ownerName: p.draft.ownerName, houseName: p.draft.houseName, photo: p.draft.photo, createdAt: Date.now(),
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
  all[key] = n >= 5 ? { n: 0, until: Date.now() + 30000 } : { n, until: 0 };
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
  if (!acc) return { ok: false, error: "Esta conta não existe. Crie uma conta primeiro." };
  if (!password || !checkPass(password, acc.passHash)) {
    const l = recordFail(key);
    return { ok: false, error: l > 0 ? `Demasiadas tentativas. Aguarde ${l}s.` : "Palavra-passe incorreta." };
  }
  clearFails(key);
  return { ok: true, account: acc };
}

/* ---------- funcionários: só entram na sala do proprietário que os convidou ---------- */
export type StaffLoginResult = { ok: true; accountId: string; staffId: string } | { ok: false; error: string };

export function loginStaff(invite: string, userCode: string, password: string): StaffLoginResult {
  const inv = normCode(invite);
  const uc = normCode(userCode);
  const key = `staff:${inv}`;
  const left = lockLeft(key);
  if (left > 0) return { ok: false, error: `Demasiadas tentativas. Aguarde ${left}s.` };
  const bad = (): StaffLoginResult => {
    const l = recordFail(key);
    return { ok: false, error: l > 0 ? `Demasiadas tentativas. Aguarde ${l}s.` : "Dados incorretos." };
  };
  for (const acc of loadAccounts()) {
    if (acc.shadow) continue; // salas «sombra» entram só pela nuvem
    const st = loadDataFor(acc.id)?.staff.find((x) => normCode(x.inviteCode) === inv && normCode(x.userCode) === uc);
    if (!st) continue;
    if (!checkPass(password, st.pass)) return bad();
    if (!st.active) return { ok: false, error: "Este acesso está bloqueado. Fale com o proprietário." };
    clearFails(key);
    return { ok: true, accountId: acc.id, staffId: st.id };
  }
  return bad();
}

/** Este funcionário existe numa conta guardada NESTE telemóvel? (senão tenta-se a nuvem) */
export function staffKnownLocally(invite: string, userCode: string): boolean {
  const inv = normCode(invite), uc = normCode(userCode);
  return loadAccounts().some((a) => !a.shadow && !!loadDataFor(a.id)?.staff.some((x) => normCode(x.inviteCode) === inv && normCode(x.userCode) === uc));
}

/** O código de convite tem de ser único em todas as contas, para um funcionário nunca cair na sala errada. */
export function inviteTaken(invite: string, exceptAccountId: string): boolean {
  const inv = normCode(invite);
  return loadAccounts().some((a) => !a.shadow && a.id !== exceptAccountId && loadDataFor(a.id)?.staff.some((s) => normCode(s.inviteCode) === inv));
}

/* ---------- sessão (quem está dentro neste telemóvel) ---------- */
export type Session = { accountId: string; role: "owner" } | { accountId: string; role: "staff"; staffId: string };

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
