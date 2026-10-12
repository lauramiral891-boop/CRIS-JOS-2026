import { useState } from "react";
import { ChartColumn, Plus, ArrowDownLeft, ArrowUpRight, CalendarRange, ShoppingCart } from "lucide-react";
import { NeonCard } from "../components/shared";
import Sheet from "../components/Sheet";
import { ErrorBox, Field, fieldCls } from "../components/ui";
import type { ReportTab } from "../components/ReportsView";
import type { Transaction } from "../lib/types";
import { totals, filterScope } from "../lib/reports";
import { WEEKDAYS_SHORT, addDays, dm, sod, startOfWeek } from "../lib/dates";
import { clockHM, compactAOA, formatAOA, formatAOAshort } from "../lib/format";
import { cn } from "../utils/cn";

export default function FinanceScreen({
  transactions: allTransactions, balance, now, onAdd, onOpenReports, onOpenSales,
}: {
  transactions: Transaction[];
  balance: number;
  now: number;
  onAdd: (type: "in" | "out", value: number, label: string, scope?: "house" | "sales") => void;
  onOpenReports: (tab: ReportTab) => void;
  onOpenSales: () => void;
}) {
  const [showNew, setShowNew] = useState(false);
  const [kind, setKind] = useState<"in" | "out">("in");
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");
  const [err, setErr] = useState("");
  const [scope, setScope] = useState<"all" | "games" | "sales">("games");
  const transactions =
    scope === "games" ? filterScope(allTransactions, "house")
    : scope === "sales" ? filterScope(allTransactions, "sales")
    : allTransactions;
  const salesNet = filterScope(allTransactions, "sales").reduce((s, t) => s + (t.type === "in" ? t.value : -t.value), 0);
  const shownBalance = scope === "sales" ? salesNet : scope === "games" ? balance - salesNet : balance;
  const [txScope, setTxScope] = useState<"house" | "sales">("house");

  const nowD = new Date(now);
  const today = sod(nowD);
  const tomorrow = addDays(today, 1);
  const wStart = startOfWeek(today);
  const todayTotals = totals(transactions, today, tomorrow);
  const weekTotals = totals(transactions, wStart, addDays(wStart, 7));
  const monthTotals = totals(transactions, new Date(today.getFullYear(), today.getMonth(), 1), new Date(today.getFullYear(), today.getMonth() + 1, 1));
  const yearTotals = totals(transactions, new Date(today.getFullYear(), 0, 1), new Date(today.getFullYear() + 1, 0, 1));

  const todayList = transactions
    .filter((t) => t.ts >= today.getTime() && t.ts < tomorrow.getTime())
    .sort((a, b) => b.ts - a.ts);

  const byPerson = Object.values(
    todayList.reduce<Record<string, { id: string; name: string; net: number }>>((acc, t) => {
      const id = t.actorId ?? "—";
      acc[id] ??= { id, name: t.actorName ?? "Sem registo", net: 0 };
      acc[id].net += t.type === "in" ? t.value : -t.value;
      return acc;
    }, {})
  ).sort((a, b) => b.net - a.net);

  const submit = () => {
    const v = parseFloat(value.replace(",", "."));
    if (!v || v <= 0) return setErr("Indique um valor válido em AOA.");
    if (!label.trim()) return setErr("Indique uma descrição.");
    onAdd(kind, v, label.trim(), txScope);
    setShowNew(false); setValue(""); setLabel(""); setErr("");
  };

  const chips: { l: string; v: number; tab: ReportTab }[] = [
    { l: "Hoje", v: todayTotals.income, tab: "day" },
    { l: "Semana", v: weekTotals.income, tab: "week" },
    { l: "Mês", v: monthTotals.income, tab: "month" },
    { l: "Ano", v: yearTotals.income, tab: "year" },
  ];

  return (
    <div className="space-y-4 px-4 pb-6">
      <h1 className="rise pt-1 text-center font-display text-[26px] font-extrabold uppercase tracking-wide">Visão Financeira</h1>
      <div className="flex justify-center gap-1.5">
        {([["all", "Tudo"], ["games", "Game House"], ["sales", "Outras vendas"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setScope(id)} className={cn("rounded-full border px-3 py-1 text-[11px] font-bold transition active:scale-95", scope === id ? "border-[#00FF88] bg-[#00FF88]/15 text-[#00FF88]" : "border-white/10 bg-[#1e1e1e] text-neutral-400")}>{label}</button>
        ))}
      </div>

      <div className="rise rise-1 neon-border-cyan rounded-2xl bg-[#141414] p-5 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-400">Saldo Atual</p>
        <p className="neon-text-cyan mt-1 font-display text-[34px] font-extrabold leading-none text-white">{formatAOA(shownBalance)}</p>
        <p className="mt-1.5 text-[13px] text-neutral-400">Total de Fundos Disponíveis</p>
        <div className="mx-auto mt-3 flex max-w-[300px] items-center justify-between gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-[11px] font-bold">
          <span className="flex items-center gap-1 text-[#00FF88]"><ArrowDownLeft size={12} /> Hoje {formatAOAshort(todayTotals.income)}</span>
          <span className="h-4 w-px bg-white/10" />
          <span className="flex items-center gap-1 text-[#FF4D6D]"><ArrowUpRight size={12} /> {formatAOAshort(todayTotals.expense)}</span>
        </div>
      </div>

      {/* Totais automáticos */}
      <div className="rise rise-2 grid grid-cols-4 gap-2">
        {chips.map((c) => (
          <button key={c.l} onClick={() => onOpenReports(c.tab)} className="rounded-xl border border-white/[0.07] bg-[#1e1e1e] p-2 text-center transition active:scale-95">
            <p className="text-[9.5px] font-bold uppercase tracking-wider text-neutral-500">{c.l}</p>
            <p className="font-display text-[15px] font-extrabold leading-tight text-[#00FF88]">{compactAOA(c.v)}</p>
          </button>
        ))}
      </div>

      {/* Semana por dias */}
      <NeonCard className="rise rise-2 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="flex items-center gap-1.5 font-display text-[14px] font-bold uppercase tracking-wider"><CalendarRange size={14} className="text-[#00E5FF]" /> Esta semana • {dm(wStart)} – {dm(addDays(wStart, 6))}</p>
          <button onClick={() => onOpenReports("week")} className="text-[10px] font-extrabold uppercase text-[#00E5FF]">Detalhes</button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS_SHORT.map((w, i) => {
            const d = addDays(wStart, i);
            const t = totals(transactions, d, addDays(d, 1));
            const isToday = d.getTime() === today.getTime();
            const future = d.getTime() > today.getTime();
            return (
              <div key={w} className={cn("flex flex-col items-center rounded-lg border py-1.5", isToday ? "border-[#00E5FF] bg-[#00E5FF]/10" : "border-white/[0.06] bg-white/[0.03]", future && "opacity-40")}>
                <span className={cn("text-[9px] font-bold uppercase", isToday ? "text-[#00E5FF]" : "text-neutral-500")}>{w}</span>
                <span className="text-[9px] text-neutral-600">{d.getDate()}</span>
                <span className={cn("mt-0.5 text-[10px] font-extrabold", t.income > 0 ? "text-[#00FF88]" : "text-neutral-600")}>{t.income > 0 ? compactAOA(t.income) : "—"}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-center text-[11px] text-neutral-500">Total da semana: <b className="text-[#00FF88]">{formatAOAshort(weekTotals.income)}</b> • calculado automaticamente</p>
      </NeonCard>

      {byPerson.length > 1 && (
        <NeonCard className="rise rise-3 p-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400">Caixa de hoje por pessoa</p>
          <ul className="space-y-1.5">
            {byPerson.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 text-[13px]">
                <span className="min-w-0 truncate text-neutral-200">{p.name}</span>
                <b className="shrink-0 text-[#00FF88]">{formatAOA(p.net)}</b>
              </li>
            ))}
          </ul>
        </NeonCard>
      )}

      <div className="rise rise-3">
        <div className="mb-2.5 flex items-center gap-3 px-1">
          <span className="h-px flex-1 bg-white/10" />
          <h2 className="font-display text-[15px] font-bold uppercase tracking-[0.12em] text-neutral-200">Transações de Hoje</h2>
          <span className="h-px flex-1 bg-white/10" />
        </div>
        <div className="space-y-2">
          {todayList.length === 0 && (
            <p className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-[12.5px] leading-relaxed text-neutral-500">
              Sem movimentos hoje. Cada sessão iniciada ou transação registada aparece aqui. À meia-noite o dia fecha e fica guardado no relatório.
            </p>
          )}
          {todayList.map((t) => (
            <NeonCard key={t.id} className="flex items-center justify-between gap-3 p-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", t.type === "in" ? "bg-[#00FF88]/10 text-[#00FF88]" : "bg-[#FF4D6D]/10 text-[#FF4D6D]")}>
                  {t.type === "in" ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}
                </span>
                <div className="min-w-0">
                  <p className={cn("font-display text-[19px] font-extrabold leading-none", t.type === "in" ? "text-[#00FF88]" : "text-[#FF8FA3]")}>
                    {t.type === "in" ? "+" : "-"} {formatAOA(t.value)}
                  </p>
                  <p className="mt-1 truncate text-[12.5px] text-neutral-300">{t.label} {t.detail && <span className="text-neutral-400">{t.detail}</span>}{t.actorName && <span className="text-[#00E5FF]"> • {t.actorName}</span>}</p>
                </div>
              </div>
              <span className="shrink-0 text-[13px] font-extrabold text-white">{clockHM(t.ts)}</span>
            </NeonCard>
          ))}
        </div>
      </div>

      <button onClick={onOpenSales} className="rise rise-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#00FF88]/50 bg-[#00FF88]/10 py-3 text-[13px] font-extrabold uppercase tracking-wider text-[#00FF88] transition active:scale-95">
        <ShoppingCart size={17} /> Registar Venda (produtos e serviços)
      </button>

      <div className="rise rise-4 grid grid-cols-2 gap-2.5">
        <button onClick={() => onOpenReports("day")} className="neon-border-cyan flex items-center justify-center gap-2 rounded-2xl bg-transparent py-3 text-[13px] font-bold text-[#00E5FF] transition active:scale-95">
          <ChartColumn size={17} /> Ver Relatórios
        </button>
        <button onClick={() => setShowNew(true)} className="neon-border-cyan flex items-center justify-center gap-2 rounded-2xl bg-transparent py-3 text-[13px] font-bold text-[#00E5FF] transition active:scale-95">
          <span className="grid h-5 w-5 place-items-center rounded-md bg-[#00E5FF] text-black"><Plus size={14} strokeWidth={3} /></span> Nova Transação
        </button>
      </div>

      {showNew && (
        <Sheet title="Nova Transação" subtitle="Registar entrada ou saída de caixa" onClose={() => { setShowNew(false); setErr(""); }}>
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-[#1e1e1e] p-1.5">
            {(["in", "out"] as const).map((k) => (
              <button key={k} onClick={() => setKind(k)} className={cn("rounded-xl py-2.5 text-[12px] font-extrabold uppercase tracking-wider transition", kind === k ? (k === "in" ? "bg-[#00FF88] text-black shadow-[0_0_16px_rgba(0,255,136,0.4)]" : "bg-[#FF4D6D] text-white shadow-[0_0_16px_rgba(255,77,109,0.4)]") : "text-neutral-500")}>
                {k === "in" ? "+ Entrada" : "- Saída"}
              </button>
            ))}
          </div>
          <div className="mt-3 space-y-2.5">
            <Field label="Valor (AOA)">
              <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="0,00" inputMode="decimal" className={`${fieldCls} font-display text-[22px] font-extrabold`} />
            </Field>
            <Field label="Descrição">
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={kind === "in" ? "Ex: Venda de bebidas" : "Ex: Conta de luz"} className={fieldCls} />
            </Field>
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-[#1e1e1e] p-1.5">{(["house", "sales"] as const).map((s) => (<button key={s} onClick={() => setTxScope(s)} className={cn("rounded-xl py-2 text-[11px] font-extrabold uppercase", txScope === s ? "bg-[#00E5FF] text-black" : "text-neutral-500")}>{s === "house" ? "Game House" : "Outras vendas"}</button>))}</div>
        <ErrorBox msg={err} />
            <button onClick={submit} className="w-full rounded-xl bg-[#00E5FF] py-3 text-[13px] font-extrabold uppercase tracking-widest text-black transition active:scale-[0.98]">
              Guardar Transação
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
