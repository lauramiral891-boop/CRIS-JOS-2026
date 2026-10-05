import { useRef, useState } from "react";
import { fileToPhoto } from "../lib/image";
import {
  Check, Download, Eye, EyeOff, FileUp, LogOut, Timer, Tag, Trash2, TriangleAlert, Upload,
} from "lucide-react";
import Sheet from "./Sheet";
import PlanForm from "./PlanForm";
import type { PlanDraft } from "./PlanForm";
import { ErrorBox, Field, PrimaryButton, fieldCls } from "./ui";
import type { Config, Plan, SubPlan } from "../lib/types";
import { WEEKDAYS_SHORT, dm, isOpenNow, shortDate } from "../lib/dates";
import { formatAOA, formatAOAshort, timeAgo } from "../lib/format";
import { cn } from "../utils/cn";

/* ---------------- Perfil ---------------- */
export function ProfileSheet({
  config, photo: photo0, onSave, onClose,
}: { config: Config; photo: string; onSave: (p: Partial<Config>, photo: string) => void; onClose: () => void }) {
  const [photo, setPhoto] = useState(photo0);
  const fileRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({
    houseName: config.houseName, ownerName: config.ownerName, phone: config.phone,
    email: config.email, address: config.address,
  });
  const [err, setErr] = useState("");
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const save = () => {
    if (!f.houseName.trim() || !f.ownerName.trim()) return setErr("Nome da Game House e do proprietário são obrigatórios.");
    if (!photo) return setErr("A foto da Game House é obrigatória.");
    onSave({ houseName: f.houseName.trim(), ownerName: f.ownerName.trim(), phone: f.phone.trim(), email: f.email.trim(), address: f.address.trim() }, photo);
  };
  return (
    <Sheet title="Informações do Perfil" subtitle="Os seus dados e os da Game House." onClose={onClose}>
      <div className="space-y-2.5">
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) fileToPhoto(file).then((d) => { setPhoto(d); setErr(""); }).catch((x: Error) => setErr(x.message)); }} />
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => fileRef.current?.click()} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-[#252525]">
            {photo && <img src={photo} alt="Game House" className="h-full w-full object-cover" />}
            <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-[10px] font-bold">Trocar</span>
          </button>
          <p className="text-[11.5px] text-neutral-400">Foto da Game House (obrigatória). Aparece também na sala dos seus funcionários.</p>
        </div>
        <Field label="Nome da Game House"><input value={f.houseName} onChange={(e) => set("houseName", e.target.value)} className={fieldCls} /></Field>
        <Field label="Proprietário"><input value={f.ownerName} onChange={(e) => set("ownerName", e.target.value)} className={fieldCls} /></Field>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Telefone"><input value={f.phone} onChange={(e) => set("phone", e.target.value)} inputMode="tel" className={fieldCls} /></Field>
          <Field label="Email"><input value={f.email} onChange={(e) => set("email", e.target.value)} inputMode="email" className={fieldCls} /></Field>
        </div>
        <Field label="Endereço"><input value={f.address} onChange={(e) => set("address", e.target.value)} className={fieldCls} /></Field>
        <ErrorBox msg={err} />
        <PrimaryButton onClick={save} tone="cyan">Guardar alterações</PrimaryButton>
      </div>
    </Sheet>
  );
}

/* ---------------- Palavra-passe ---------------- */
export function PasswordSheet({
  verify, onSave, onClose,
}: { verify: (p: string) => boolean; onSave: (p: string) => void; onClose: () => void }) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [c, setC] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const save = () => {
    if (!verify(a)) return setErr("A palavra-passe atual está incorreta.");
    if (b.length < 6) return setErr("A nova palavra-passe deve ter pelo menos 6 caracteres.");
    if (b !== c) return setErr("A confirmação não coincide.");
    if (b === a) return setErr("A nova palavra-passe deve ser diferente da atual.");
    onSave(b);
  };
  const type = show ? "text" : "password";
  return (
    <Sheet title="Alterar Palavra-passe" subtitle="Usada para entrar na app depois de terminar sessão." onClose={onClose}>
      <div className="space-y-2.5">
        <Field label="Palavra-passe atual"><input type={type} value={a} onChange={(e) => setA(e.target.value)} className={fieldCls} /></Field>
        <Field label="Nova palavra-passe"><input type={type} value={b} onChange={(e) => setB(e.target.value)} className={fieldCls} /></Field>
        <Field label="Confirmar nova palavra-passe"><input type={type} value={c} onChange={(e) => setC(e.target.value)} className={fieldCls} /></Field>
        <button onClick={() => setShow(!show)} className="flex items-center gap-1.5 text-[12px] font-bold text-neutral-400">
          {show ? <EyeOff size={14} /> : <Eye size={14} />} {show ? "Ocultar" : "Mostrar"} palavras-passe
        </button>
        <ErrorBox msg={err} />
        <PrimaryButton onClick={save}>Alterar palavra-passe</PrimaryButton>
      </div>
    </Sheet>
  );
}

/* ---------------- Subscrição ---------------- */
const subPlans: { id: SubPlan; name: string; price: number; features: string[] }[] = [
  { id: "basic", name: "Básico", price: 15000, features: ["Até 10 máquinas", "Cronómetros e alarme", "Relatório diário e semanal"] },
  { id: "pro", name: "Pro", price: 35000, features: ["Máquinas ilimitadas", "Todos os relatórios (mês, trimestre, ano)", "Notificações e cópia de segurança"] },
  { id: "premium", name: "Premium", price: 60000, features: ["Tudo do Pro", "Várias Game Houses", "Suporte prioritário"] },
];

export const subName = (p: SubPlan) => subPlans.find((s) => s.id === p)?.name ?? "Pro";

export function SubscriptionSheet({
  config, onChange, onClose,
}: { config: Config; onChange: (p: SubPlan) => void; onClose: () => void }) {
  const now = Date.now();
  const cycle = 30 * 86400000;
  const k = Math.floor((now - config.subSince) / cycle) + 1;
  const renew = new Date(config.subSince + k * cycle);
  const left = Math.max(0, Math.ceil((renew.getTime() - now) / 86400000));
  return (
    <Sheet title="Gestão de Subscrição" subtitle={`Plano atual: ${subName(config.subPlan)} • renova em ${dm(renew)}/${renew.getFullYear()} (${left} dias)`} accent="#FFC107" onClose={onClose}>
      <div className="space-y-2.5">
        {subPlans.map((p) => {
          const on = config.subPlan === p.id;
          return (
            <button key={p.id} onClick={() => onChange(p.id)} className={cn("w-full rounded-2xl border p-3.5 text-left transition active:scale-[0.99]", on ? "border-[#FFC107] bg-[#FFC107]/10" : "border-white/10 bg-[#1e1e1e]")}>
              <div className="flex items-center justify-between">
                <p className="font-display text-[19px] font-extrabold uppercase">{p.name}</p>
                {on ? <span className="flex items-center gap-1 rounded-full bg-[#FFC107] px-2 py-0.5 text-[10px] font-extrabold uppercase text-black"><Check size={11} strokeWidth={3} /> Ativo</span> : <span className="text-[11px] font-bold text-neutral-500">Mudar para este</span>}
              </div>
              <p className="text-[13px] font-extrabold text-[#00FF88]">{formatAOAshort(p.price)}<span className="text-[11px] font-medium text-neutral-500"> / mês</span></p>
              <ul className="mt-1.5 space-y-0.5">
                {p.features.map((f) => <li key={f} className="flex items-center gap-1.5 text-[11.5px] text-neutral-400"><Check size={12} className="text-[#00FF88]" /> {f}</li>)}
              </ul>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

/* ---------------- Horário ---------------- */
export function HoursSheet({
  config, onSave, onClose,
}: { config: Config; onSave: (p: Partial<Config>) => void; onClose: () => void }) {
  const [open, setOpen] = useState(config.openTime);
  const [close, setClose] = useState(config.closeTime);
  const [days, setDays] = useState<number[]>(config.openDays);
  const [err, setErr] = useState("");
  const toggle = (js: number) => setDays((d) => (d.includes(js) ? d.filter((x) => x !== js) : [...d, js]));
  const openNow = isOpenNow({ openTime: open, closeTime: close, openDays: days }, new Date());
  const save = () => {
    if (!open || !close) return setErr("Indique a hora de abertura e de fecho.");
    if (days.length === 0) return setErr("Escolha pelo menos um dia.");
    onSave({ openTime: open, closeTime: close, openDays: days });
  };
  return (
    <Sheet title="Horário de Funcionamento" subtitle="Define quando a casa está aberta. Pode passar da meia-noite (ex: 09:00 – 01:00)." accent="#00FF88" onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Abre às"><input type="time" value={open} onChange={(e) => setOpen(e.target.value)} className={fieldCls} /></Field>
          <Field label="Fecha às"><input type="time" value={close} onChange={(e) => setClose(e.target.value)} className={fieldCls} /></Field>
        </div>
        <div>
          <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-neutral-400">Dias abertos</span>
          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAYS_SHORT.map((w, i) => {
              const js = (i + 1) % 7;
              const on = days.includes(js);
              return (
                <button key={w} onClick={() => toggle(js)} className={cn("rounded-lg border py-2 text-[11px] font-extrabold", on ? "border-[#00FF88] bg-[#00FF88]/10 text-[#00FF88]" : "border-white/10 text-neutral-500")}>{w}</button>
              );
            })}
          </div>
        </div>
        <p className={cn("rounded-xl px-3 py-2 text-[12px] font-bold", openNow ? "bg-[#00FF88]/10 text-[#00FF88]" : "bg-[#FF4D6D]/10 text-[#FF8FA3]")}>
          Com este horário, a casa está agora: {openNow ? "ABERTA" : "FECHADA"}
        </p>
        <ErrorBox msg={err} />
        <PrimaryButton onClick={save}>Guardar horário</PrimaryButton>
      </div>
    </Sheet>
  );
}

/* ---------------- Pacotes padrão ---------------- */
export function PackagesSheet({
  plans, stationCount, onAdd, onRemove, onApplyAll, onClose,
}: {
  plans: Plan[];
  stationCount: number;
  onAdd: (d: PlanDraft) => void;
  onRemove: (id: string) => void;
  onApplyAll: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet title="Tempos, Preços e Pacotes" subtitle="Pacotes padrão. Novas máquinas recebem-nos automaticamente." accent="#00FF88" onClose={onClose}>
      <div className="space-y-1.5">
        {plans.length === 0 && <p className="rounded-xl border border-dashed border-white/15 p-4 text-center text-[12.5px] text-neutral-500">Ainda não há pacotes padrão.</p>}
        {plans.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-[#1e1e1e] p-2.5">
            <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", p.kind === "timed" ? "bg-[#00E5FF]/15 text-[#00E5FF]" : "bg-purple-500/15 text-purple-400")}>
              {p.kind === "timed" ? <Timer size={16} /> : <Tag size={16} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold">{p.name}</p>
              <p className="text-[11px] text-neutral-400"><b className="text-[#00FF88]">{formatAOA(p.price)}</b> {p.kind === "timed" ? `= ${p.minutes} minutos` : "• preço fixo"}</p>
            </div>
            <button onClick={() => onRemove(p.id)} className="grid h-8 w-8 place-items-center rounded-lg bg-[#FF4D6D]/10 text-[#FF4D6D]" aria-label="Remover"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-2xl border border-white/[0.08] bg-[#171717] p-3.5">
        <h4 className="mb-2.5 font-display text-[15px] font-bold uppercase tracking-wider">Novo pacote</h4>
        <PlanForm submitLabel="Adicionar pacote" onSubmit={onAdd} />
      </div>
      <button
        disabled={plans.length === 0 || stationCount === 0}
        onClick={onApplyAll}
        className="mt-3 w-full rounded-xl border border-[#00E5FF]/40 bg-[#00E5FF]/10 py-3 text-[12px] font-extrabold uppercase tracking-wider text-[#00E5FF] disabled:opacity-40"
      >
        Aplicar a todas as {stationCount} máquinas
      </button>
    </Sheet>
  );
}

/* ---------------- Idioma ---------------- */
export function LanguageSheet({
  value, onSelect, onClose,
}: { value: Config["lang"]; onSelect: (l: Config["lang"]) => void; onClose: () => void }) {
  const opts: { id: Config["lang"]; name: string }[] = [
    { id: "pt-AO", name: "Português (Angola)" },
    { id: "pt-PT", name: "Português (Portugal)" },
    { id: "pt-BR", name: "Português (Brasil)" },
  ];
  return (
    <Sheet title="Idioma" subtitle="Define o formato de datas e horas em toda a app." onClose={onClose}>
      {opts.map((o) => (
        <button key={o.id} onClick={() => onSelect(o.id)} className={cn("mb-2 flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left", value === o.id ? "border-[#00E5FF] bg-[#00E5FF]/10 text-[#00E5FF]" : "border-white/10 bg-[#1e1e1e] text-neutral-300")}>
          <span>
            <span className="block text-[13px] font-semibold">{o.name}</span>
            <span className="block text-[11px] capitalize opacity-70">{shortDate(new Date(), o.id)}</span>
          </span>
          {value === o.id && <Check size={16} />}
        </button>
      ))}
    </Sheet>
  );
}

/* ---------------- Meta diária ---------------- */
export function GoalSheet({
  goal, onSave, onClose,
}: { goal: number; onSave: (v: number) => void; onClose: () => void }) {
  const [v, setV] = useState(goal ? String(goal) : "");
  return (
    <Sheet title="Meta Diária" subtitle="Quanto quer faturar por dia? A Home mostra o progresso em tempo real." accent="#00FF88" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Valor da meta (AOA)">
          <input value={v} onChange={(e) => setV(e.target.value)} inputMode="decimal" placeholder="Ex: 50000" className={`${fieldCls} font-display text-[22px] font-extrabold`} />
        </Field>
        <div className="flex flex-wrap gap-1.5">
          {[20000, 50000, 100000, 200000].map((n) => (
            <button key={n} onClick={() => setV(String(n))} className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-bold text-neutral-400">{formatAOAshort(n)}</button>
          ))}
        </div>
        <PrimaryButton onClick={() => onSave(parseFloat(v.replace(",", ".")) || 0)}>Guardar meta</PrimaryButton>
        {goal > 0 && <button onClick={() => onSave(0)} className="w-full text-center text-[12px] font-bold text-neutral-500">Remover meta</button>}
      </div>
    </Sheet>
  );
}

/* ---------------- Cópia de segurança ---------------- */
export function BackupSheet({
  lastBackup, now, onExport, onImport, onReset, onClose,
}: {
  lastBackup: number | null;
  now: number;
  onExport: () => void;
  onImport: (f: File) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [confirm, setConfirm] = useState(false);
  const [word, setWord] = useState("");
  return (
    <Sheet title="Cópia de Segurança" subtitle={lastBackup ? `Última cópia: ${timeAgo(lastBackup, now)}` : "Ainda não fez nenhuma cópia."} onClose={onClose}>
      <div className="space-y-2.5">
        <button onClick={onExport} className="flex w-full items-center gap-3 rounded-xl border border-[#00E5FF]/40 bg-[#00E5FF]/10 p-3.5 text-left active:scale-[0.99]">
          <Download size={20} className="text-[#00E5FF]" />
          <span><span className="block text-[13px] font-bold">Guardar cópia no telemóvel</span><span className="text-[11px] text-neutral-400">Descarrega um ficheiro com todos os dados.</span></span>
        </button>
        <button onClick={() => ref.current?.click()} className="flex w-full items-center gap-3 rounded-xl border border-[#00FF88]/40 bg-[#00FF88]/10 p-3.5 text-left active:scale-[0.99]">
          <Upload size={20} className="text-[#00FF88]" />
          <span><span className="block text-[13px] font-bold">Restaurar de uma cópia</span><span className="text-[11px] text-neutral-400">Substitui os dados atuais pelos do ficheiro.</span></span>
        </button>
        <input ref={ref} type="file" accept=".json,application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ""; }} />

        {!confirm ? (
          <button onClick={() => setConfirm(true)} className="flex w-full items-center gap-3 rounded-xl border border-[#FF4D6D]/40 bg-[#FF4D6D]/10 p-3.5 text-left active:scale-[0.99]">
            <TriangleAlert size={20} className="text-[#FF4D6D]" />
            <span><span className="block text-[13px] font-bold text-[#FF8FA3]">Zerar tudo e recomeçar</span><span className="text-[11px] text-neutral-400">Apaga máquinas, jogadores, reservas e finanças.</span></span>
          </button>
        ) : (
          <div className="rounded-xl border border-[#FF4D6D]/50 bg-[#FF4D6D]/10 p-3.5">
            <p className="text-[12.5px] font-semibold text-[#FF8FA3]">Isto apaga TODOS os dados. Escreva ZERAR para confirmar.</p>
            <input value={word} onChange={(e) => setWord(e.target.value)} placeholder="ZERAR" className={`${fieldCls} mt-2 text-center font-extrabold tracking-widest`} />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button onClick={() => { setConfirm(false); setWord(""); }} className="rounded-lg border border-white/15 py-2 text-[12px] font-bold">Cancelar</button>
              <button disabled={word.trim().toUpperCase() !== "ZERAR"} onClick={onReset} className="rounded-lg bg-[#FF4D6D] py-2 text-[12px] font-extrabold text-white disabled:opacity-40">Apagar tudo</button>
            </div>
          </div>
        )}
        <p className="flex items-center gap-1.5 text-[11px] text-neutral-500"><FileUp size={12} /> Os dados ficam guardados neste dispositivo automaticamente.</p>
      </div>
    </Sheet>
  );
}

/* ---------------- Sobre ---------------- */
export function AboutSheet({ onClose }: { onClose: () => void }) {
  const [t, setT] = useState<"about" | "terms" | "privacy">("about");
  return (
    <Sheet title="Sobre a App e Legal" onClose={onClose}>
      <div className="mb-3 grid grid-cols-3 gap-1.5 rounded-2xl border border-white/10 bg-[#1e1e1e] p-1.5">
        {([["about", "Sobre"], ["terms", "Termos"], ["privacy", "Privacidade"]] as const).map(([id, l]) => (
          <button key={id} onClick={() => setT(id)} className={cn("rounded-xl py-2 text-[12px] font-extrabold uppercase tracking-wider", t === id ? "bg-[#00E5FF] text-black" : "text-neutral-500")}>{l}</button>
        ))}
      </div>
      <div className="space-y-2 text-[12.5px] leading-relaxed text-neutral-300">
        {t === "about" && (
          <>
            <p><b className="text-white">CJ GERENCIAMENTO</b></p>
            <p>Versão 3.0.0 • Feito em Angola 🇦🇴</p>
            <p>Sistema de gestão para Game Houses: máquinas com cronómetro ou preço fixo, alarme de fim de tempo, reservas, jogadores, finanças e relatórios automáticos por dia, semana, mês, trimestre e ano.</p>
          </>
        )}
        {t === "terms" && (
          <>
            <p>1. A app destina-se à gestão interna da sua Game House.</p>
            <p>2. Os valores são registados em Kwanzas (AOA) e são da responsabilidade do proprietário.</p>
            <p>3. A subscrição renova a cada 30 dias e pode ser alterada a qualquer momento.</p>
            <p>4. O proprietário deve manter a palavra-passe em segurança.</p>
          </>
        )}
        {t === "privacy" && (
          <>
            <p>Os dados (jogadores, finanças, reservas) ficam guardados apenas neste dispositivo.</p>
            <p>Nada é enviado para servidores. Faça cópias de segurança regularmente em Definições.</p>
            <p>Pode apagar tudo a qualquer momento em Cópia de Segurança → Zerar tudo.</p>
          </>
        )}
      </div>
    </Sheet>
  );
}

/* ---------------- Terminar sessão ---------------- */
export function LogoutConfirm({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fade absolute inset-0 z-40 flex items-center justify-center bg-black/70 p-8 backdrop-blur-sm" onClick={onCancel}>
      <div className="modal-sheet w-full rounded-3xl border border-[#FF4D6D]/30 bg-[#1a1a1a] p-6 text-center" onClick={(e) => e.stopPropagation()}>
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#FF4D6D]/10 text-[#FF4D6D]"><LogOut size={24} /></span>
        <h3 className="mt-3 font-display text-[20px] font-extrabold uppercase">Terminar sessão?</h3>
        <p className="mt-1 text-[12.5px] text-neutral-400">As sessões das máquinas continuam a contar. Vai precisar da palavra-passe para voltar.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={onCancel} className="rounded-xl border border-white/15 py-2.5 text-[13px] font-bold text-neutral-300">Cancelar</button>
          <button onClick={onConfirm} className="rounded-xl bg-[#FF4D6D] py-2.5 text-[13px] font-extrabold text-white shadow-[0_0_18px_rgba(255,77,109,0.45)]">Sair</button>
        </div>
      </div>
    </div>
  );
}
