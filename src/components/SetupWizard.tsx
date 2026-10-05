import { useState } from "react";
import { ArrowLeft, ArrowRight, Building2, Monitor, Rocket, Tag, Timer, Trash2 } from "lucide-react";
import { HouseAvatar, Logo } from "./shared";
import type { Account } from "../lib/accounts";
import PlanForm from "./PlanForm";
import { ErrorBox, Field, fieldCls } from "./ui";
import type { Plan } from "../lib/types";
import { formatAOA } from "../lib/format";
import { WEEKDAYS_SHORT } from "../lib/dates";
import { uid } from "../lib/storage";
import { cn } from "../utils/cn";

export interface SetupResult {
  phone: string;
  email: string;
  address: string;
  count: number;
  prefix: string;
  openTime: string;
  closeTime: string;
  openDays: number[];
  dailyGoal: number;
  openingBalance: number;
  plans: Plan[];
}

export default function SetupWizard({ account, onFinish, onBack }: { account: Account; onFinish: (r: SetupResult) => void; onBack?: () => void }) {
  const [step, setStep] = useState(0);
  const [err, setErr] = useState("");
  const [f, setF] = useState({
    phone: account.kind === "phone" ? account.display : "", email: account.kind === "email" ? account.login : "", address: "",
    count: "", prefix: "Máquina", openTime: "09:00", closeTime: "23:00",
    dailyGoal: "", openingBalance: "",
  });
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [plans, setPlans] = useState<Plan[]>([]);

  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const num = (s: string) => parseFloat(s.replace(",", ".")) || 0;
  const toggleDay = (js: number) =>
    setDays((d) => (d.includes(js) ? d.filter((x) => x !== js) : [...d, js]));

  const next = () => {
    if (step === 1) {
      const c = parseInt(f.count, 10);
      if (!c || c < 1 || c > 200) return setErr("Indique quantas máquinas tem (1 a 200).");
      if (!f.prefix.trim()) return setErr("Indique o nome base das máquinas (ex: Máquina).");
      if (days.length === 0) return setErr("Escolha pelo menos um dia de funcionamento.");
    }
    setErr("");
    setStep((s) => s + 1);
  };

  const finish = () =>
    onFinish({
      phone: f.phone.trim(),
      email: f.email.trim(),
      address: f.address.trim(),
      count: parseInt(f.count, 10),
      prefix: f.prefix.trim(),
      openTime: f.openTime,
      closeTime: f.closeTime,
      openDays: days,
      dailyGoal: num(f.dailyGoal),
      openingBalance: num(f.openingBalance),
      plans,
    });

  const steps = [
    { t: "A sua Game House", i: Building2 },
    { t: "Máquinas e horário", i: Monitor },
    { t: "Tempos e preços", i: Tag },
  ];

  return (
    <div className="fade flex h-full min-h-0 flex-1 flex-col">
      <div className="px-4 pt-3">
        <Logo />
      </div>

      <div className="px-4 pt-4">
        <div className="mb-3 flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s.t} className="flex flex-1 items-center gap-2">
              <span
                className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-extrabold",
                  i <= step ? "bg-[#00E5FF] text-black shadow-[0_0_12px_rgba(0,229,255,0.5)]" : "bg-white/10 text-neutral-500"
                )}
              >
                {i + 1}
              </span>
              {i < steps.length - 1 && <span className={cn("h-0.5 flex-1 rounded-full", i < step ? "bg-[#00E5FF]" : "bg-white/10")} />}
            </div>
          ))}
        </div>
        <h1 className="font-display text-[26px] font-extrabold uppercase leading-none">{steps[step].t}</h1>
        <p className="mt-1 text-[12px] text-neutral-400">
          {step === 0 && "Conta criada! Confirme os dados e configure a sua Game House do zero."}
          {step === 1 && "Diga-nos quantas máquinas tem e quando abre. Pode alterar tudo depois."}
          {step === 2 && "Opcional: crie opções padrão (ex: Missão 60 min, Football preço fixo). Serão aplicadas a todas as máquinas."}
        </p>
      </div>

      <div className="thin-scroll mt-3 min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {step === 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-3 rounded-2xl border border-[#00E5FF]/25 bg-gradient-to-r from-[#00E5FF]/10 to-transparent p-3">
              <HouseAvatar photo={account.photo} name={account.houseName} className="h-16 w-16 rounded-2xl text-[20px]" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-[20px] font-extrabold uppercase leading-none">{account.houseName}</p>
                <p className="mt-1 truncate text-[12px] text-neutral-400">{account.ownerName}</p>
                <p className="mt-0.5 truncate text-[10.5px] font-bold tracking-wider text-neutral-500">ID {account.id}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Telefone (opcional)">
                <input value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+244 923 000 000" inputMode="tel" className={fieldCls} />
              </Field>
              <Field label="Email (opcional)">
                <input value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="email@exemplo.com" inputMode="email" className={fieldCls} />
              </Field>
            </div>
            <Field label="Endereço (opcional)">
              <input value={f.address} onChange={(e) => set("address", e.target.value)} placeholder="Rua, bairro, cidade" className={fieldCls} />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <div>
              <Field label="Quantas máquinas tem?">
                <input value={f.count} onChange={(e) => set("count", e.target.value.replace(/\D/g, ""))} placeholder="Ex: 12" inputMode="numeric" className={`${fieldCls} font-display text-[22px] font-extrabold`} />
              </Field>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {["5", "8", "10", "15", "20", "30"].map((n) => (
                  <button key={n} type="button" onClick={() => set("count", n)} className={cn("rounded-full border px-3 py-1 text-[11px] font-bold", f.count === n ? "border-[#00E5FF] bg-[#00E5FF]/10 text-[#00E5FF]" : "border-white/10 text-neutral-500")}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <Field label="Nome base das máquinas" hint={`Ficarão: ${f.prefix || "Máquina"} 01, ${f.prefix || "Máquina"} 02…`}>
              <input value={f.prefix} onChange={(e) => set("prefix", e.target.value)} className={fieldCls} />
            </Field>
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Abre às">
                <input type="time" value={f.openTime} onChange={(e) => set("openTime", e.target.value)} className={fieldCls} />
              </Field>
              <Field label="Fecha às">
                <input type="time" value={f.closeTime} onChange={(e) => set("closeTime", e.target.value)} className={fieldCls} />
              </Field>
            </div>
            <div>
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-neutral-400">Dias de funcionamento</span>
              <div className="grid grid-cols-7 gap-1.5">
                {WEEKDAYS_SHORT.map((w, i) => {
                  const js = (i + 1) % 7;
                  const on = days.includes(js);
                  return (
                    <button key={w} type="button" onClick={() => toggleDay(js)} className={cn("rounded-lg border py-2 text-[11px] font-extrabold", on ? "border-[#00FF88] bg-[#00FF88]/10 text-[#00FF88]" : "border-white/10 text-neutral-500")}>
                      {w}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Meta diária (AOA)" hint="Opcional">
                <input value={f.dailyGoal} onChange={(e) => set("dailyGoal", e.target.value)} placeholder="0" inputMode="decimal" className={fieldCls} />
              </Field>
              <Field label="Saldo inicial (AOA)" hint="Dinheiro em caixa hoje">
                <input value={f.openingBalance} onChange={(e) => set("openingBalance", e.target.value)} placeholder="0" inputMode="decimal" className={fieldCls} />
              </Field>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            {plans.length > 0 && (
              <div className="space-y-1.5">
                {plans.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-[#1e1e1e] p-2.5">
                    <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", p.kind === "timed" ? "bg-[#00E5FF]/15 text-[#00E5FF]" : "bg-purple-500/15 text-purple-400")}>
                      {p.kind === "timed" ? <Timer size={16} /> : <Tag size={16} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold">{p.name}</p>
                      <p className="text-[11px] text-neutral-400">
                        <b className="text-[#00FF88]">{formatAOA(p.price)}</b> {p.kind === "timed" ? `= ${p.minutes} minutos` : "• preço fixo, sem cronómetro"}
                      </p>
                    </div>
                    <button onClick={() => setPlans((x) => x.filter((y) => y.id !== p.id))} className="grid h-8 w-8 place-items-center rounded-lg bg-[#FF4D6D]/10 text-[#FF4D6D]" aria-label="Remover">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="rounded-2xl border border-white/[0.08] bg-[#171717] p-3.5">
              <h4 className="mb-2.5 font-display text-[15px] font-bold uppercase tracking-wider">Nova opção padrão</h4>
              <PlanForm
                submitLabel="Adicionar opção"
                onSubmit={(d) => setPlans((p) => [...p, { ...d, id: `d${uid()}` }])}
              />
            </div>
            <p className="text-center text-[11.5px] text-neutral-500">Pode saltar este passo e definir os preços máquina a máquina mais tarde.</p>
          </div>
        )}

        <div className="mt-3"><ErrorBox msg={err} /></div>
      </div>

      <div className="flex gap-2.5 border-t border-white/[0.07] px-4 py-3">
        {(step > 0 || onBack) && (
          <button onClick={() => { setErr(""); if (step > 0) setStep(step - 1); else onBack?.(); }} className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/10 active:scale-95" aria-label="Voltar">
            <ArrowLeft size={18} />
          </button>
        )}
        {step < 2 ? (
          <button onClick={next} className="neon-btn-cyan flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#00E5FF] text-[13px] font-extrabold uppercase tracking-widest text-black active:scale-[0.98]">
            Continuar <ArrowRight size={16} />
          </button>
        ) : (
          <button onClick={finish} className="neon-btn-green flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#00FF88] text-[13px] font-extrabold uppercase tracking-widest text-black active:scale-[0.98]">
            <Rocket size={16} /> Abrir a minha Game House
          </button>
        )}
      </div>
    </div>
  );
}
