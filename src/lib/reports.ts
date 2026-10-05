import type { Tone, Transaction } from "./types";
import {
  MONTHS, MONTHS_SHORT, WEEKDAYS_FULL, WEEKDAYS_SHORT,
  addDays, dm, isoWeek, mondayIndex, sod, startOfWeek,
} from "./dates";
import { formatAOAshort, pad } from "./format";

export type ReportKind = "day" | "week" | "month" | "quarter" | "year";

export interface Totals {
  income: number;
  expense: number;
  net: number;
  count: number;
}

export interface Bucket {
  label: string;
  sub?: string;
  from: Date;
  to: Date;
  income: number;
  expense: number;
  current: boolean;
}

export interface Report {
  kind: ReportKind;
  title: string;
  subtitle: string;
  from: Date;
  to: Date;
  closed: boolean;
  totals: Totals;
  prev: Totals;
  buckets: Bucket[];
}

export const totals = (txs: Transaction[], from: Date, to: Date): Totals => {
  const a = from.getTime();
  const b = to.getTime();
  let income = 0;
  let expense = 0;
  let count = 0;
  for (const t of txs) {
    if (t.ts >= a && t.ts < b) {
      count++;
      if (t.type === "in") income += t.value;
      else expense += t.value;
    }
  }
  return { income, expense, net: income - expense, count };
};

export function periodRange(kind: ReportKind, anchor: Date): { from: Date; to: Date } {
  const a = sod(anchor);
  const y = a.getFullYear();
  const m = a.getMonth();
  switch (kind) {
    case "day":
      return { from: a, to: addDays(a, 1) };
    case "week": {
      const f = startOfWeek(a);
      return { from: f, to: addDays(f, 7) };
    }
    case "month":
      return { from: new Date(y, m, 1), to: new Date(y, m + 1, 1) };
    case "quarter": {
      const q = Math.floor(m / 3);
      return { from: new Date(y, q * 3, 1), to: new Date(y, q * 3 + 3, 1) };
    }
    case "year":
      return { from: new Date(y, 0, 1), to: new Date(y + 1, 0, 1) };
  }
}

export function shiftAnchor(kind: ReportKind, anchor: Date, dir: 1 | -1): Date {
  const a = sod(anchor);
  const y = a.getFullYear();
  const m = a.getMonth();
  switch (kind) {
    case "day": return addDays(a, dir);
    case "week": return addDays(a, 7 * dir);
    case "month": return new Date(y, m + dir, 1);
    case "quarter": return new Date(y, m + 3 * dir, 1);
    case "year": return new Date(y + dir, 0, 1);
  }
}

export function buildReport(kind: ReportKind, anchor: Date, txs: Transaction[], now: Date): Report {
  const { from, to } = periodRange(kind, anchor);
  const nowMs = now.getTime();
  const mk = (label: string, f: Date, t: Date, sub?: string): Bucket => {
    const tt = totals(txs, f, t);
    return {
      label, sub, from: f, to: t, income: tt.income, expense: tt.expense,
      current: nowMs >= f.getTime() && nowMs < t.getTime(),
    };
  };

  const buckets: Bucket[] = [];
  if (kind === "day") {
    for (let h = 0; h < 24; h++) {
      const f = new Date(from.getFullYear(), from.getMonth(), from.getDate(), h);
      const t = new Date(from.getFullYear(), from.getMonth(), from.getDate(), h + 1);
      buckets.push(mk(`${pad(h)}h`, f, t));
    }
  } else if (kind === "week") {
    for (let i = 0; i < 7; i++) {
      const f = addDays(from, i);
      buckets.push(mk(WEEKDAYS_SHORT[i], f, addDays(f, 1), dm(f)));
    }
  } else if (kind === "month") {
    let cur = new Date(from);
    let n = 1;
    while (cur < to) {
      const nextMon = addDays(startOfWeek(cur), 7);
      const end = nextMon < to ? nextMon : to;
      buckets.push(mk(`S${n}`, cur, end, `${cur.getDate()}–${addDays(end, -1).getDate()}`));
      cur = end;
      n++;
    }
  } else if (kind === "quarter") {
    for (let i = 0; i < 3; i++) {
      const f = new Date(from.getFullYear(), from.getMonth() + i, 1);
      const t = new Date(from.getFullYear(), from.getMonth() + i + 1, 1);
      buckets.push(mk(MONTHS_SHORT[f.getMonth()], f, t, MONTHS[f.getMonth()]));
    }
  } else {
    for (let i = 0; i < 12; i++) {
      const f = new Date(from.getFullYear(), i, 1);
      const t = new Date(from.getFullYear(), i + 1, 1);
      buckets.push(mk(MONTHS_SHORT[i], f, t, MONTHS[i]));
    }
  }

  const last = addDays(to, -1);
  let title = "";
  let subtitle = "";
  if (kind === "day") {
    title = WEEKDAYS_FULL[mondayIndex(from)];
    subtitle = `${dm(from)}/${from.getFullYear()}`;
  } else if (kind === "week") {
    title = `Semana ${isoWeek(from)}`;
    subtitle = `${dm(from)} – ${dm(last)}/${last.getFullYear()}`;
  } else if (kind === "month") {
    title = MONTHS[from.getMonth()];
    subtitle = String(from.getFullYear());
  } else if (kind === "quarter") {
    title = `${Math.floor(from.getMonth() / 3) + 1}.º Trimestre`;
    subtitle = `${MONTHS_SHORT[from.getMonth()]} – ${MONTHS_SHORT[last.getMonth()]} ${from.getFullYear()}`;
  } else {
    title = `Ano ${from.getFullYear()}`;
    subtitle = "Janeiro – Dezembro";
  }

  const pr = periodRange(kind, shiftAnchor(kind, anchor, -1));
  return {
    kind, title, subtitle, from, to,
    closed: to.getTime() <= nowMs,
    totals: totals(txs, from, to),
    prev: totals(txs, pr.from, pr.to),
    buckets,
  };
}

export interface ClosedItem {
  title: string;
  desc: string;
  tone: Tone;
}

/** Gera avisos quando um dia / semana / mês / trimestre / ano fecha desde a última verificação. */
export function checkClosedPeriods(prevTs: number, nowTs: number, txs: Transaction[]): ClosedItem[] {
  const prev = new Date(prevTs);
  const now = new Date(nowTs);
  const out: ClosedItem[] = [];
  if (sod(prev).getTime() === sod(now).getTime()) return out;

  const days: Date[] = [];
  let d = sod(prev);
  const yest = addDays(sod(now), -1);
  while (d <= yest) {
    days.push(d);
    d = addDays(d, 1);
  }
  days.slice(-7).forEach((day) => {
    const t = totals(txs, day, addDays(day, 1));
    if (t.count > 0) {
      const name = WEEKDAYS_FULL[mondayIndex(day)];
      out.push({
        title: `Dia fechado • ${name} ${dm(day)}`,
        desc: `Receita ${formatAOAshort(t.income)} guardada em ${name}.`,
        tone: "cyan",
      });
    }
  });

  const summary = (label: string, from: Date, to: Date, tone: Tone) => {
    const t = totals(txs, from, to);
    if (t.count > 0) {
      out.push({
        title: label,
        desc: `Receita ${formatAOAshort(t.income)} • Despesas ${formatAOAshort(t.expense)} • Lucro ${formatAOAshort(t.net)}`,
        tone,
      });
    }
  };

  if (startOfWeek(prev).getTime() !== startOfWeek(now).getTime()) {
    const f = startOfWeek(prev);
    summary(`Relatório semanal pronto • Semana ${isoWeek(f)}`, f, addDays(f, 7), "green");
  }
  if (prev.getMonth() !== now.getMonth() || prev.getFullYear() !== now.getFullYear()) {
    const f = new Date(prev.getFullYear(), prev.getMonth(), 1);
    summary(`Relatório mensal pronto • ${MONTHS[prev.getMonth()]}`, f, new Date(prev.getFullYear(), prev.getMonth() + 1, 1), "green");
  }
  const qp = Math.floor(prev.getMonth() / 3);
  const qn = Math.floor(now.getMonth() / 3);
  if (qp !== qn || prev.getFullYear() !== now.getFullYear()) {
    summary(`Relatório trimestral pronto • ${qp + 1}.º Trimestre`, new Date(prev.getFullYear(), qp * 3, 1), new Date(prev.getFullYear(), qp * 3 + 3, 1), "amber");
  }
  if (prev.getFullYear() !== now.getFullYear()) {
    summary(`Relatório anual pronto • ${prev.getFullYear()}`, new Date(prev.getFullYear(), 0, 1), new Date(prev.getFullYear() + 1, 0, 1), "amber");
  }
  return out;
}
