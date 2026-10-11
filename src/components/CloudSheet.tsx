import { useState } from "react";
import { Cloud, CloudOff } from "lucide-react";
import Sheet from "./Sheet";
import { ErrorBox, PrimaryButton, fieldCls } from "./ui";
import { cloudOn, hasSession, sendCode, signOutCloud, verifyCode } from "../lib/cloud";
import { pushAccount } from "../lib/sync";
import { getAccount } from "../lib/accounts";
import { getNamespace } from "../lib/storage";

/** Definições → Conta online: liga a conta ao email para ter os dados em qualquer telemóvel. */
export default function CloudSheet({ onClose }: { onClose: () => void }) {
  const acc = getAccount(getNamespace());
  const [on, setOn] = useState(() => !!acc && hasSession(acc.login));
  const [stage, setStage] = useState(0); const [code, setCode] = useState("");
  const [err, setErr] = useState(""); const [ok, setOk] = useState(""); const [busy, setBusy] = useState(false);
  const email = acc?.kind === "email" ? acc.login : "";

  const send = async () => { setBusy(true); setErr(""); const r = await sendCode(email); setBusy(false); if (!r.ok) return setErr(r.error); setStage(1); };
  const verify = async () => {
    setBusy(true); setErr("");
    const v = await verifyCode(email, code);
    if (!v.ok) { setBusy(false); return setErr(v.error); }
    const pushed = await pushAccount(acc!.id, true); setBusy(false);
    setOn(true); setStage(0); setCode(""); setOk(pushed ? "Conta ligada e dados guardados na nuvem." : "Ligado, mas não foi possível guardar agora. Tente «Sincronizar agora».");
  };
  const sync = async () => { setBusy(true); setErr(""); const r = await pushAccount(acc!.id, true); setBusy(false); if (r) setOk("Dados guardados na nuvem."); else setErr("Não foi possível sincronizar. Verifique a internet."); };

  return (
    <Sheet title="Conta online" subtitle="Os seus dados em qualquer telemóvel" accent="#00E5FF" onClose={onClose} z={70}>
      <div className="mt-3 space-y-3">
        {!cloudOn() ? (
          <p className="flex gap-2 rounded-xl bg-white/[0.05] p-3 text-[12.5px] text-neutral-300"><CloudOff size={16} className="mt-0.5 shrink-0" /> A nuvem ainda não está ativa nesta versão da app. Fale com um gerente.</p>
        ) : !email ? (
          <p className="rounded-xl bg-white/[0.05] p-3 text-[12.5px] text-neutral-300">Esta conta usa número de telefone. Para ter os dados online, crie uma conta com <b>email</b> e use a cópia de segurança para passar os dados.</p>
        ) : on ? (
          <>
            <p className="flex gap-2 rounded-xl border border-[#00FF88]/35 bg-[#00FF88]/[0.07] p-3 text-[12.5px] font-semibold text-[#00FF88]"><Cloud size={16} className="mt-0.5 shrink-0" /> Ligada a {email}. Os dados sincronizam sozinhos, também com os telemóveis dos seus funcionários.</p>
            <PrimaryButton tone="cyan" disabled={busy} onClick={() => void sync()}>{busy ? "A sincronizar…" : "Sincronizar agora"}</PrimaryButton>
            <button onClick={() => { signOutCloud(email); setOn(false); setOk(""); }} className="w-full text-center text-[12px] text-neutral-500 underline">Desligar neste telemóvel</button>
            <p className="text-[11px] leading-relaxed text-neutral-500">Para usar noutro telemóvel: no ecrã de entrada toque em «Recuperar por email». Os funcionários entram no telemóvel deles com o convite que criou: tudo o que fizerem chega aqui.</p>
          </>
        ) : stage === 0 ? (
          <>
            <p className="text-[12.5px] leading-relaxed text-neutral-300">Enviamos um código para <b>{email}</b> para confirmar que é você. Depois os seus dados ficam guardados na nuvem e pode recuperá-los se mudar de telemóvel.</p>
            <PrimaryButton tone="cyan" disabled={busy} onClick={() => void send()}>{busy ? "A enviar…" : "Enviar código por email"}</PrimaryButton>
          </>
        ) : (
          <>
            <input value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setErr(""); }} inputMode="numeric" autoFocus placeholder="000000" className={`${fieldCls} text-center font-display text-[28px] font-extrabold tracking-[0.4em]`} />
            <PrimaryButton tone="cyan" disabled={busy || code.length !== 6} onClick={() => void verify()}>{busy ? "A confirmar…" : "Confirmar e ligar"}</PrimaryButton>
          </>
        )}
        <ErrorBox msg={err} />
        {ok && <p className="text-[12px] font-semibold text-[#00FF88]">✓ {ok}</p>}
      </div>
    </Sheet>
  );
}
