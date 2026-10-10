import { useCallback, useEffect, useRef } from "react";
import { getAccount, type Account } from "./accounts";
import { channelFor, leaveShadow, registerLive, runSync, type IO, type Snap, type SyncRes } from "./sync";
import type { AppNotification } from "./types";

const POLL_MS = 10000; // com a app aberta, pergunta à nuvem de 10 em 10 s (pedido minúsculo se nada mudou)
const DEBOUNCE_MS = 1500; // depois de uma alteração, envia ao fim de 1,5 s

interface Props {
  account: Account;
  /** estado vivo da sala (dados, ADM e conta) */
  getSnap: () => Snap;
  /** aplica ao estado vivo o resultado combinado com a nuvem */
  applySnap: IO["apply"];
  /** notificações novas que vieram do outro telemóvel */
  onIncoming: (n: AppNotification[]) => void;
  /** o acesso do funcionário foi bloqueado/removido */
  onDenied: (msg: string) => void;
  onWarn: (msg: string) => void;
}

/** Mantém esta sala em dia com a nuvem: envia as alterações, traz as do outro telemóvel e funde as duas. */
export function useLiveSync(p: Props) {
  const pr = useRef(p);
  pr.current = p;
  const accountId = p.account.id;
  const startedAt = useRef(Date.now() - 30000);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastWarn = useRef("");

  const io = useRef<IO>({
    read: () => pr.current.getSnap(),
    apply: (prev, merged, role) => {
      const known = new Set(pr.current.getSnap().data.notifications.map((n) => n.id));
      const fresh = merged.data.notifications.filter((n) => !known.has(n.id) && n.ts >= startedAt.current);
      pr.current.applySnap(prev, merged, role);
      if (fresh.length) pr.current.onIncoming(fresh);
    },
  }).current;

  const run = useCallback(async (): Promise<SyncRes> => {
    const ch = channelFor(getAccount(accountId));
    if (!ch) return { ok: false, reason: "nocloud", error: "" };

    const res = await runSync(accountId, ch, io);

    if (!res.ok && res.reason === "denied") {
      pr.current.onDenied(res.error);
    } else if (!res.ok && res.reason === "offline") {
      const msg = res.error || "A sincronização com a nuvem falhou. Os dados locais permanecem neste dispositivo. Verifica a ligação e tenta novamente.";
      if (lastWarn.current !== msg) {
        lastWarn.current = msg;
        pr.current.onWarn(msg);
      }
    } else if (res.ok) {
      lastWarn.current = "";
      if (res.warn) pr.current.onWarn(res.warn);
    }

    return res;
  }, [accountId, io]);

  useEffect(() => {
    registerLive({ accountId, run });
    const first = setTimeout(() => void run(), 400);
    const iv = setInterval(() => { if (document.visibilityState === "visible") void run(); }, POLL_MS);
    const trigger = () => void run();
    document.addEventListener("visibilitychange", trigger); // ao voltar à app traz o que mudou; ao sair envia o que falta
    window.addEventListener("online", trigger);
    return () => {
      registerLive(null);
      clearTimeout(first); clearInterval(iv);
      if (timer.current) clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", trigger);
      window.removeEventListener("online", trigger);
    };
  }, [accountId, run]);

  /** Chamar sempre que os dados mudam: agenda um envio. */
  const touch = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void run(), DEBOUNCE_MS);
  }, [run]);

  /** Funcionário a sair: envia o que falta e apaga a sala deste telemóvel. */
  const leave = useCallback(async () => {
    await new Promise((r) => setTimeout(r, 60)); // deixa o React gravar a última ação
    await leaveShadow(accountId, io);
  }, [accountId, io]);

  return { syncNow: run, touch, leave };
}
