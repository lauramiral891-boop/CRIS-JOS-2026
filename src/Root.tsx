import { useEffect, useState } from "react";
import AccountGate from "./components/AccountGate";
import AdminRoom from "./components/AdminRoom";
import Workspace from "./App";
import { getAccount, loadSession, saveSession, updateAccount, type Account, type Session } from "./lib/accounts";
import { setNamespace } from "./lib/storage";
import { cloudOn, lastCloudEmail } from "./lib/cloud";
import { loadStaffToken, syncGlobalDown, restoreAccount } from "./lib/sync";

/** Escolhe a conta ativa. Cada conta vê só o seu próprio espaço de dados. */
export default function Root() {
  const [session, setSession] = useState<Session | null>(() => {
    const s = loadSession();
    // funcionário noutro telemóvel sem sessão na nuvem (ex.: foi bloqueado) → volta ao ecrã de entrada
    if (s && s.role === "staff" && getAccount(s.accountId)?.shadow && !loadStaffToken(s.accountId)) { saveSession(null); return null; }
    if (s) setNamespace(s.accountId);
    return s;
  });
  const [fresh, setFresh] = useState(false);
  const [adm, setAdm] = useState(false);
  const [account, setAccount] = useState<Account | null>(() => (session ? getAccount(session.accountId) : null));

  useEffect(() => {
    if (session) return;
    const email = lastCloudEmail();
    if (!email) return;
    let cancelled = false;
    void (async () => {
      const r = await restoreAccount(email);
      if (cancelled || !r.ok) return;
      const next: Session = { accountId: r.account.id, role: "owner" };
      setNamespace(r.account.id);
      saveSession(next);
      setAccount(r.account);
      setFresh(true);
      setSession(next);
    })();
    return () => { cancelled = true; };
  }, [session]);

  /* Conteúdo do ADM (anúncios, salas, avisos, gerentes, memórias): chega a todos os telemóveis */
  useEffect(() => {
    if (!cloudOn()) return;
    const run = () => { void syncGlobalDown(); };
    run();
    const iv = setInterval(run, 180000);
    const vis = () => { if (document.visibilityState === "visible") run(); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", vis); };
  }, []);

  const enter = (s: Session) => {
    setNamespace(s.accountId);
    saveSession(s);
    setAccount(getAccount(s.accountId));
    setFresh(true);
    setSession(s);
  };

  const exit = () => {
    saveSession(null);
    setNamespace("");
    setSession(null);
    setAccount(null);
    setFresh(false);
  };

  const patchAccount = (patch: Parameters<typeof updateAccount>[1]) => {
    if (!session) return;
    const a = updateAccount(session.accountId, patch);
    if (a) setAccount(a);
  };

  if (!session || !account) {
    return (
      <Shell>
        <AccountGate
          onOwnerEnter={(a) => enter({ accountId: a.id, role: "owner" })}
          onStaffEnter={(accountId, staffId) => enter({ accountId, role: "staff", staffId })}
          onAdm={() => setAdm(true)}
        />
        {adm && <AdminRoom onClose={() => setAdm(false)} />}
      </Shell>
    );
  }

  return <Workspace key={session.accountId + session.role} account={account} session={session} fresh={fresh} onExit={exit} onAccountPatch={patchAccount} />;
}

/** Moldura igual à da app, para o ecrã de entrada. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="cj-root relative h-[100dvh] overflow-hidden bg-[#050505] text-white">
      <div className="grid-bg pointer-events-none absolute inset-0" />
      <div className="cj-col relative z-10 mx-auto flex h-[100dvh] w-full max-w-[430px] flex-col">
        <div className="cj-frame relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#121212]">
          {children}
        </div>
      </div>
    </div>
  );
}
