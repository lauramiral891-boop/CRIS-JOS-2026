import PhotoAdjust from "./PhotoAdjust";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, Bot, Send, ShieldCheck, Activity, CreditCard, Megaphone, DoorOpen, BellRing, Check, X, Trash2, Lock, Copy,
  AlertTriangle, ImagePlus, Users, Brain, MessageCircle, Lightbulb, ChevronUp, ChevronDown, Plus, Eye, Pencil, Home as HomeIcon, Gamepad2,
} from "lucide-react";
import type { ActivityEvent, AdminData, Ad, AiMemory, AppData, Game, GlobalAdm, Manager, Room, RoomBlock } from "../lib/types";
import { Field, PrimaryButton, ErrorBox, fieldCls } from "./ui";
import { RoomView } from "./BillingUI";
import { safeLink } from "./GamesRoom";
import { applyAction, buildAdminPrompt, describe, isRisky, localPlan, parsePlan, type AdminAction, type World } from "../lib/admActions";
import { askOnline } from "../lib/assistant";
import { billInfo, confirmPayment, newPayment, rejectPayment, DAY } from "../lib/billing";
import { admLogin, loadGlobalAdm, loadUnknown, saveGlobalAdm, saveUnknown } from "../lib/adm";
import { BASE } from "../lib/brain";
import { ADM_EMAIL, cloudOn, hasSession, sendCode, verifyCode, signOutCloud, licenseRequest } from "../lib/cloud";
import { admDirty, lastPublishError, pushGlobalUp, syncGlobalDown } from "../lib/sync";
import { waLink } from "./BillingUI";
import { loadAccounts } from "../lib/accounts";
import { fileToImage } from "../lib/image";
import AccountsTab from "./AccountsTab";
import { clockHM, formatAOAshort, timeAgo } from "../lib/format";
import { defaultData, loadAdminFor, loadDataFor, saveAdminFor, saveDataFor, uid } from "../lib/storage";
import { cn } from "../utils/cn";

type TabId = "block" | "accounts" | "live" | "bill" | "ai" | "ads" | "rooms" | "alerts" | "mgrs" | "mem" | "games";
const ADM_ONLY = import.meta.env.VITE_APP_MODE === "adm";
const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "live", label: "Painel", icon: Activity }, { id: "accounts", label: "Contas", icon: Users }, { id: "block", label: "Bloqueio", icon: Lock }, { id: "bill", label: "Cobrança", icon: CreditCard }, { id: "ai", label: "IA", icon: Bot },
  { id: "ads", label: "Anúncios", icon: Megaphone }, { id: "rooms", label: "Salas", icon: DoorOpen }, { id: "alerts", label: "Avisos", icon: BellRing },
  { id: "mgrs", label: "Gerentes", icon: Users }, { id: "mem", label: "Memórias", icon: Brain },
  { id: "games", label: "Jogos", icon: Gamepad2 },
];

interface Msg { id: number; role: "user" | "assistant"; text: string; actions?: AdminAction[]; result?: string[] | "discarded"; busy?: boolean }

const card = "rounded-2xl border border-white/[0.08] bg-[#1b1b1b] p-3.5";
const btn = "rounded-xl px-3 py-2 text-[12px] font-extrabold uppercase active:scale-95 disabled:opacity-40";
const lbl = "text-[11px] font-bold uppercase tracking-wider text-neutral-400";
const COLORS = ["#00E5FF", "#00FF88", "#FFC107", "#FF7A1A", "#FF4D6D", "#B388FF"];

type OnG = (fn: (g: GlobalAdm) => GlobalAdm) => void;
type OnAdmin = (fn: (a: AdminData) => AdminData) => void;

/* ---------------- entrada protegida: só o proprietário do app ---------------- */
function Gate({ onUnlock }: { onUnlock: () => void }) {
  const [pw, setPw] = useState(""); const [err, setErr] = useState(""); const [show, setShow] = useState(false);
  const go = () => {
    const r = admLogin(pw);
    if (r.ok) onUnlock(); else { setErr(r.error); setPw(""); }
  };
  return (
    <form onSubmit={(e) => { e.preventDefault(); go(); }} className="flex flex-1 flex-col justify-center gap-3 px-6">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-[#FFC107] to-[#FF7A1A] text-black"><Lock size={28} /></span>
      <h2 className="text-center font-display text-[24px] font-extrabold uppercase">Sala do ADM</h2>
      <p className="text-center text-[12px] text-neutral-400">Acesso exclusivo do proprietário do app CrisJoseGamer. Introduza a senha única do ADM.</p>
      <div className="relative">
        <input type={show ? "text" : "password"} autoFocus autoCapitalize="none" autoCorrect="off" spellCheck={false} value={pw} onChange={(e) => { setPw(e.target.value); setErr(""); }} placeholder="Senha do ADM" className={cn(fieldCls, "pr-11")} />
        <button type="button" onClick={() => setShow((v) => !v)} aria-label="Mostrar senha" className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500"><Eye size={16} /></button>
      </div>
      <ErrorBox msg={err} />
      <PrimaryButton type="submit" tone="cyan" disabled={!pw.trim()}>Entrar</PrimaryButton>
    </form>
  );
}

/* ---------------- pequenos componentes ---------------- */
function PhotoPicker({ label, multiple, maxSide, quality, aspect, onPick, onError }: {
  label: string; aspect?: number; multiple?: boolean; maxSide?: number; quality?: number; onPick: (imgs: string[]) => void; onError: (m: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [adj, setAdj] = useState<string | null>(null);
  const change = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setBusy(true);
    try {
      const out: string[] = [];
      for (const f of Array.from(files).slice(0, 12)) out.push(await fileToImage(f, maxSide, quality));
      if (aspect && !multiple && out[0]) setAdj(out[0]); else onPick(out);
    } catch (e) { onError(e instanceof Error ? e.message : "Não foi possível ler a imagem."); }
    setBusy(false);
    if (ref.current) ref.current.value = "";
  };
  return (
    <>
      <input ref={ref} type="file" accept="image/*" multiple={multiple} className="hidden" onChange={(e) => void change(e.target.files)} />
      <button type="button" disabled={busy} onClick={() => ref.current?.click()} className={cn(btn, "flex w-full items-center justify-center gap-2 bg-[#00E5FF] text-black")}>
        <ImagePlus size={15} /> {busy ? "A preparar…" : label}
      </button>
      {adj && aspect && <PhotoAdjust src={adj} aspect={aspect} maxSide={maxSide} quality={quality} onCancel={() => setAdj(null)} onDone={(d) => { setAdj(null); onPick([d]); }} />}
    </>
  );
}

const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cn(fieldCls, p.className)} />;

/* ---------------- IA que altera a app ---------------- */
function AiTab({ world, aiKey, onApply, hasHouse }: { world: World; aiKey: string; onApply: (actions: AdminAction[]) => string[]; hasHouse: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([]); const [input, setInput] = useState(""); const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs]);
  const patch = (id: number, p: Partial<Msg>) => setMsgs((m) => m.map((x) => (x.id === id ? { ...x, ...p } : x)));

  const send = async (raw: string) => {
    const q = raw.trim(); if (!q || busy) return;
    setInput(""); setBusy(true);
    const aid = uid();
    setMsgs((m) => [...m, { id: uid(), role: "user", text: q }, { id: aid, role: "assistant", text: "", busy: true }]);
    let plan = localPlan(q);
    if (!plan && navigator.onLine) {
      try {
        let acc = "";
        await askOnline([{ role: "user", content: q }], buildAdminPrompt(world), aiKey, (d) => { acc += d; }, new AbortController().signal, 20000, { maxTokens: 900, temperature: 0.2 });
        plan = parsePlan(acc);
      } catch { /* cai para a mensagem abaixo */ }
    }
    if (plan) patch(aid, { busy: false, text: plan.reply, actions: plan.actions });
    else patch(aid, { busy: false, text: navigator.onLine ? "Não consegui transformar isso em alterações. Tente descrever de outra forma (ex.: «adiciona 3 máquinas», «cobra 15000 em 30 dias», «bloqueia o funcionário Ana»)." : "Sem internet só percebo comandos simples: «adiciona 3 máquinas», «cobra 15000», «bloqueia o acesso», «anúncio: …», «cria sala …»." });
    setBusy(false);
  };

  const ideas = ["Adiciona 3 máquinas", "Cria uma sala chamada Torneios", "Cobra 15000 em 30 dias", "Anúncio: Happy hour das 14h às 16h"];
  return (
    <>
      <div className="thin-scroll flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {msgs.length === 0 && (
          <div className="space-y-2">
            <div className={card}>
              <p className="text-[13px] leading-relaxed text-neutral-300">Escreva o que quer mudar e eu preparo as alterações. <b>Nada é aplicado sem tocar em «Aplicar»</b>.</p>
              {!hasHouse && <p className="mt-2 text-[12px] text-[#FFC107]">Sem casa escolhida só funcionam os pedidos de anúncios e salas.</p>}
            </div>
            {ideas.map((s) => <button key={s} onClick={() => void send(s)} className="block w-full rounded-xl border border-white/10 bg-[#1e1e1e] px-3.5 py-2.5 text-left text-[13px] font-semibold">{s}</button>)}
          </div>
        )}
        {msgs.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[90%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed", m.role === "user" ? "rounded-br-md bg-[#00E5FF] font-semibold text-black" : "rounded-bl-md border border-white/[0.08] bg-[#1e1e1e] text-neutral-200")}>
              {m.busy ? <span className="text-neutral-500">A preparar…</span> : m.text}
              {m.actions && m.actions.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {m.actions.map((a, i) => (
                    <p key={i} className={cn("flex gap-1.5 rounded-lg px-2 py-1.5 text-[12px]", isRisky(a) ? "bg-[#FF4D6D]/10 text-[#FF8FA3]" : "bg-white/[0.05]")}>
                      {isRisky(a) ? <AlertTriangle size={13} className="mt-0.5 shrink-0" /> : <Check size={13} className="mt-0.5 shrink-0 text-[#00FF88]" />}{describe(a)}
                    </p>
                  ))}
                  {!m.result && (
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => patch(m.id, { result: onApply(m.actions!) })} className={cn(btn, "flex-1 bg-[#00FF88] text-black")}>Aplicar</button>
                      <button onClick={() => patch(m.id, { result: "discarded" })} className={cn(btn, "bg-white/10")}>Descartar</button>
                    </div>
                  )}
                  {Array.isArray(m.result) && m.result.map((r, i) => <p key={i} className="text-[11.5px] text-[#00FF88]">✓ {r}</p>)}
                  {m.result === "discarded" && <p className="text-[11.5px] text-neutral-500">Descartado.</p>}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="flex items-center gap-2 border-t border-white/[0.07] bg-[#0e0e0e] px-4 py-3">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="O que quer mudar na app?" className="min-w-0 flex-1 rounded-full border border-white/10 bg-[#252525] px-4 py-3 text-[14px] outline-none focus:border-[#00E5FF]" />
        <button type="submit" disabled={busy || !input.trim()} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#00E5FF] text-black disabled:opacity-40" aria-label="Enviar"><Send size={18} /></button>
      </form>
    </>
  );
}

/* ---------------- painel em tempo real ---------------- */
function LiveTab({ data, admin, now }: { data: AppData; admin: AdminData; now: number }) {
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  const today = data.transactions.filter((t) => t.ts >= t0.getTime());
  const inc = today.filter((t) => t.type === "in").reduce((a, t) => a + t.value, 0);
  const out = today.filter((t) => t.type === "out").reduce((a, t) => a + t.value, 0);
  const pending = admin.billing.payments.filter((p) => p.status === "pending").length;
  const kpi: [string, string][] = [["Máquinas ativas", `${data.sessions.length}/${data.stations.length}`], ["Receita hoje", formatAOAshort(inc)], ["Despesas hoje", formatAOAshort(out)], ["Funcionários", `${data.staff.filter((s) => s.active).length}/${data.staff.length}`], ["Jogadores", String(data.players.length)], ["Pagamentos por confirmar", String(pending)]];
  return (
    <div className="thin-scroll flex-1 space-y-3 overflow-y-auto px-4 py-3">
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#00FF88]"><span className="live-dot h-2 w-2 rounded-full bg-[#00FF88]" /> Ao vivo — atualiza sozinho</p>
      <div className="grid grid-cols-2 gap-2">{kpi.map(([l, v]) => <div key={l} className={card}><p className="text-[10.5px] uppercase text-neutral-500">{l}</p><p className="font-display text-[20px] font-extrabold">{v}</p></div>)}</div>
      <div className={card}>
        <p className={cn(lbl, "mb-2")}>Atividade recente</p>
        {data.activity.length === 0 && <p className="text-[12px] text-neutral-500">Ainda sem atividade.</p>}
        {data.activity.slice(0, 30).map((e) => (
          <div key={e.id} className="flex gap-2 border-t border-white/[0.05] py-2 first:border-0">
            <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", e.severity === "delete" ? "bg-[#FF4D6D]" : e.severity === "warn" ? "bg-[#FFC107]" : "bg-[#00E5FF]")} />
            <div className="min-w-0 flex-1"><p className="text-[12.5px] font-semibold">{e.label}</p><p className="text-[10.5px] text-neutral-500">{e.actorName} • {clockHM(e.ts)} • {timeAgo(e.ts, now)}</p></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- cobrança (da casa escolhida) ---------------- */
function BillTab({ admin, now, onAdmin }: { admin: AdminData; now: number; onAdmin: OnAdmin }) {
  const b = admin.billing; const info = billInfo(b, now);
  const [house, setHouse] = useState(admin.houseId); const [days, setDays] = useState(String(b.periodDays)); const [code, setCode] = useState("");
  const [man, setMan] = useState({ amount: String(b.amount || ""), method: "Dinheiro" });
  const setB = (p: Partial<typeof b>) => onAdmin((a) => ({ ...a, billing: { ...a.billing, ...p } }));
  const num = (v: string) => Math.max(0, Number(v.replace(/[^\d]/g, "")) || 0);
  const label = { off: "Cobrança desligada", ok: "Em dia", soon: "A vencer", overdue: "Em atraso (tolerância)", blocked: "BLOQUEADO" }[info.status];
  const tone = info.status === "blocked" ? "text-[#FF4D6D]" : info.status === "overdue" || info.status === "soon" ? "text-[#FFC107]" : "text-[#00FF88]";
  const pays = [...b.payments].sort((x, y) => y.ts - x.ts);
  return (
    <div className="thin-scroll flex-1 space-y-3 overflow-y-auto px-4 py-3">
      <div className={card}>
        <p className={cn("font-display text-[22px] font-extrabold uppercase", tone)}>{label}</p>
        <p className="text-[12px] text-neutral-400">{b.dueAt ? `Acesso pago até ${new Date(b.dueAt).toLocaleDateString("pt-PT")}${info.daysLeft !== null ? ` (${info.daysLeft >= 0 ? `faltam ${info.daysLeft} dias` : `${-info.daysLeft} dias em atraso`})` : ""}` : "Sem data de vencimento definida."}</p>
        <p className="mt-1 text-[11px] text-neutral-500">ID desta casa: <b className="text-neutral-300">{admin.houseId}</b></p>
        <div className="mt-3 flex gap-2">
          <button onClick={() => setB({ manualBlock: !b.manualBlock })} className={cn(btn, "flex-1", b.manualBlock ? "bg-[#00FF88] text-black" : "bg-[#FF4D6D] text-white")}>{b.manualBlock ? "Desbloquear acesso" : "Bloquear acesso"}</button>
        </div>
      </div>

      <div className={card}>
        <p className={cn(lbl, "mb-2")}>Regras de cobrança</p>
        <button onClick={() => setB({ enabled: !b.enabled, dueAt: b.dueAt ?? (b.enabled ? null : now + b.periodDays * DAY) })} className={cn(btn, "mb-3 w-full", b.enabled ? "bg-[#00FF88]/15 text-[#00FF88]" : "bg-white/10")}>{b.enabled ? "Cobrança ligada" : "Cobrança desligada — ligar"}</button>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Valor (AOA)"><input inputMode="numeric" value={b.amount || ""} onChange={(e) => setB({ amount: num(e.target.value) })} className={fieldCls} /></Field>
          <Field label="Dias por pagamento"><input inputMode="numeric" value={b.periodDays} onChange={(e) => setB({ periodDays: Math.max(1, num(e.target.value)) })} className={fieldCls} /></Field>
          <Field label="Tolerância (dias)"><input inputMode="numeric" value={b.graceDays} onChange={(e) => setB({ graceDays: num(e.target.value) })} className={fieldCls} /></Field>
          <Field label="Avisar antes (dias)"><input inputMode="numeric" value={b.warnDays} onChange={(e) => setB({ warnDays: num(e.target.value) })} className={fieldCls} /></Field>
        </div>
        <div className="mt-2"><Field label="Como pagar (o cliente vê isto)"><textarea rows={3} value={b.instructions} onChange={(e) => setB({ instructions: e.target.value })} placeholder="Ex.: Multicaixa Express 9XX XXX XXX — nome… Enviar o comprovativo." className={fieldCls} /></Field></div>
      </div>

      <div className={card}>
        <p className={cn(lbl, "mb-2")}>Pagamentos</p>
        {pays.length === 0 && <p className="text-[12px] text-neutral-500">Ainda sem pagamentos.</p>}
        {pays.map((p) => (
          <div key={p.id} className="border-t border-white/[0.05] py-2 first:border-0">
            <div className="flex items-center justify-between"><p className="text-[13px] font-bold">{formatAOAshort(p.amount)} <span className="text-[11px] font-normal text-neutral-500">{p.method}</span></p>
              <span className={cn("text-[10.5px] font-extrabold uppercase", p.status === "confirmed" ? "text-[#00FF88]" : p.status === "rejected" ? "text-[#FF4D6D]" : "text-[#FFC107]")}>{p.status === "confirmed" ? "Confirmado" : p.status === "rejected" ? "Recusado" : "Por confirmar"}</span></div>
            <p className="text-[11px] text-neutral-500">{new Date(p.ts).toLocaleString("pt-PT")}{p.ref ? ` • ref: ${p.ref}` : ""}</p>
            {p.status === "pending" && (
              <div className="mt-1.5 flex gap-2">
                <button onClick={() => onAdmin((a) => ({ ...a, billing: confirmPayment(a.billing, p.id, Date.now()) }))} className={cn(btn, "flex-1 bg-[#00FF88] text-black")}><Check size={13} className="mr-1 inline" />Confirmar</button>
                <button onClick={() => onAdmin((a) => ({ ...a, billing: rejectPayment(a.billing, p.id, Date.now()) }))} className={cn(btn, "bg-[#FF4D6D]/15 text-[#FF4D6D]")}><X size={13} className="mr-1 inline" />Recusar</button>
              </div>
            )}
          </div>
        ))}
        <div className="mt-3 grid grid-cols-[1fr_1fr_auto] items-end gap-2 border-t border-white/[0.05] pt-3">
          <Field label="Recebi (AOA)"><input inputMode="numeric" value={man.amount} onChange={(e) => setMan({ ...man, amount: e.target.value })} className={fieldCls} /></Field>
          <Field label="Forma"><input value={man.method} onChange={(e) => setMan({ ...man, method: e.target.value })} className={fieldCls} /></Field>
          <button onClick={() => onAdmin((a) => { const p = newPayment(num(man.amount), man.method || "Manual", "", "pending"); return { ...a, billing: confirmPayment({ ...a.billing, payments: [p, ...a.billing.payments] }, p.id, Date.now()) }; })} className={cn(btn, "bg-[#00E5FF] text-black")}>Registar</button>
        </div>
      </div>

      <div className={card}>
        <p className={cn(lbl, "mb-1")}>Código de ativação (sem internet)</p>
        <p className="mb-2 text-[11px] text-neutral-500">Para uma casa noutro telemóvel: peça-lhe o ID que aparece no ecrã de bloqueio, gere o código e envie por WhatsApp.</p>
        <div className="grid grid-cols-2 gap-2">
          <Field label="ID da casa"><input value={house} onChange={(e) => setHouse(e.target.value.toUpperCase())} className={fieldCls} /></Field>
          <Field label="Dias de acesso"><input inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} className={fieldCls} /></Field>
        </div>
        <button onClick={async () => { setCode(""); const until = Date.now() + Math.max(1, num(days)) * DAY; const r = await licenseRequest("generate", { houseId: house.trim().toUpperCase(), until }, ADM_EMAIL); if (!r.ok) { window.alert(r.error); return; } setCode(typeof r.data.code === "string" ? r.data.code : ""); }} className={cn(btn, "mt-2 w-full bg-white/10")}>Gerar código</button>
        {code && <button onClick={() => void navigator.clipboard?.writeText(code)} className="mt-2 flex w-full items-center justify-between rounded-xl bg-[#00E5FF]/10 px-3 py-2.5 font-mono text-[14px] font-bold text-[#00E5FF]">{code}<Copy size={14} /></button>}
      </div>
    </div>
  );
}

/* ---------------- Sala de Jogos: capa, nome, descrição e link de download ---------------- */
function GamesTab({ g, onG, onWarn }: { g: GlobalAdm; onG: OnG; onWarn: (m: string) => void }) {
  const empty = { name: "", description: "", link: "", cover: "" };
  const [f, setF] = useState(empty);
  const [err, setErr] = useState("");
  const games = g.games ?? [];
  const edit = (id: number, p: Partial<Game>) => onG((x) => ({ ...x, games: (x.games ?? []).map((y) => (y.id === id ? { ...y, ...p } : y)) }));
  const move = (id: number, d: -1 | 1) => onG((x) => {
    const l = [...(x.games ?? [])]; const i = l.findIndex((y) => y.id === id); const j = i + d;
    if (i < 0 || j < 0 || j >= l.length) return x;
    [l[i], l[j]] = [l[j], l[i]];
    return { ...x, games: l };
  });
  const add = () => {
    const name = f.name.trim();
    if (!name) return setErr("Escreva o nome do jogo.");
    const link = safeLink(f.link);
    if (!link) return setErr("Cole o link de download (começa por https://).");
    if (games.length >= 60) return setErr("Máximo de 60 jogos. Apague algum.");
    const game: Game = { id: uid(), name, description: f.description.trim(), cover: f.cover || undefined, link, active: true, createdAt: Date.now() };
    onG((x) => ({ ...x, games: [game, ...(x.games ?? [])].slice(0, 60) }));
    setF(empty); setErr("");
  };
  return (
    <div className="thin-scroll flex-1 space-y-3 overflow-y-auto px-4 py-3">
      <div className={card}>
        <p className={cn(lbl, "mb-2")}>Novo jogo</p>
        <div className="space-y-2">
          {f.cover && (
            <div className="relative">
              <img src={f.cover} alt="" className="aspect-[16/10] w-full rounded-xl object-contain bg-black/40" />
              <button onClick={() => setF({ ...f, cover: "" })} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/70" aria-label="Tirar capa"><X size={14} /></button>
            </div>
          )}
          <PhotoPicker label={f.cover ? "Trocar capa do jogo" : "Escolher capa do jogo"} aspect={16 / 10} maxSide={640} quality={0.72} onError={onWarn} onPick={(imgs) => setF({ ...f, cover: imgs[0] ?? "" })} />
          <Input value={f.name} onChange={(e) => { setF({ ...f, name: e.target.value }); setErr(""); }} placeholder="Nome do jogo" />
          <textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Descrição do jogo" rows={3} className={cn(fieldCls, "resize-none")} />
          <Input value={f.link} onChange={(e) => { setF({ ...f, link: e.target.value }); setErr(""); }} placeholder="Link do jogo (https://…)" inputMode="url" autoCapitalize="none" />
          <ErrorBox msg={err} />
          <button onClick={add} className={cn(btn, "w-full bg-[#7CFF1A] text-black")}><Plus size={13} className="mr-1 inline" />Publicar na Sala de Jogos</button>
        </div>
        <p className="mt-2 text-[10.5px] text-neutral-500">O botão «Clique aqui para baixar» fica ligado a este link. Todos veem os jogos ativos na Sala de Jogos (precisa da nuvem ligada para chegar a outros telemóveis).</p>
      </div>

      {games.length === 0 && <p className="text-center text-[12px] text-neutral-500">Ainda sem jogos.</p>}
      {games.map((x, i) => (
        <div key={x.id} className={card}>
          <div className="flex gap-3">
            {x.cover ? <img src={x.cover} alt="" className="h-20 w-28 shrink-0 rounded-xl object-contain bg-black/40" /> : <span className="grid h-20 w-28 shrink-0 place-items-center rounded-xl bg-[#7CFF1A]/10 text-[#7CFF1A]"><Gamepad2 size={22} /></span>}
            <div className="min-w-0 flex-1 space-y-1.5">
              <Input value={x.name} onChange={(e) => edit(x.id, { name: e.target.value })} placeholder="Nome" className="py-1.5" />
              <Input value={x.link} onChange={(e) => edit(x.id, { link: e.target.value })} onBlur={(e) => { const l = safeLink(e.target.value); if (l && l !== x.link) edit(x.id, { link: l }); }} placeholder="Link" className="py-1.5" />
            </div>
          </div>
          <textarea value={x.description} onChange={(e) => edit(x.id, { description: e.target.value })} placeholder="Descrição" rows={2} className={cn(fieldCls, "mt-2 resize-none py-1.5")} />
          {!safeLink(x.link) && <p className="mt-1 text-[11px] font-semibold text-[#FF8FA3]">Link inválido: o botão fica indisponível.</p>}
          <div className="mt-2 flex items-center gap-2">
            <button onClick={() => edit(x.id, { active: !x.active })} className={cn(btn, "flex-1", x.active ? "bg-[#00FF88]/15 text-[#00FF88]" : "bg-white/10")}>{x.active ? "Visível" : "Escondido"}</button>
            <button disabled={i === 0} onClick={() => move(x.id, -1)} className={cn(btn, "bg-white/10")} aria-label="Subir"><ChevronUp size={14} /></button>
            <button disabled={i === games.length - 1} onClick={() => move(x.id, 1)} className={cn(btn, "bg-white/10")} aria-label="Descer"><ChevronDown size={14} /></button>
            <button onClick={() => onG((y) => ({ ...y, games: (y.games ?? []).filter((z) => z.id !== x.id) }))} className={cn(btn, "bg-[#FF4D6D]/15 text-[#FF4D6D]")} aria-label="Apagar"><Trash2 size={13} /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- anúncios: fotos que deslizam no rodapé ---------------- */
function AdsTab({ g, onG, onWarn }: { g: GlobalAdm; onG: OnG; onWarn: (m: string) => void }) {
  const [f, setF] = useState({ title: "", text: "", link: "" });
  const link = /^https?:\/\//.test(f.link.trim()) ? f.link.trim() : "";
  const mk = (image?: string): Ad => ({ id: uid(), title: f.title.trim(), text: f.text.trim(), link, active: true, views: 0, clicks: 0, image });
  const move = (id: number, d: -1 | 1) => onG((x) => {
    const i = x.ads.findIndex((a) => a.id === id); const j = i + d;
    if (i < 0 || j < 0 || j >= x.ads.length) return x;
    const ads = [...x.ads]; [ads[i], ads[j]] = [ads[j], ads[i]];
    return { ...x, ads };
  });
  const edit = (id: number, p: Partial<Ad>) => onG((x) => ({ ...x, ads: x.ads.map((a) => (a.id === id ? { ...a, ...p } : a)) }));
  return (
    <div className="thin-scroll flex-1 space-y-3 overflow-y-auto px-4 py-3">
      <button onClick={() => onG((x) => ({ ...x, adsOn: !x.adsOn }))} className={cn(btn, "w-full", g.adsOn ? "bg-[#00FF88]/15 text-[#00FF88]" : "bg-white/10")}>{g.adsOn ? "Rodapé de anúncios ligado" : "Rodapé de anúncios desligado — ligar"}</button>
      <div className={card}>
        <p className={cn(lbl, "mb-2")}>Velocidade do deslize</p>
        <div className="flex gap-2">
          {[3, 5, 8, 12].map((s) => <button key={s} onClick={() => onG((x) => ({ ...x, slideSec: s }))} className={cn(btn, "flex-1", g.slideSec === s ? "bg-[#00E5FF] text-black" : "bg-white/10")}>{s}s</button>)}
        </div>
      </div>

      <div className={card}>
        <p className={cn(lbl, "mb-2")}>Novos anúncios</p>
        <div className="space-y-2">
          <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Título (opcional nas fotos)" />
          <Input value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} placeholder="Texto curto (opcional nas fotos)" />
          <Input value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} placeholder="Link ao tocar (opcional, https://…)" />
          <PhotoPicker label="Enviar fotografias" multiple maxSide={900} quality={0.72} onError={onWarn}
            onPick={(imgs) => { onG((x) => ({ ...x, ads: [...x.ads, ...imgs.map((im) => mk(im))], adsOn: true })); setF({ title: "", text: "", link: "" }); }} />
          <button disabled={!f.title.trim() || !f.text.trim()} onClick={() => { onG((x) => ({ ...x, ads: [...x.ads, mk()], adsOn: true })); setF({ title: "", text: "", link: "" }); }} className={cn(btn, "w-full bg-white/10")}>Adicionar só de texto</button>
        </div>
        <p className="mt-2 text-[10.5px] text-neutral-500">As fotos são reduzidas automaticamente para ocuparem pouco espaço. Pode escolher várias de uma vez.</p>
      </div>

      {g.ads.length === 0 && <p className="text-center text-[12px] text-neutral-500">Ainda sem anúncios.</p>}
      {g.ads.map((a, i) => (
        <div key={a.id} className={card}>
          <div className="flex gap-3">
            {a.image ? <img src={a.image} alt="" className="h-20 w-28 shrink-0 rounded-xl object-contain bg-black/40" /> : <span className="grid h-20 w-28 shrink-0 place-items-center rounded-xl bg-[#FFC107]/10 text-[#FFC107]"><Megaphone size={22} /></span>}
            <div className="min-w-0 flex-1 space-y-1.5">
              <Input value={a.title} onChange={(e) => edit(a.id, { title: e.target.value })} placeholder="Título" className="py-1.5" />
              <Input value={a.text} onChange={(e) => edit(a.id, { text: e.target.value })} placeholder="Texto" className="py-1.5" />
            </div>
          </div>
          <p className="mt-1.5 text-[10.5px] text-neutral-500">{a.views} vistas • {a.clicks} toques{a.link ? ` • ${a.link}` : ""}</p>
          <div className="mt-2 flex items-center gap-2">
            <button onClick={() => edit(a.id, { active: !a.active })} className={cn(btn, "flex-1", a.active ? "bg-[#00FF88]/15 text-[#00FF88]" : "bg-white/10")}>{a.active ? "Ativo" : "Pausado"}</button>
            <button disabled={i === 0} onClick={() => move(a.id, -1)} className={cn(btn, "bg-white/10")} aria-label="Subir"><ChevronUp size={14} /></button>
            <button disabled={i === g.ads.length - 1} onClick={() => move(a.id, 1)} className={cn(btn, "bg-white/10")} aria-label="Descer"><ChevronDown size={14} /></button>
            <button onClick={() => onG((x) => ({ ...x, ads: x.ads.filter((y) => y.id !== a.id) }))} className={cn(btn, "bg-[#FF4D6D]/15 text-[#FF4D6D]")} aria-label="Apagar"><Trash2 size={13} /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- salas / abas personalizadas ---------------- */
const newBlock = (kind: "text" | "prices" | "schedule" | "rules" | "button" | "gallery" | "signup"): RoomBlock => {
  const id = uid();
  switch (kind) {
    case "text": return { id, kind: "text", title: "", text: "" };
    case "prices": return { id, kind: "list", variant: "prices", title: "Tabela de preços", items: [{ left: "1 hora", right: "500 Kz" }] };
    case "schedule": return { id, kind: "list", variant: "schedule", title: "Horários", items: [{ left: "Segunda a Sexta", right: "09h – 23h" }] };
    case "rules": return { id, kind: "list", variant: "rules", title: "Regras", items: [{ left: "", right: "" }] };
    case "button": return { id, kind: "button", label: "Falar connosco", mode: "whatsapp", target: "", message: "Olá! Vim pela app." };
    case "gallery": return { id, kind: "gallery", title: "Galeria", images: [] };
    case "signup": return { id, kind: "signup", title: "Inscrição", note: "", whatsapp: "", askExtra: "" };
  }
};

const TEMPLATES: { key: string; label: string; emoji: string; make: () => Pick<Room, "name" | "emoji" | "subtitle" | "color" | "blocks"> }[] = [
  { key: "torneio", label: "Torneio", emoji: "🏆", make: () => ({ name: "Torneio", emoji: "🏆", subtitle: "Inscrições abertas", color: "#FFC107", blocks: [{ id: uid(), kind: "text", title: "Sobre o torneio", text: "Data, prémios e formato do torneio." }, newBlock("signup"), newBlock("rules")] }) },
  { key: "precos", label: "Preços", emoji: "💰", make: () => ({ name: "Preços", emoji: "💰", subtitle: "Tabela atualizada", color: "#00FF88", blocks: [newBlock("prices"), newBlock("button")] }) },
  { key: "regras", label: "Regras", emoji: "📜", make: () => ({ name: "Regras", emoji: "📜", subtitle: "Para jogar em paz", color: "#00E5FF", blocks: [newBlock("rules")] }) },
  { key: "contacto", label: "Contacto", emoji: "📞", make: () => ({ name: "Contacto", emoji: "📞", subtitle: "Fale connosco", color: "#B388FF", blocks: [newBlock("schedule"), newBlock("button")] }) },
  { key: "branco", label: "Em branco", emoji: "🚪", make: () => ({ name: "Nova sala", emoji: "🚪", subtitle: "", color: "#00E5FF", blocks: [] }) },
];

function BlockEditor({ b, onChange, onDelete, onMove, first, last, onWarn }: {
  b: RoomBlock; onChange: (b: RoomBlock) => void; onDelete: () => void; onMove: (d: -1 | 1) => void; first: boolean; last: boolean; onWarn: (m: string) => void;
}) {
  const name = b.kind === "list" ? (b.variant === "prices" ? "Preços" : b.variant === "schedule" ? "Horários" : "Regras") : { text: "Texto", button: "Botão", gallery: "Galeria", signup: "Inscrição" }[b.kind];
  return (
    <div className="rounded-xl border border-white/10 bg-[#222] p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <span className="flex-1 text-[11px] font-extrabold uppercase tracking-wider text-[#00E5FF]">{name}</span>
        <button disabled={first} onClick={() => onMove(-1)} className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 disabled:opacity-30" aria-label="Subir"><ChevronUp size={14} /></button>
        <button disabled={last} onClick={() => onMove(1)} className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 disabled:opacity-30" aria-label="Descer"><ChevronDown size={14} /></button>
        <button onClick={onDelete} className="grid h-7 w-7 place-items-center rounded-lg bg-[#FF4D6D]/15 text-[#FF4D6D]" aria-label="Apagar bloco"><Trash2 size={13} /></button>
      </div>
      <div className="space-y-2">
        {b.kind === "text" && (<>
          <Input value={b.title ?? ""} onChange={(e) => onChange({ ...b, title: e.target.value })} placeholder="Título (opcional)" />
          <textarea rows={4} value={b.text} onChange={(e) => onChange({ ...b, text: e.target.value })} placeholder="Texto" className={fieldCls} />
        </>)}
        {b.kind === "list" && (<>
          <Input value={b.title ?? ""} onChange={(e) => onChange({ ...b, title: e.target.value })} placeholder="Título" />
          {b.items.map((it, k) => (
            <div key={k} className="flex items-center gap-1.5">
              <Input value={it.left} onChange={(e) => onChange({ ...b, items: b.items.map((x, i) => (i === k ? { ...x, left: e.target.value } : x)) })} placeholder={b.variant === "rules" ? "Regra" : b.variant === "prices" ? "Item" : "Dia"} />
              {b.variant !== "rules" && <Input value={it.right} onChange={(e) => onChange({ ...b, items: b.items.map((x, i) => (i === k ? { ...x, right: e.target.value } : x)) })} placeholder={b.variant === "prices" ? "Preço" : "Hora"} className="max-w-[34%]" />}
              <button onClick={() => onChange({ ...b, items: b.items.filter((_, i) => i !== k) })} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 text-neutral-400" aria-label="Remover linha"><X size={14} /></button>
            </div>
          ))}
          <button onClick={() => onChange({ ...b, items: [...b.items, { left: "", right: "" }] })} className={cn(btn, "w-full bg-white/10")}><Plus size={13} className="mr-1 inline" />Linha</button>
        </>)}
        {b.kind === "button" && (<>
          <Input value={b.label} onChange={(e) => onChange({ ...b, label: e.target.value })} placeholder="Texto do botão" />
          <div className="flex gap-1.5">
            {([["whatsapp", "WhatsApp"], ["call", "Ligar"], ["link", "Link"]] as const).map(([m, t]) => <button key={m} onClick={() => onChange({ ...b, mode: m })} className={cn(btn, "flex-1", b.mode === m ? "bg-[#00E5FF] text-black" : "bg-white/10")}>{t}</button>)}
          </div>
          <Input value={b.target} onChange={(e) => onChange({ ...b, target: e.target.value })} inputMode={b.mode === "link" ? "url" : "tel"} placeholder={b.mode === "link" ? "https://…" : "Número (ex.: 923 000 000)"} />
          {b.mode === "whatsapp" && <Input value={b.message ?? ""} onChange={(e) => onChange({ ...b, message: e.target.value })} placeholder="Mensagem já escrita" />}
        </>)}
        {b.kind === "gallery" && (<>
          <Input value={b.title ?? ""} onChange={(e) => onChange({ ...b, title: e.target.value })} placeholder="Título (opcional)" />
          {b.images.length > 0 && (
            <div className="grid grid-cols-3 gap-1.5">
              {b.images.map((src, k) => (
                <div key={k} className="relative">
                  <img src={src} alt="" className="h-20 w-full rounded-lg object-cover" />
                  <button onClick={() => onChange({ ...b, images: b.images.filter((_, i) => i !== k) })} className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/70" aria-label="Remover foto"><X size={11} /></button>
                </div>
              ))}
            </div>
          )}
          <PhotoPicker label="Adicionar fotos" multiple maxSide={800} quality={0.72} onError={onWarn} onPick={(imgs) => onChange({ ...b, images: [...b.images, ...imgs].slice(0, 12) })} />
        </>)}
        {b.kind === "signup" && (<>
          <Input value={b.title} onChange={(e) => onChange({ ...b, title: e.target.value })} placeholder="Título (ex.: Inscrição no torneio)" />
          <Input value={b.note ?? ""} onChange={(e) => onChange({ ...b, note: e.target.value })} placeholder="Nota (ex.: vagas limitadas)" />
          <Input value={b.whatsapp} onChange={(e) => onChange({ ...b, whatsapp: e.target.value })} inputMode="tel" placeholder="WhatsApp que recebe as inscrições" />
          <Input value={b.askExtra ?? ""} onChange={(e) => onChange({ ...b, askExtra: e.target.value })} placeholder="Pergunta extra (opcional, ex.: Jogo preferido)" />
        </>)}
      </div>
    </div>
  );
}

function RoomEditor({ room, onChange, onDone, onWarn }: { room: Room; onChange: (r: Room) => void; onDone: () => void; onWarn: (m: string) => void }) {
  const [preview, setPreview] = useState(false);
  const blocks = room.blocks ?? [];
  const setBlocks = (b: RoomBlock[]) => onChange({ ...room, blocks: b });
  const move = (i: number, d: -1 | 1) => { const j = i + d; if (j < 0 || j >= blocks.length) return; const c = [...blocks]; [c[i], c[j]] = [c[j], c[i]]; setBlocks(c); };
  const adders: { k: Parameters<typeof newBlock>[0]; t: string }[] = [
    { k: "text", t: "Texto" }, { k: "prices", t: "Preços" }, { k: "schedule", t: "Horários" }, { k: "rules", t: "Regras" },
    { k: "button", t: "Botão" }, { k: "gallery", t: "Galeria" }, { k: "signup", t: "Inscrição" },
  ];
  return (
    <div className="thin-scroll flex-1 space-y-3 overflow-y-auto px-4 py-3">
      <div className="flex gap-2">
        <button onClick={onDone} className={cn(btn, "flex items-center gap-1.5 bg-white/10")}><ArrowLeft size={14} />Salas</button>
        <button onClick={() => setPreview(true)} className={cn(btn, "flex flex-1 items-center justify-center gap-1.5 bg-[#00E5FF] text-black")}><Eye size={14} />Pré-visualizar</button>
      </div>
      <div className={card}>
        <div className="grid grid-cols-[64px_1fr] gap-2">
          <Input value={room.emoji} onChange={(e) => onChange({ ...room, emoji: e.target.value.slice(0, 2) })} className="text-center" />
          <Input value={room.name} onChange={(e) => onChange({ ...room, name: e.target.value.slice(0, 30) })} placeholder="Nome da sala" />
        </div>
        <div className="mt-2"><Input value={room.subtitle ?? ""} onChange={(e) => onChange({ ...room, subtitle: e.target.value.slice(0, 60) })} placeholder="Frase por baixo do nome (opcional)" /></div>
        <p className={cn(lbl, "mb-1.5 mt-3")}>Cor da sala</p>
        <div className="flex gap-2">
          {COLORS.map((c) => <button key={c} onClick={() => onChange({ ...room, color: c })} style={{ background: c }} className={cn("h-8 w-8 rounded-full", (room.color || "#00E5FF") === c && "ring-2 ring-white ring-offset-2 ring-offset-[#1b1b1b]")} aria-label={`Cor ${c}`} />)}
        </div>
        <p className={cn(lbl, "mb-1.5 mt-3")}>Foto de capa</p>
        {room.cover && <img src={room.cover} alt="" className="mb-2 aspect-[5/2] w-full rounded-xl object-cover" />}
        <div className="flex gap-2">
          <div className="flex-1"><PhotoPicker label={room.cover ? "Trocar capa" : "Escolher capa"} aspect={5 / 2} maxSide={900} quality={0.74} onError={onWarn} onPick={(im) => onChange({ ...room, cover: im[0] })} /></div>
          {room.cover && <button onClick={() => onChange({ ...room, cover: undefined })} className={cn(btn, "bg-white/10")}>Tirar</button>}
        </div>
      </div>

      {blocks.map((b, i) => (
        <BlockEditor key={b.id} b={b} first={i === 0} last={i === blocks.length - 1} onWarn={onWarn}
          onChange={(nb) => setBlocks(blocks.map((x) => (x.id === b.id ? nb : x)))} onDelete={() => setBlocks(blocks.filter((x) => x.id !== b.id))} onMove={(d) => move(i, d)} />
      ))}
      <div className={card}>
        <p className={cn(lbl, "mb-2")}>Adicionar à sala</p>
        <div className="flex flex-wrap gap-1.5">
          {adders.map((a) => <button key={a.k} onClick={() => setBlocks([...blocks, newBlock(a.k)])} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[12px] font-bold"><Plus size={11} className="mr-0.5 inline" />{a.t}</button>)}
        </div>
      </div>
      {preview && <div className="absolute inset-0 z-[60]"><RoomView room={room} onClose={() => setPreview(false)} /></div>}
    </div>
  );
}

function RoomsTab({ g, onG, onWarn }: { g: GlobalAdm; onG: OnG; onWarn: (m: string) => void }) {
  const [editId, setEditId] = useState<number | null>(null);
  const editing = g.rooms.find((r) => r.id === editId);
  const setRoom = (r: Room) => onG((x) => ({ ...x, rooms: x.rooms.map((y) => (y.id === r.id ? r : y)) }));
  if (editing) return <RoomEditor room={editing} onChange={setRoom} onDone={() => setEditId(null)} onWarn={onWarn} />;
  const create = (t: (typeof TEMPLATES)[number]) => {
    const room: Room = { id: uid(), content: "", active: true, ...t.make() };
    onG((x) => ({ ...x, rooms: [...x.rooms, room] }));
    setEditId(room.id);
  };
  return (
    <div className="thin-scroll flex-1 space-y-3 overflow-y-auto px-4 py-3">
      <p className="text-[12px] text-neutral-400">Cada sala aparece como atalho no topo da app para todos os utilizadores. Monte-a com blocos: texto, preços, horários, regras, botões de WhatsApp, galeria de fotos e inscrições.</p>
      {g.rooms.map((r) => (
        <div key={r.id} className={card} style={r.color ? { borderColor: `${r.color}55` } : undefined}>
          <div className="flex items-center gap-3">
            {r.cover ? <img src={r.cover} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" /> : <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-[22px]">{r.emoji}</span>}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-bold">{r.emoji} {r.name}</p>
              <p className="truncate text-[11.5px] text-neutral-400">{r.subtitle || `${(r.blocks ?? []).length} bloco(s)`}</p>
            </div>
          </div>
          <div className="mt-2.5 flex gap-2">
            <button onClick={() => setEditId(r.id)} className={cn(btn, "flex flex-1 items-center justify-center gap-1.5 bg-[#00E5FF] text-black")}><Pencil size={13} />Editar</button>
            <button onClick={() => setRoom({ ...r, active: !r.active })} className={cn(btn, r.active ? "bg-[#00FF88]/15 text-[#00FF88]" : "bg-white/10")}>{r.active ? "Visível" : "Escondida"}</button>
            <button onClick={() => onG((x) => ({ ...x, rooms: x.rooms.filter((y) => y.id !== r.id) }))} className={cn(btn, "bg-[#FF4D6D]/15 text-[#FF4D6D]")} aria-label="Apagar sala"><Trash2 size={13} /></button>
          </div>
        </div>
      ))}
      <div className={card}>
        <p className={cn(lbl, "mb-2")}>Criar sala nova</p>
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATES.map((t) => <button key={t.key} onClick={() => create(t)} className="rounded-xl border border-white/10 bg-[#222] px-3 py-3 text-left text-[13px] font-bold active:scale-95"><span className="mr-1.5 text-[18px]">{t.emoji}</span>{t.label}</button>)}
        </div>
      </div>
    </div>
  );
}

/* ---------------- avisos ---------------- */
function AlertsTab({ g, onG }: { g: GlobalAdm; onG: OnG }) {
  const [f, setF] = useState({ title: "", text: "" });
  return (
    <div className="thin-scroll flex-1 space-y-3 overflow-y-auto px-4 py-3">
      <div className={card}>
        <p className={cn(lbl, "mb-2")}>Novo aviso para todas as casas</p>
        <div className="space-y-2">
          <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Título" />
          <Input value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} placeholder="Mensagem" />
          <PrimaryButton tone="cyan" disabled={!f.title.trim()} onClick={() => { onG((x) => ({ ...x, notices: [{ id: uid(), ts: Date.now(), title: f.title.trim(), text: f.text.trim() }, ...x.notices].slice(0, 50) })); setF({ title: "", text: "" }); }}>Enviar aviso</PrimaryButton>
        </div>
        <p className="mt-2 text-[10.5px] text-neutral-500">Cada casa recebe o aviso uma vez, no sino e no ecrã, quando abrir a app neste telemóvel.</p>
      </div>
      {g.notices.map((n) => (
        <div key={n.id} className={cn(card, "flex items-start gap-3")}>
          <div className="min-w-0 flex-1"><p className="text-[13px] font-bold">{n.title}</p>{n.text && <p className="text-[12px] text-neutral-400">{n.text}</p>}<p className="mt-1 text-[10.5px] text-neutral-500">{new Date(n.ts).toLocaleString("pt-PT")}</p></div>
          <button onClick={() => onG((x) => ({ ...x, notices: x.notices.filter((y) => y.id !== n.id) }))} className="text-neutral-500" aria-label="Apagar aviso"><Trash2 size={15} /></button>
        </div>
      ))}
    </div>
  );
}

function BlockTab({ g, onG, onWarn }: { g: GlobalAdm; onG: OnG; onWarn: (m: string) => void }) {
  const b = { title: "", text: "", image: "", whatsapp: "", ...(g.blockScreen ?? {}) };
  const set = (p: Partial<typeof b>) => onG((x) => ({ ...x, blockScreen: { title: "", text: "", image: "", whatsapp: "", ...(x.blockScreen ?? {}), ...p } }));
  const pick = async (file?: File) => {
    if (!file) return;
    try { set({ image: await fileToImage(file, 800, 0.75) }); }
    catch (e) { onWarn(e instanceof Error ? e.message : "Não foi possível carregar a imagem."); }
  };
  return (
    <div className="thin-scroll flex-1 space-y-3 overflow-y-auto px-4 py-3">
      <div className={card}>
        <p className={cn(lbl, "mb-2")}>Ecrã de conta bloqueada</p>
        <div className="space-y-2">
          <Input value={b.title} onChange={(e) => set({ title: e.target.value })} placeholder="Título (vazio = Conta Bloqueada)" />
          <textarea rows={4} value={b.text} onChange={(e) => set({ text: e.target.value })} placeholder="Texto (vazio = Chame um assistente para fazer o pagamento.)" className={fieldCls} />
          <Input value={b.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} placeholder="WhatsApp e telefone (vazio = 945379003)" />
          <label className={cn(btn, "block cursor-pointer bg-white/10 text-center")}>
            {b.image ? "Trocar imagem" : "Adicionar imagem (opcional)"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          {b.image && (
            <>
              <img src={b.image} alt="" className="max-h-40 w-full rounded-xl object-contain bg-black/40" />
              <button onClick={() => set({ image: "" })} className={cn(btn, "w-full bg-[#FF4D6D]/15 text-[#FF4D6D]")}>Tirar imagem</button>
            </>
          )}
        </div>
        <p className="mt-2 text-[10.5px] text-neutral-500">É isto que o cliente vê quando a conta está bloqueada. Com tudo vazio aparece o texto padrão e o contacto 945379003.</p>
      </div>
      <div className={card}>
        <p className={cn(lbl, "mb-2")}>Pré-visualização</p>
        <p className="font-display text-[18px] font-extrabold uppercase">{b.title.trim() || "Conta Bloqueada"}</p>
        <p className="whitespace-pre-line text-[12.5px] text-neutral-300">{b.text.trim() || "Chame um assistente para fazer o pagamento."}</p>
        <p className="mt-1 text-[12px] font-bold text-[#00FF88]">WhatsApp / ligar: {b.whatsapp.trim() || "945379003"}</p>
      </div>
    </div>
  );
}

/* ---------------- gerentes reais (ajuda por WhatsApp) ---------------- */
function ManagersTab({ g, onG }: { g: GlobalAdm; onG: OnG }) {
  const [f, setF] = useState({ name: "", role: "Suporte", whatsapp: "", hours: "" });
  const ok = f.name.trim() && f.whatsapp.replace(/\D/g, "").length >= 9;
  const edit = (id: number, p: Partial<Manager>) => onG((x) => ({ ...x, managers: x.managers.map((m) => (m.id === id ? { ...m, ...p } : m)) }));
  const move = (id: number, d: -1 | 1) => onG((x) => {
    const i = x.managers.findIndex((m) => m.id === id); const j = i + d;
    if (i < 0 || j < 0 || j >= x.managers.length) return x;
    const l = [...x.managers]; [l[i], l[j]] = [l[j], l[i]]; return { ...x, managers: l };
  });
  return (
    <div className="thin-scroll flex-1 space-y-3 overflow-y-auto px-4 py-3">
      <div className={card}>
        <p className="text-[12.5px] leading-relaxed text-neutral-300">Os gerentes ativos aparecem aos proprietários em <b>Definições → Ajuda e Gerentes</b> e na <b>Assistente IA</b> (botão da boia). Tocar abre o WhatsApp com a mensagem pronta, com o nome da casa e o ID.</p>
      </div>
      <div className={card}>
        <p className={cn(lbl, "mb-2")}>Novo gerente</p>
        <div className="space-y-2">
          <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Nome (ex.: Cris José)" />
          <Input value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} placeholder="Função (ex.: Suporte, Cobrança, Comercial)" />
          <Input value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} inputMode="tel" placeholder="WhatsApp (ex.: 923 000 000)" />
          <Input value={f.hours} onChange={(e) => setF({ ...f, hours: e.target.value })} placeholder="Horário (opcional, ex.: Seg–Sáb 08h–20h)" />
          <button disabled={!ok} onClick={() => { onG((x) => ({ ...x, managers: [...x.managers, { id: uid(), name: f.name.trim(), role: f.role.trim() || "Gerente", whatsapp: f.whatsapp.trim(), hours: f.hours.trim(), active: true }].slice(0, 12) })); setF({ name: "", role: "Suporte", whatsapp: "", hours: "" }); }} className={cn(btn, "w-full bg-[#00E5FF] text-black")}><Plus size={13} className="mr-1 inline" />Adicionar gerente</button>
        </div>
      </div>
      {g.managers.length === 0 && <p className="text-center text-[12px] text-neutral-500">Ainda sem gerentes. Adicione o primeiro acima.</p>}
      {g.managers.map((m, i) => (
        <div key={m.id} className={card}>
          <div className="space-y-1.5">
            <div className="grid grid-cols-2 gap-1.5">
              <Input value={m.name} onChange={(e) => edit(m.id, { name: e.target.value })} placeholder="Nome" className="py-1.5" />
              <Input value={m.role} onChange={(e) => edit(m.id, { role: e.target.value })} placeholder="Função" className="py-1.5" />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <Input value={m.whatsapp} onChange={(e) => edit(m.id, { whatsapp: e.target.value })} inputMode="tel" placeholder="WhatsApp" className="py-1.5" />
              <Input value={m.hours ?? ""} onChange={(e) => edit(m.id, { hours: e.target.value })} placeholder="Horário" className="py-1.5" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button onClick={() => edit(m.id, { active: !m.active })} className={cn(btn, "flex-1", m.active ? "bg-[#00FF88]/15 text-[#00FF88]" : "bg-white/10")}>{m.active ? "Visível" : "Escondido"}</button>
            <a href={waLink(m.whatsapp, "Teste CJ Gerenciamento")} target="_blank" rel="noreferrer" className={cn(btn, "bg-[#25D366] text-black")} aria-label="Testar WhatsApp"><MessageCircle size={14} /></a>
            <button disabled={i === 0} onClick={() => move(m.id, -1)} className={cn(btn, "bg-white/10")} aria-label="Subir"><ChevronUp size={14} /></button>
            <button disabled={i === g.managers.length - 1} onClick={() => move(m.id, 1)} className={cn(btn, "bg-white/10")} aria-label="Descer"><ChevronDown size={14} /></button>
            <button onClick={() => onG((x) => ({ ...x, managers: x.managers.filter((y) => y.id !== m.id) }))} className={cn(btn, "bg-[#FF4D6D]/15 text-[#FF4D6D]")} aria-label="Apagar gerente"><Trash2 size={13} /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- memórias da IA ---------------- */
function MemoryTab({ g, onG }: { g: GlobalAdm; onG: OnG }) {
  const empty = { title: "", keywords: "", answer: "" };
  const [f, setF] = useState(empty);
  const [unk, setUnk] = useState(() => loadUnknown());
  const [showBase, setShowBase] = useState(false);
  const ok = f.title.trim() && f.answer.trim() && f.keywords.trim();
  const edit = (id: number, p: Partial<AiMemory>) => onG((x) => ({ ...x, memories: x.memories.map((m) => (m.id === id ? { ...m, ...p } : m)) }));
  const dropUnk = (q: string) => { const l = unk.filter((u) => u.q !== q); saveUnknown(l); setUnk(l); };
  return (
    <div className="thin-scroll flex-1 space-y-3 overflow-y-auto px-4 py-3">
      <div className={card}>
        <p className="text-[12.5px] leading-relaxed text-neutral-300">Ensine a IA com a <b>voz da CJ / Cris José</b>: preço oficial, formas de pagamento, promoções, regras, contactos. Quando um proprietário perguntar algo com as suas <b>palavras-chave</b>, ela responde com o seu texto — sem inventar. A IA já traz <b>{BASE.length} memórias</b> de base.</p>
      </div>

      {unk.length > 0 && (
        <div className={card}>
          <p className={cn(lbl, "mb-2 flex items-center gap-1.5")}><Lightbulb size={13} className="text-[#FFC107]" /> Perguntas que a IA não soube</p>
          {unk.slice(0, 8).map((u) => (
            <div key={u.q} className="flex items-center gap-2 border-t border-white/[0.05] py-2 first:border-0">
              <p className="min-w-0 flex-1 text-[12.5px]">{u.q}<span className="ml-1 text-[10.5px] text-neutral-500">×{u.n}</span></p>
              <button onClick={() => { setF({ title: u.q.slice(0, 60), keywords: u.q.toLowerCase().replace(/[?!.,]/g, "").split(/\s+/).filter((w) => w.length > 3).slice(0, 5).join(", "), answer: "" }); dropUnk(u.q); }} className={cn(btn, "bg-[#FFC107] text-black")}>Ensinar</button>
              <button onClick={() => dropUnk(u.q)} className="text-neutral-500" aria-label="Ignorar"><X size={15} /></button>
            </div>
          ))}
          <p className="mt-1 text-[10.5px] text-neutral-500">Só mostra perguntas feitas neste telemóvel.</p>
        </div>
      )}

      <div className={card}>
        <p className={cn(lbl, "mb-2")}>Nova memória</p>
        <div className="space-y-2">
          <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Título (ex.: Preço da mensalidade)" />
          <Input value={f.keywords} onChange={(e) => setF({ ...f, keywords: e.target.value })} placeholder="Palavras-chave separadas por vírgula (ex.: mensalidade, preço, quanto custa)" />
          <textarea rows={5} value={f.answer} onChange={(e) => setF({ ...f, answer: e.target.value })} placeholder="Resposta oficial. Pode usar **negrito** e listas com 1. ou -" className={fieldCls} />
          <button disabled={!ok} onClick={() => { onG((x) => ({ ...x, memories: [{ id: uid(), title: f.title.trim(), keywords: f.keywords.trim(), answer: f.answer.trim(), active: true }, ...x.memories].slice(0, 300) })); setF(empty); }} className={cn(btn, "w-full bg-[#00E5FF] text-black")}><Plus size={13} className="mr-1 inline" />Guardar memória</button>
        </div>
      </div>

      <p className={lbl}>As suas memórias ({g.memories.length})</p>
      {g.memories.length === 0 && <p className="text-center text-[12px] text-neutral-500">Ainda sem memórias suas. A IA usa as {BASE.length} de base.</p>}
      {g.memories.map((m) => (
        <div key={m.id} className={card}>
          <div className="space-y-1.5">
            <Input value={m.title} onChange={(e) => edit(m.id, { title: e.target.value })} placeholder="Título" className="py-1.5" />
            <Input value={m.keywords} onChange={(e) => edit(m.id, { keywords: e.target.value })} placeholder="Palavras-chave" className="py-1.5" />
            <textarea rows={4} value={m.answer} onChange={(e) => edit(m.id, { answer: e.target.value })} className={fieldCls} />
          </div>
          <div className="mt-2 flex gap-2">
            <button onClick={() => edit(m.id, { active: !m.active })} className={cn(btn, "flex-1", m.active ? "bg-[#00FF88]/15 text-[#00FF88]" : "bg-white/10")}>{m.active ? "Ativa" : "Desligada"}</button>
            <button onClick={() => onG((x) => ({ ...x, memories: x.memories.filter((y) => y.id !== m.id) }))} className={cn(btn, "bg-[#FF4D6D]/15 text-[#FF4D6D]")} aria-label="Apagar memória"><Trash2 size={13} /></button>
          </div>
        </div>
      ))}

      <button onClick={() => setShowBase((v) => !v)} className={cn(btn, "w-full bg-white/10")}>{showBase ? "Esconder" : "Ver"} memórias de base ({BASE.length})</button>
      {showBase && BASE.map((b) => (
        <div key={b.id} className={cn(card, "py-2.5")}>
          <p className="text-[12.5px] font-bold">{b.title} <span className="ml-1 text-[10px] font-extrabold uppercase text-[#00E5FF]">{b.cat}</span></p>
          <p className="mt-0.5 text-[10.5px] text-neutral-500">{b.keys.slice(0, 6).join(" • ")}</p>
        </div>
      ))}
    </div>
  );
}

/* ---------------- ligação do ADM à nuvem ---------------- */
function CloudBar({ g, onPublished }: { g: GlobalAdm; onPublished: () => void }) {
  const [on, setOn] = useState(() => hasSession(ADM_EMAIL));
  const [stage, setStage] = useState(0); const [code, setCode] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(() => admDirty());
  const send = async () => { setBusy(true); setMsg(""); const r = await sendCode(ADM_EMAIL); setBusy(false); if (!r.ok) return setMsg(r.error); setStage(1); setMsg(`Código enviado para ${ADM_EMAIL}.`); };
  const check = async () => {
    setBusy(true); setMsg("");
    const v = await verifyCode(ADM_EMAIL, code);
    if (!v.ok) { setBusy(false); return setMsg(v.error); }
    const ok = await pushGlobalUp(g); setBusy(false);
    setOn(true); setStage(0); setCode(""); setDirty(!ok);
    if (ok) onPublished(); else setMsg(lastPublishError || "Ligado. A publicar assim que houver rede.");
  };
  useEffect(() => {
    if (!on || !dirty) return;
    const iv = setInterval(async () => { const ok = await pushGlobalUp(loadGlobalAdm()); if (ok) { setDirty(false); setMsg(""); onPublished(); } }, 15000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, dirty]);
  if (!cloudOn()) return null;
  return (
    <div className={cn("mx-3 mt-2 rounded-xl border px-3 py-2 text-[11.5px]", on && !dirty ? "border-[#00FF88]/35 bg-[#00FF88]/[0.07]" : "border-[#FFC107]/40 bg-[#FFC107]/10")}>
      {on ? (
        <div className="flex items-center gap-2">
          <span className={cn("min-w-0 flex-1 font-semibold", dirty ? "text-[#FFC107]" : "text-[#00FF88]")}>{dirty ? "A publicar as alterações… tenta sozinho quando houver rede." : "Nuvem ligada ✓ (a sessão fica guardada)"}</span>
          <button onClick={() => { signOutCloud(ADM_EMAIL); setOn(false); setStage(0); setMsg(""); }} className="shrink-0 text-neutral-300 underline">Religar</button>
        </div>
      ) : stage === 0 ? (
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 font-semibold text-[#FFC107]">Sem nuvem: o que criar aqui fica só neste telemóvel.</span>
          <button disabled={busy} onClick={() => void send()} className="shrink-0 rounded-lg bg-[#FFC107] px-2.5 py-1.5 font-extrabold uppercase text-black disabled:opacity-50">{busy ? "…" : "Ligar à nuvem"}</button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="Código do email" className={cn(fieldCls, "py-1.5 text-center tracking-widest")} />
          <button disabled={busy || code.length !== 6} onClick={() => void check()} className="shrink-0 rounded-lg bg-[#00E5FF] px-3 py-1.5 font-extrabold uppercase text-black disabled:opacity-50">{busy ? "…" : "Confirmar"}</button>
        </div>
      )}
      {msg && <p className="mt-1 text-neutral-300">{msg}</p>}
    </div>
  );
}

/* ---------------- sala ---------------- */
export default function AdminRoom({ onClose }: { onClose: () => void }) {
  const [unlocked, setUnlocked] = useState(false);
  const [tab, setTab] = useState<TabId>(ADM_ONLY ? "accounts" : "live");
  const [g, setG] = useState<GlobalAdm>(() => loadGlobalAdm());
  const [warn, setWarn] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const houses = loadAccounts().filter((a) => !a.shadow);
  const [houseId, setHouseId] = useState<string>(() => houses[0]?.id ?? "");
  const [hd, setHd] = useState<AppData | null>(() => (houses[0] ? loadDataFor(houses[0].id) : null));
  const [ha, setHa] = useState<AdminData>(() => loadAdminFor(houses[0]?.id ?? ""));

  const reload = (id = houseId) => { setHd(id ? loadDataFor(id) : null); setHa(loadAdminFor(id)); };
  useEffect(() => { reload(houseId); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [houseId]);
  useEffect(() => {
    if (!unlocked) return;
    let ticks = 0; const iv = setInterval(() => { setNow(Date.now()); if (tab === "live") reload(); if (++ticks % 3 === 0) void syncGlobalDown().then(() => { if (!admDirty()) setG(loadGlobalAdm()); }); }, 2000);
    return () => clearInterval(iv);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [unlocked, tab, houseId]);

  const onG: OnG = (fn) => {
    const next = fn(loadGlobalAdm());
    if (!saveGlobalAdm(next)) setWarn("O telemóvel ficou sem espaço: a última alteração não foi guardada. Apague fotos antigas.");
    else setWarn("");
    setG(next);
    if (cloudOn()) void pushGlobalUp(next).then((ok) => { if (!ok) setWarn((w) => w || "Alteração guardada só neste telemóvel. Ligue o ADM à nuvem (barra no topo) para publicar a todos."); });
  };
  const onAdmin: OnAdmin = (fn) => {
    if (!houseId) return;
    const next = fn(loadAdminFor(houseId));
    saveAdminFor(houseId, next);
    setHa(next);
  };

  const house = houses.find((h) => h.id === houseId);
  const pending = ha.billing.payments.filter((x) => x.status === "pending").length;
  const needsHouse = tab === "live" || tab === "bill" || tab === "ai";

  /** A IA mexe na casa escolhida (dados + cobrança) e nos dados globais (anúncios, salas, avisos). */
  const applyActions = (actions: AdminAction[]): string[] => {
    const t = Date.now();
    const gNow = loadGlobalAdm();
    const dNow = (houseId ? loadDataFor(houseId) : null) ?? defaultData();
    const aNow = loadAdminFor(houseId);
    let w: World = { data: dNow, admin: { ...aNow, ads: gNow.ads, adsOn: gNow.adsOn, rooms: gNow.rooms } };
    const msgs: string[] = []; const logs: ActivityEvent[] = []; const notices: { title: string; text: string }[] = [];
    for (const a of actions) {
      const r = applyAction(w, a, t);
      w = r.w;
      msgs.push(r.ok ? r.msg : `Não aplicado: ${r.msg}`);
      if (r.ok) logs.push({ id: uid(), ts: t, actorId: "adm", actorName: "ADM", role: "owner", action: "adm", label: `ADM: ${r.msg}`, severity: a.type === "remove_station" || a.type === "billing_block" || a.type === "staff_active" ? "warn" : "info" });
      if (r.notice) notices.push(r.notice);
    }
    if (houseId) {
      const nd: AppData = { ...w.data, activity: [...logs.reverse(), ...w.data.activity].slice(0, 3000) };
      saveDataFor(houseId, nd);
      saveAdminFor(houseId, { ...w.admin, ads: [], rooms: [] });
    }
    const ng: GlobalAdm = {
      ...gNow, ads: w.admin.ads, adsOn: w.admin.adsOn, rooms: w.admin.rooms,
      notices: [...notices.map((n) => ({ id: uid(), ts: t, title: n.title, text: n.text })), ...gNow.notices].slice(0, 50),
    };
    if (!saveGlobalAdm(ng)) setWarn("O telemóvel ficou sem espaço: nem tudo foi guardado.");
    setG(ng); reload();
    if (cloudOn()) void pushGlobalUp(ng);
    return msgs;
  };

  return (
    <div className="fade absolute inset-0 z-50 flex flex-col bg-[#121212]">
      <div style={{ height: "env(safe-area-inset-top, 0px)" }} />
      <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3">
        <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 active:scale-95" aria-label="Voltar"><ArrowLeft size={17} /></button>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#FFC107] to-[#FF7A1A] text-black"><ShieldCheck size={21} /></span>
        <div className="min-w-0 flex-1"><h3 className="font-display text-[20px] font-extrabold uppercase leading-none">Sala do ADM</h3><p className="mt-0.5 text-[11px] font-semibold text-[#FFC107]">CrisJoseGamer • acesso exclusivo</p></div>
      </div>
      {!unlocked ? <Gate onUnlock={() => setUnlocked(true)} /> : (
        <>
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto border-b border-white/[0.06] px-3 py-2">
            {TABS.filter((t) => !ADM_ONLY || !["live", "bill", "ai"].includes(t.id)).map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className={cn("relative flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold", tab === t.id ? "bg-[#00E5FF] text-black" : "bg-white/[0.06] text-neutral-300")}>
                <t.icon size={13} />{t.label}
                {t.id === "bill" && pending > 0 && <span className="grid h-4 min-w-4 place-items-center rounded-full bg-[#FF4D6D] px-1 text-[9px] text-white">{pending}</span>}
              </button>
            ))}
          </div>
          <CloudBar g={g} onPublished={() => setWarn("")} />
          {warn && <p className="mx-3 mt-2 rounded-xl border border-[#FF4D6D]/40 bg-[#FF4D6D]/10 px-3 py-2 text-[11.5px] font-semibold text-[#FF8FA3]">{warn}</p>}
          {needsHouse && (
            houses.length === 0 && tab !== "ai" && tab !== "bill" ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center">
                <HomeIcon size={30} className="text-neutral-600" />
                <p className="text-[13px] text-neutral-400">Ainda não há casas criadas neste telemóvel. Anúncios, salas e avisos já funcionam nos outros separadores.</p>
              </div>
            ) : (
              <>
                {houses.length > 0 && (
                  <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto px-3 pt-2">
                    <span className="shrink-0 text-[10.5px] font-bold uppercase text-neutral-500">Casa:</span>
                    {houses.map((h) => <button key={h.id} onClick={() => setHouseId(h.id)} className={cn("shrink-0 rounded-full border px-3 py-1 text-[12px] font-semibold", h.id === houseId ? "border-[#FFC107] bg-[#FFC107]/15 text-[#FFC107]" : "border-white/10 text-neutral-300")}>{h.houseName}</button>)}
                  </div>
                )}
                {tab === "live" && hd && <LiveTab data={hd} admin={ha} now={now} />}
                {tab === "live" && !hd && <p className="px-6 pt-10 text-center text-[13px] text-neutral-500">{house ? `${house.houseName} ainda não terminou a configuração.` : "Escolha uma casa."}</p>}
                {tab === "bill" && <BillTab key={houseId} admin={ha} now={now} onAdmin={onAdmin} />}
                {tab === "ai" && (
                  <AiTab world={{ data: hd ?? defaultData(), admin: { ...ha, ads: g.ads, adsOn: g.adsOn, rooms: g.rooms } }} aiKey={hd?.config.aiKey ?? ""} onApply={applyActions} hasHouse={!!house} />
                )}
              </>
            )
          )}
          {tab === "ads" && <AdsTab g={g} onG={onG} onWarn={setWarn} />}
          {tab === "rooms" && <RoomsTab g={g} onG={onG} onWarn={setWarn} />}
          {tab === "alerts" && <AlertsTab g={g} onG={onG} />}
          {tab === "mgrs" && <ManagersTab g={g} onG={onG} />}
          {tab === "mem" && <MemoryTab g={g} onG={onG} />}
          {tab === "games" && <GamesTab g={g} onG={onG} onWarn={setWarn} />}
          {tab === "accounts" && <AccountsTab />}
          {tab === "block" && <BlockTab g={g} onG={onG} onWarn={setWarn} />}
        </>
      )}
    </div>
  );
}
