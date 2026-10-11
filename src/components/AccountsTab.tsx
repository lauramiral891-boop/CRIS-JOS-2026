import { useEffect, useState } from "react";
import { cn } from "../utils/cn";
import { admAccounts, admConfirmPayment, admSetControl, cloudOn, type AdmAccount } from "../lib/cloud";

const card = "rounded-2xl border border-white/[0.08] bg-[#1b1b1b] p-3.5";
const btn = "rounded-xl px-3 py-2 text-[12px] font-extrabold uppercase active:scale-95 disabled:opacity-40";
const inp = "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[13px] text-white outline-none";
const fmt = (s: string | null) => (s ? new Date(s).toLocaleDateString("pt-PT") : "—");

function estado(a: AdmAccount): { txt: string; cls: string } {
  if (a.status === "suspended") return { txt: "Suspensa", cls: "text-[#FF4D6D]" };
  if (a.blocked) return { txt: "Vencida", cls: "text-[#FF4D6D]" };
  if (a.paid_until) return { txt: "Pago", cls: "text-[#00FF88]" };
  return { txt: "Sem pagamento", cls: "text-[#FFC107]" };
}

export default function AccountsTab() {
  const [list, setList] = useState<AdmAccount[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [days, setDays] = useState("30");

  const load = async () => {
    if (!cloudOn()) { setMsg("A nuvem não está ligada."); return; }
    setBusy(true); setMsg("");
    const r = await admAccounts();
    setBusy(false);
    if (!r.ok) { setMsg(r.error + " (ligue à nuvem na barra amarela acima)"); return; }
    setList(Array.isArray(r.data) ? r.data : []);
  };
  useEffect(() => { void load(); }, []);

  const pay = async (a: AdmAccount) => {
    const n = Math.max(1, Number(days.replace(/[^\d]/g, "")) || 30);
    if (!window.confirm(`Confirmar pagamento de ${a.house_name || a.account_id}? Soma ${n} dias.`)) return;
    setBusy(true);
    const r = await admConfirmPayment(a.owner_uid, n);
    if (!r.ok) setMsg(r.error);
    await load();
  };

  const setStatus = async (a: AdmAccount, status: "active" | "suspended") => {
    const txt = status === "suspended" ? "SUSPENDER" : "reativar";
    if (!window.confirm(`Quer ${txt} a conta ${a.house_name || a.account_id}?`)) return;
    setBusy(true);
    await admSetControl(a.owner_uid, status, a.plan, a.note, 0);
    await load();
  };

  const t = q.trim().toLowerCase();
  const shown = list.filter((a) =>
    !t || [a.account_id, a.email, a.house_name].some((v) => (v ?? "").toLowerCase().includes(t)));
  const blocked = list.filter((a) => a.blocked).length;

  return (
    <div className="thin-scroll flex-1 space-y-3 overflow-y-auto px-4 py-3">
      <div className={card}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[12px] text-neutral-400">{list.length} contas • {blocked} bloqueadas</p>
          <button onClick={load} disabled={busy} className={cn(btn, "bg-white/10")}>{busy ? "A carregar…" : "Atualizar"}</button>
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Procurar por ID, email ou casa" className={inp} />
      </div>
      {msg && <p className="rounded-xl border border-[#FF4D6D]/40 bg-[#FF4D6D]/10 px-3 py-2 text-[11.5px] font-semibold text-[#FF8FA3]">{msg}</p>}
      {shown.map((a) => {
        const e = estado(a);
        const isOpen = open === a.owner_uid;
        return (
          <div key={a.owner_uid} className={card}>
            <button onClick={() => setOpen(isOpen ? null : a.owner_uid)} className="w-full text-left">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[14px] font-bold">{a.house_name || "(sem nome)"}</p>
                <span className={cn("shrink-0 text-[10.5px] font-extrabold uppercase", e.cls)}>{e.txt}</span>
              </div>
              <p className="text-[11px] text-neutral-400">ID: {a.account_id ?? "—"}</p>
              <p className="truncate text-[11px] text-neutral-500">{a.email ?? "sem email"}</p>
              <p className="text-[11px] text-neutral-500">Criada {fmt(a.created_at)} • Último acesso {fmt(a.last_access)} • Pago até {fmt(a.paid_until)}</p>
            </button>
            {isOpen && (
              <div className="mt-3 space-y-2 border-t border-white/[0.06] pt-3">
                <div className="flex items-center gap-2">
                  <input inputMode="numeric" value={days} onChange={(ev) => setDays(ev.target.value)} className={cn(inp, "w-20")} />
                  <span className="text-[11px] text-neutral-400">dias</span>
                  <button onClick={() => pay(a)} disabled={busy} className={cn(btn, "flex-1 bg-[#00FF88] text-black")}>Confirmar pagamento</button>
                </div>
                {a.status === "suspended"
                  ? <button onClick={() => setStatus(a, "active")} disabled={busy} className={cn(btn, "w-full bg-white/10")}>Reativar conta</button>
                  : <button onClick={() => setStatus(a, "suspended")} disabled={busy} className={cn(btn, "w-full bg-[#FF4D6D] text-white")}>Suspender conta</button>}
              </div>
            )}
          </div>
        );
      })}
      {!busy && shown.length === 0 && !msg && <p className="text-center text-[12px] text-neutral-500">Nenhuma conta encontrada.</p>}
    </div>
  );
}
