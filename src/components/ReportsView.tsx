import { useMemo, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Minus, Send, TrendingDown, TrendingUp } from "lucide-react";
import MonthCalendar from "./MonthCalendar";
import type { Transaction } from "../lib/types";
import { buildReport, shiftAnchor, totals, type Bucket, type Report, type ReportKind } from "../lib/reports";
import { byCategory } from "../lib/categories";
import { WEEKDAYS_FULL, addDays, dm, longDate, mondayIndex, parseYmd, sod, timeHMS, ymd } from "../lib/dates";
import { clockHM, compactAOA, formatAOA, formatAOAshort, pad } from "../lib/format";
import { downloadFile } from "../lib/storage";
import { cn } from "../utils/cn";

export type ReportTab = ReportKind | "calendar";

const tabs: { id: ReportTab; label: string }[] = [
  { id: "day", label: "Dia" },
  { id: "week", label: "Semana" },
  { id: "month", label: "Mês" },
  { id: "quarter", label: "Trimestre" },
  { id: "year", label: "Ano" },
  { id: "calendar", label: "Calendário" },
];

function Bars({ buckets, dense }: { buckets: Bucket[]; dense: boolean }) {
  const max = Math.max(...buckets.map((b) => b.income), 0);
  const best = max > 0 ? buckets.findIndex((b) => b.income === max) : -1;
  return (
    <div className="flex h-[170px] items-stretch gap-[3px]">
      {buckets.map((b, i) => {
        const h = max > 0 ? (b.income / max) * 100 : 0;
        const show = !dense || i % 3 === 0;
        return (
          <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
            <span className="h-3 text-[8.5px] font-extrabold leading-3 text-[#00E5FF]">
              {!dense && b.income > 0 ? compactAOA(b.income) : ""}
            </span>
            <div className="flex w-full flex-1 items-end overflow-hidden rounded-t-md bg-white/[0.04]">
              <div
                className={cn("w-full rounded-t-md transition-all duration-700", b.current && "ring-1 ring-white/70")}
                style={{
                  height: `${b.income > 0 ? Math.max(5, h) : 0}%`,
                  background: i === best ? "linear-gradient(to top,#00FF8855,#00FF88)" : "linear-gradient(to top,#00E5FF44,#00E5FF)",
                  boxShadow: b.income > 0 ? `0 0 10px ${i === best ? "#00FF8888" : "#00E5FF66"}` : "none",
                }}
              />
            </div>
            <span className={cn("h-3 text-[8.5px] font-bold leading-3", b.current ? "text-[#00E5FF]" : "text-neutral-500")}>{show ? b.label : ""}</span>
          </div>
        );
      })}
    </div>
  );
}

function Variation({ cur, prev }: { cur: number; prev: number }) {
  if (prev <= 0) return <span className="flex items-center gap-1 text-[11px] font-semibold text-neutral-500"><Minus size={12} /> Sem período anterior para comparar</span>;
  const pct = ((cur - prev) / prev) * 100;
  const up = pct >= 0;
  return (
    <span className={cn("flex items-center gap-1 text-[11px] font-bold", up ? "text-[#00FF88]" : "text-[#FF4D6D]")}>
      {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
      {up ? "+" : ""}{pct.toFixed(0)}% vs período anterior ({formatAOAshort(prev)})
    </span>
  );
}

export default function ReportsView({
  transactions: allTransactions, now, lang, initial, onClose, onSendPdf: sendPdfRaw,
}: {
  onSendPdf: (r: Report) => void;
  transactions: Transaction[];
  now: number;
  lang: string;
  initial: ReportTab;
  onClose: () => void;
}) {
  const nowDate = new Date(now);
  const [tab, setTab] = useState<ReportTab>(initial);
  const [scope, setScope] = useState<"all" | "games" | "sales">("all");
  const transactions = useMemo(() => {
    if (scope === "games") return allTransactions.filter((t) => ["sessao", "extensao", "recarga"].includes(t.category));
    if (scope === "sales") return allTransactions.filter((t) => ["venda", "servico"].includes(t.category));
    return allTransactions;
  }, [allTransactions, scope]);
  const onSendPdf = (r: Parameters<typeof sendPdfRaw>[0]) => sendPdfRaw({ ...r, scope } as typeof r);
  const [anchor, setAnchor] = useState<Date>(() => sod(new Date()));
  const [calMonth, setCalMonth] = useState<Date>(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selDay, setSelDay] = useState<string>(() => ymd(new Date()));

  const minute = Math.floor(now / 60000);
  const report = useMemo(
    () => (tab === "calendar" ? null : buildReport(tab, anchor, transactions, new Date())),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tab, anchor, transactions, minute]
  );

  const isCurrent = report ? nowDate >= report.from && nowDate < report.to : false;

  const exportCsv = () => {
    if (!report) return;
    const rows = transactions
      .filter((t) => t.ts >= report.from.getTime() && t.ts < report.to.getTime())
      .sort((a, b) => a.ts - b.ts)
      .map((t) => {
        const d = new Date(t.ts);
        return [`${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`, clockHM(t.ts), t.type === "in" ? "Entrada" : "Saída", t.value.toFixed(2), `"${t.label.replace(/"/g, "'")} ${t.detail}"`].join(";");
      });
    downloadFile(`relatorio-${tab}-${ymd(report.from)}.csv`, ["Data;Hora;Tipo;Valor (AOA);Descrição", ...rows].join("\n"), "text/csv");
  };

  const dayTx = (key: string) => {
    const d = parseYmd(key);
    return transactions.filter((t) => t.ts >= d.getTime() && t.ts < addDays(d, 1).getTime()).sort((a, b) => b.ts - a.ts);
  };

  const TxList = ({ list }: { list: Transaction[] }) => (
    <div className="space-y-1.5">
      {list.length === 0 && <p className="rounded-xl border border-dashed border-white/15 p-4 text-center text-[12.5px] text-neutral-500">Sem movimentos neste dia.</p>}
      {list.map((t) => (
        <div key={t.id} className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.07] bg-[#1e1e1e] px-3 py-2.5">
          <div className="min-w-0">
            <p className={cn("font-display text-[16px] font-extrabold leading-none", t.type === "in" ? "text-[#00FF88]" : "text-[#FF8FA3]")}>
              {t.type === "in" ? "+" : "-"} {formatAOA(t.value)}
            </p>
            <p className="mt-0.5 truncate text-[11.5px] text-neutral-400">{t.label} {t.detail}</p>
          </div>
          <span className="shrink-0 text-[12px] font-bold">{clockHM(t.ts)}</span>
        </div>
      ))}
    </div>
  );

  const selDate = parseYmd(selDay);
  const selTotals = totals(transactions, selDate, addDays(selDate, 1));
  const monthTotals = totals(transactions, calMonth, new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1));

  return (
    <div className="fade absolute inset-0 z-50 flex flex-col bg-[#121212]">
      <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3.5">
        <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 active:scale-95" aria-label="Voltar">
          <ArrowLeft size={17} />
        </button>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[21px] font-extrabold uppercase leading-none">Relatórios</h3>
          <p className="flex items-center gap-1.5 truncate text-[11px] capitalize text-neutral-500">
            <span className="live-dot h-1.5 w-1.5 shrink-0 rounded-full bg-[#00FF88]" />
            {longDate(nowDate, lang)} • <span className="tabular-nums">{timeHMS(nowDate)}</span>
          </p>
        </div>
      </div>

      <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 py-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] font-extrabold transition active:scale-95",
              tab === t.id ? "border-[#00E5FF] bg-[#00E5FF] text-black shadow-[0_0_14px_rgba(0,229,255,0.45)]" : "border-white/10 bg-[#1e1e1e] text-neutral-400"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex gap-1.5 px-4 pb-2">
        {([["all", "Tudo"], ["games", "Jogos"], ["sales", "Vendas"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setScope(id)} className={cn("rounded-full border px-3 py-1 text-[11px] font-bold transition active:scale-95", scope === id ? "border-[#00FF88] bg-[#00FF88]/15 text-[#00FF88]" : "border-white/10 bg-[#1e1e1e] text-neutral-400")}>{label}</button>
        ))}
      </div>
      <div className="thin-scroll flex-1 space-y-3.5 overflow-y-auto px-4 pb-8">
        {report && (
          <>
            <div className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-[#1e1e1e] p-2">
              <button onClick={() => setAnchor(shiftAnchor(report.kind, anchor, -1))} className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.06] active:scale-90" aria-label="Anterior">
                <ChevronLeft size={17} />
              </button>
              <div className="text-center">
                <p className="font-display text-[19px] font-extrabold uppercase leading-none">{report.title}</p>
                <p className="mt-0.5 flex items-center justify-center gap-1.5 text-[11px] text-neutral-500">
                  {report.subtitle}
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-extrabold uppercase", isCurrent ? "bg-[#00FF88]/15 text-[#00FF88]" : report.closed ? "bg-white/10 text-neutral-400" : "bg-[#FFC107]/15 text-[#FFC107]")}>
                    {isCurrent ? "Em curso" : report.closed ? "Fechado" : "Futuro"}
                  </span>
                </p>
              </div>
              <button onClick={() => setAnchor(shiftAnchor(report.kind, anchor, 1))} className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.06] active:scale-90" aria-label="Seguinte">
                <ChevronRight size={17} />
              </button>
            </div>
            {!isCurrent && (
              <button onClick={() => setAnchor(sod(new Date()))} className="mx-auto block rounded-full border border-[#00E5FF]/40 bg-[#00E5FF]/10 px-4 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#00E5FF]">
                Voltar a hoje
              </button>
            )}

            <div className="neon-border-cyan rounded-2xl bg-[#141414] p-4 text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400">Dinheiro trabalhado</p>
              <p className="neon-text-cyan font-display text-[32px] font-extrabold leading-tight text-white">{formatAOA(report.totals.income)}</p>
              <div className="mt-1 flex justify-center"><Variation cur={report.totals.income} prev={report.prev.income} /></div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-white/10 bg-[#1e1e1e] p-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Despesas</p>
                <p className="font-display text-[13px] font-extrabold text-[#FF4D6D]">{formatAOAshort(report.totals.expense)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#1e1e1e] p-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Lucro</p>
                <p className={cn("font-display text-[13px] font-extrabold", report.totals.net >= 0 ? "text-[#00FF88]" : "text-[#FF4D6D]")}>{formatAOAshort(report.totals.net)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#1e1e1e] p-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Movimentos</p>
                <p className="font-display text-[13px] font-extrabold">{report.totals.count}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-[#1e1e1e] p-3.5">
              <p className="mb-2 font-display text-[14px] font-bold uppercase tracking-wider">
                {report.kind === "day" ? "Receita por hora" : report.kind === "week" ? "Receita por dia da semana" : report.kind === "month" ? "Receita por semana" : "Receita por mês"}
              </p>
              <Bars buckets={report.buckets} dense={report.kind === "day"} />
            </div>

            {report.kind === "day" ? (
              <div>
                <p className="mb-2 font-display text-[14px] font-bold uppercase tracking-wider">Movimentos do dia</p>
                <TxList list={dayTx(ymd(report.from))} />
              </div>
            ) : (
              <div>
                <p className="mb-2 font-display text-[14px] font-bold uppercase tracking-wider">Detalhe</p>
                <div className="space-y-1.5">
                  {report.buckets.map((b, i) => (
                    <div key={i} className={cn("flex items-center justify-between rounded-xl border bg-[#1e1e1e] px-3 py-2.5", b.current ? "border-[#00E5FF]/50" : "border-white/[0.07]")}>
                      <div>
                        <p className="text-[13px] font-bold">
                          {report.kind === "week" ? WEEKDAYS_FULL[mondayIndex(b.from)] : b.sub && report.kind !== "month" ? b.sub : b.label}
                          {b.current && <span className="ml-2 rounded-full bg-[#00E5FF]/15 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-[#00E5FF]">{report.kind === "week" ? "Hoje" : "Agora"}</span>}
                        </p>
                        <p className="text-[11px] text-neutral-500">{report.kind === "month" ? `Dias ${b.sub}` : report.kind === "week" ? b.sub : `${b.label}`}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[13px] font-extrabold text-[#00FF88]">{formatAOAshort(b.income)}</p>
                        {b.expense > 0 && <p className="text-[11px] font-bold text-[#FF4D6D]">- {formatAOAshort(b.expense)}</p>}
                      </div>
                    </div>
                  ))}
                </div>

                {report.kind === "year" && (
                  <div className="mt-3">
                    <p className="mb-2 font-display text-[14px] font-bold uppercase tracking-wider">Por trimestre</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[0, 1, 2, 3].map((q) => {
                        const inc = report.buckets.slice(q * 3, q * 3 + 3).reduce((a, b) => a + b.income, 0);
                        const exp = report.buckets.slice(q * 3, q * 3 + 3).reduce((a, b) => a + b.expense, 0);
                        return (
                          <div key={q} className="rounded-xl border border-white/[0.07] bg-[#1e1e1e] p-3">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">{q + 1}.º Trimestre</p>
                            <p className="font-display text-[16px] font-extrabold text-[#00FF88]">{formatAOAshort(inc)}</p>
                            <p className="text-[11px] font-bold text-[#FF4D6D]">- {formatAOAshort(exp)}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {(() => {
              const cats = byCategory(transactions, report.from, report.to);
              if (cats.length === 0) return null;
              return (
                <div>
                  <p className="mb-2 font-display text-[14px] font-bold uppercase tracking-wider">Por categoria</p>
                  <div className="space-y-1.5">
                    {cats.map((c) => (
                      <div key={c.key} className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-[#1e1e1e] px-3 py-2.5">
                        <div>
                          <p className="text-[13px] font-bold">{c.label}</p>
                          <p className="text-[11px] text-neutral-500">{c.count} movimento{c.count === 1 ? "" : "s"}</p>
                        </div>
                        <div className="text-right">
                          {c.income > 0 && <p className="text-[13px] font-extrabold text-[#00FF88]">{formatAOAshort(c.income)}</p>}
                          {c.expense > 0 && <p className="text-[11px] font-bold text-[#FF4D6D]">- {formatAOAshort(c.expense)}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <button onClick={() => onSendPdf(report)} className="neon-btn-green flex w-full items-center justify-center gap-2 rounded-xl bg-[#00FF88] py-3 text-[12px] font-extrabold uppercase tracking-wider text-black active:scale-[0.98]">
              <Send size={15} /> Enviar PDF por WhatsApp
            </button>

            <button onClick={exportCsv} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#00E5FF]/40 bg-[#00E5FF]/10 py-3 text-[12px] font-extrabold uppercase tracking-wider text-[#00E5FF] active:scale-[0.98]">
              <Download size={15} /> Exportar CSV deste período
            </button>
          </>
        )}

        {tab === "calendar" && (
          <>
            <MonthCalendar
              month={calMonth}
              onMonth={setCalMonth}
              selected={selDay}
              onSelect={setSelDay}
              today={nowDate}
              mark={(k) => {
                const d = parseYmd(k);
                const t = totals(transactions, d, addDays(d, 1));
                if (!t.count) return null;
                return t.income > 0 ? { text: compactAOA(t.income), color: "#00FF88" } : { text: `-${compactAOA(t.expense)}`, color: "#FF4D6D" };
              }}
            />
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-white/10 bg-[#1e1e1e] p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Receita do mês</p>
                <p className="font-display text-[17px] font-extrabold text-[#00FF88]">{formatAOAshort(monthTotals.income)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#1e1e1e] p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Despesas do mês</p>
                <p className="font-display text-[17px] font-extrabold text-[#FF4D6D]">{formatAOAshort(monthTotals.expense)}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-white/[0.07] bg-[#1e1e1e] p-3.5">
              <p className="font-display text-[16px] font-extrabold uppercase capitalize">
                {WEEKDAYS_FULL[mondayIndex(selDate)]} • {dm(selDate)}/{selDate.getFullYear()}
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[11px]">
                <div><p className="font-bold text-neutral-500">Receita</p><p className="font-extrabold text-[#00FF88]">{formatAOAshort(selTotals.income)}</p></div>
                <div><p className="font-bold text-neutral-500">Despesas</p><p className="font-extrabold text-[#FF4D6D]">{formatAOAshort(selTotals.expense)}</p></div>
                <div><p className="font-bold text-neutral-500">Lucro</p><p className="font-extrabold text-[#00E5FF]">{formatAOAshort(selTotals.net)}</p></div>
              </div>
            </div>
            <TxList list={dayTx(selDay)} />
            <button onClick={() => onSendPdf(buildReport("day", selDate, transactions, new Date()))} className="neon-btn-green flex w-full items-center justify-center gap-2 rounded-xl bg-[#00FF88] py-3 text-[12px] font-extrabold uppercase tracking-wider text-black active:scale-[0.98]">
              <Send size={15} /> Enviar PDF deste dia por WhatsApp
            </button>
          </>
        )}

        {transactions.length === 0 && (
          <p className="rounded-2xl border border-dashed border-white/15 p-4 text-center text-[12px] leading-relaxed text-neutral-500">
            Ainda não há movimentos. Assim que iniciar sessões ou registar transações, o dia, a semana, o mês, o trimestre e o ano são calculados automaticamente aqui.
          </p>
        )}
      </div>
    </div>
  );
}
