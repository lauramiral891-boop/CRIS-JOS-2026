import { useState } from "react";
import { Copy, KeyRound, MessageCircle, Plus, RefreshCw, Trash2, UserCog } from "lucide-react";
import Sheet from "./Sheet";
import { ErrorBox, Field, PrimaryButton, fieldCls } from "./ui";
import type { ActivityEvent, Perm, Staff } from "../lib/types";
import { DEFAULT_PERMS, PERM_LIST } from "../lib/permissions";
import { newInviteCode, newPassword, newUserCode } from "../lib/auth";
import { initialsOf, timeAgo } from "../lib/format";
import { cn } from "../utils/cn";

export interface NewStaff {
  name: string; phone: string; inviteCode: string; userCode: string; password: string; perms: Perm[];
}

interface Props {
  staff: Staff[];
  activity: ActivityEvent[];
  houseName: string;
  now: number;
  onClose: () => void;
  /** devolve a mensagem de erro, ou null se criou (pode confirmar o convite na nuvem, por isso é assíncrono) */
  onCreate: (s: NewStaff) => Promise<string | null> | string | null;
  onUpdate: (id: string, patch: Partial<Pick<Staff, "name" | "phone" | "perms" | "active">>) => void;
  onResetPass: (id: string, password: string) => void;
  onRemove: (id: string) => void;
}

interface Creds { name: string; inviteCode: string; userCode: string; password: string }

function PermToggles({ value, onChange }: { value: Perm[]; onChange: (v: Perm[]) => void }) {
  const toggle = (id: Perm) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <div className="divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/[0.07]">
      {PERM_LIST.map((x) => {
        const on = value.includes(x.id);
        return (
          <button key={x.id} type="button" onClick={() => toggle(x.id)} className="flex w-full items-center gap-3 bg-[#1e1e1e] px-3 py-2.5 text-left">
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold">{x.label}</span>
              <span className="block text-[11px] text-neutral-500">{x.hint}</span>
            </span>
            <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", on ? "bg-[#00E5FF]/90" : "bg-white/15")}>
              <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-0.5")} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

function CredsCard({ c, houseName }: { c: Creds; houseName: string }) {
  const text =
    `*${houseName}* — acesso de funcionário\n\n` +
    `Código de convite: ${c.inviteCode}\nCódigo de utilizador: ${c.userCode}\nPalavra-passe: ${c.password}\n\n` +
    `Abra a app, escolha "Entrar como funcionário" e preencha estes dados.`;
  const copy = () => { try { void navigator.clipboard.writeText(text); } catch { /* ignora */ } };
  return (
    <div className="rounded-2xl border border-[#00FF88]/30 bg-[#00FF88]/[0.06] p-3.5">
      <p className="text-[12px] font-bold text-[#00FF88]">Acesso de {c.name}</p>
      <div className="mt-2 space-y-1 font-mono text-[13px]">
        <p><span className="text-neutral-500">Convite:</span> {c.inviteCode}</p>
        <p><span className="text-neutral-500">Utilizador:</span> {c.userCode}</p>
        <p><span className="text-neutral-500">Palavra-passe:</span> {c.password}</p>
      </div>
      <p className="mt-2 text-[11px] text-amber-300">Guarde a palavra-passe agora: depois só fica o código protegido e não volta a aparecer.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={copy} className="flex items-center justify-center gap-1.5 rounded-xl bg-white/10 py-2.5 text-[12.5px] font-bold"><Copy size={14} /> Copiar</button>
        <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-xl bg-[#25D366] py-2.5 text-[12.5px] font-extrabold text-black"><MessageCircle size={14} /> WhatsApp</a>
      </div>
    </div>
  );
}

/** Última entrada: vem do registo de atividade (o funcionário noutro telemóvel não altera a sua própria ficha). */
const lastSeenOf = (s: Staff, activity: ActivityEvent[]) =>
  Math.max(s.lastLogin ?? 0, activity.find((a) => a.actorId === s.id && a.action === "login")?.ts ?? 0) || null;

export default function StaffManager(p: Props) {
  const [mode, setMode] = useState<"list" | "new" | "detail">("list");
  const [selId, setSelId] = useState<string | null>(null);
  const [creds, setCreds] = useState<Creds | null>(null);
  const [err, setErr] = useState("");
  const [f, setF] = useState<NewStaff>({ name: "", phone: "", inviteCode: "", userCode: "", password: "", perms: DEFAULT_PERMS });

  const openNew = () => {
    setF({ name: "", phone: "", inviteCode: newInviteCode(), userCode: newUserCode(), password: newPassword(), perms: DEFAULT_PERMS });
    setErr(""); setCreds(null); setMode("new");
  };

  const [busy, setBusy] = useState(false);
  const create = async () => {
    if (busy) return;
    if (!f.name.trim()) return setErr("Indique o nome do funcionário.");
    if (f.password.length < 4) return setErr("A palavra-passe deve ter pelo menos 4 caracteres.");
    if (f.userCode.trim().length < 3) return setErr("O código de utilizador é muito curto.");
    setBusy(true);
    const r = await p.onCreate({ ...f, name: f.name.trim(), phone: f.phone.trim(), inviteCode: f.inviteCode.trim(), userCode: f.userCode.trim() });
    setBusy(false);
    if (r) return setErr(r);
    setCreds({ name: f.name.trim(), inviteCode: f.inviteCode.trim(), userCode: f.userCode.trim(), password: f.password });
    setMode("list");
  };

  const sel = p.staff.find((s) => s.id === selId) ?? null;
  const [confirmDel, setConfirmDel] = useState(false);

  if (mode === "new") {
    return (
      <Sheet title="Novo funcionário" subtitle="Crie o acesso e escolha o que ele pode fazer." onClose={() => setMode("list")}>
        <div className="space-y-2.5">
          <Field label="Nome"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ex: Joana Pedro" className={fieldCls} /></Field>
          <Field label="Telefone (opcional)"><input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} inputMode="tel" className={fieldCls} /></Field>
          <div className="grid grid-cols-[1fr_auto] items-end gap-2">
            <Field label="Código de convite"><input value={f.inviteCode} onChange={(e) => setF({ ...f, inviteCode: e.target.value.toUpperCase() })} className={`${fieldCls} font-mono`} /></Field>
            <button type="button" onClick={() => setF({ ...f, inviteCode: newInviteCode() })} className="grid h-[42px] w-[42px] place-items-center rounded-xl bg-white/10" aria-label="Gerar convite"><RefreshCw size={15} /></button>
          </div>
          <div className="grid grid-cols-[1fr_auto] items-end gap-2">
            <Field label="Código de utilizador"><input value={f.userCode} onChange={(e) => setF({ ...f, userCode: e.target.value.toUpperCase() })} className={`${fieldCls} font-mono`} /></Field>
            <button type="button" onClick={() => setF({ ...f, userCode: newUserCode() })} className="grid h-[42px] w-[42px] place-items-center rounded-xl bg-white/10" aria-label="Gerar código"><RefreshCw size={15} /></button>
          </div>
          <div className="grid grid-cols-[1fr_auto] items-end gap-2">
            <Field label="Palavra-passe"><input value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} className={`${fieldCls} font-mono`} /></Field>
            <button type="button" onClick={() => setF({ ...f, password: newPassword() })} className="grid h-[42px] w-[42px] place-items-center rounded-xl bg-white/10" aria-label="Gerar palavra-passe"><RefreshCw size={15} /></button>
          </div>
          <p className="pt-1 text-[11px] font-bold uppercase tracking-wider text-neutral-400">Permissões</p>
          <PermToggles value={f.perms} onChange={(perms) => setF({ ...f, perms })} />
          <ErrorBox msg={err} />
          <PrimaryButton disabled={busy} onClick={() => void create()}>{busy ? "A criar…" : "Criar funcionário"}</PrimaryButton>
        </div>
      </Sheet>
    );
  }

  if (mode === "detail" && sel) {
    const last = p.activity.filter((a) => a.actorId === sel.id).slice(0, 5);
    return (
      <Sheet title={sel.name} subtitle={`Convite ${sel.inviteCode} • Utilizador ${sel.userCode}`} onClose={() => { setMode("list"); setCreds(null); setConfirmDel(false); }}>
        <div className="space-y-3">
          {creds && <CredsCard c={creds} houseName={p.houseName} />}
          <Field label="Nome"><input value={sel.name} onChange={(e) => p.onUpdate(sel.id, { name: e.target.value })} className={fieldCls} /></Field>
          <button
            onClick={() => p.onUpdate(sel.id, { active: !sel.active })}
            className={cn("w-full rounded-xl border py-2.5 text-[13px] font-bold", sel.active ? "border-[#00FF88]/40 bg-[#00FF88]/10 text-[#00FF88]" : "border-[#FF4D6D]/40 bg-[#FF4D6D]/10 text-[#FF4D6D]")}
          >
            {sel.active ? "Acesso ativo — tocar para bloquear" : "Acesso bloqueado — tocar para ativar"}
          </button>
          <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Permissões</p>
          <PermToggles value={sel.perms} onChange={(perms) => p.onUpdate(sel.id, { perms })} />
          <button
            onClick={() => { const pw = newPassword(); p.onResetPass(sel.id, pw); setCreds({ name: sel.name, inviteCode: sel.inviteCode, userCode: sel.userCode, password: pw }); }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-2.5 text-[13px] font-bold"
          ><KeyRound size={15} /> Gerar nova palavra-passe</button>
          {last.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-400">Últimas ações</p>
              {last.map((a) => (
                <p key={a.id} className="border-b border-white/[0.05] py-1.5 text-[12px] text-neutral-300">{a.label} <span className="text-neutral-600">• {timeAgo(a.ts, p.now)}</span></p>
              ))}
            </div>
          )}
          <button onClick={() => setConfirmDel(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#FF4D6D]/30 py-2.5 text-[13px] font-bold text-[#FF4D6D]">
            <Trash2 size={15} /> Remover funcionário
          </button>
          {confirmDel && (
            <div className="rounded-xl border border-[#FF4D6D]/40 bg-[#FF4D6D]/10 p-3 text-center">
              <p className="text-[12.5px]">Remover <b>{sel.name}</b>? O histórico das ações dele fica guardado.</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button onClick={() => setConfirmDel(false)} className="rounded-lg border border-white/15 py-2 text-[12.5px] font-bold">Cancelar</button>
                <button onClick={() => { p.onRemove(sel.id); setMode("list"); setConfirmDel(false); }} className="rounded-lg bg-[#FF4D6D] py-2 text-[12.5px] font-extrabold text-white">Remover</button>
              </div>
            </div>
          )}
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title="Funcionários" subtitle="Dê acesso à equipa e controle o que cada um pode ver e fazer." onClose={p.onClose}>
      <div className="space-y-3">
        {creds && <CredsCard c={creds} houseName={p.houseName} />}
        {p.staff.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/15 p-6 text-center text-[12.5px] text-neutral-500">
            <UserCog size={22} className="mx-auto mb-2 opacity-50" />Ainda não tem funcionários.
          </div>
        )}
        {p.staff.map((s) => (
          <button key={s.id} onClick={() => { setSelId(s.id); setMode("detail"); setCreds(null); }} className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.07] bg-[#1e1e1e] p-3 text-left active:bg-[#2a2a2a]">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-500 to-rose-600 text-[13px] font-extrabold text-white">{initialsOf(s.name)}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-bold">{s.name}</span>
              <span className="block truncate text-[11.5px] text-neutral-500">
                {lastSeenOf(s, p.activity) ? `Última entrada ${timeAgo(lastSeenOf(s, p.activity)!, p.now)}` : "Nunca entrou"} • {s.perms.length} permissões
              </span>
            </span>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", s.active ? "bg-[#00FF88]/15 text-[#00FF88]" : "bg-[#FF4D6D]/15 text-[#FF4D6D]")}>{s.active ? "Ativo" : "Bloqueado"}</span>
          </button>
        ))}
        <PrimaryButton onClick={openNew}><span className="inline-flex items-center gap-2"><Plus size={16} /> Adicionar funcionário</span></PrimaryButton>
      </div>
    </Sheet>
  );
}
