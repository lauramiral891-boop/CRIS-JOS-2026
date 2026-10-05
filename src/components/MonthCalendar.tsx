import { ChevronLeft, ChevronRight } from "lucide-react";
import { MONTHS, WEEKDAYS_SHORT, mondayIndex, ymd } from "../lib/dates";
import { cn } from "../utils/cn";

export interface DayMark {
  text?: string;
  color?: string;
  count?: number;
}

export default function MonthCalendar({
  month, onMonth, selected, onSelect, today, mark,
}: {
  month: Date;
  onMonth: (d: Date) => void;
  selected?: string;
  onSelect: (key: string) => void;
  today: Date;
  mark: (key: string) => DayMark | null;
}) {
  const y = month.getFullYear();
  const m = month.getMonth();
  const lead = mondayIndex(new Date(y, m, 1));
  const days = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];
  while (cells.length % 7) cells.push(null);
  const todayKey = ymd(today);

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#1e1e1e] p-3">
      <div className="mb-2 flex items-center justify-between">
        <button onClick={() => onMonth(new Date(y, m - 1, 1))} className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.06] active:scale-90" aria-label="Mês anterior">
          <ChevronLeft size={16} />
        </button>
        <div className="text-center">
          <p className="font-display text-[18px] font-extrabold uppercase leading-none">{MONTHS[m]}</p>
          <p className="text-[11px] font-semibold text-neutral-500">{y}</p>
        </div>
        <button onClick={() => onMonth(new Date(y, m + 1, 1))} className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.06] active:scale-90" aria-label="Mês seguinte">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 text-center">
        {WEEKDAYS_SHORT.map((w) => (
          <span key={w} className="text-[9.5px] font-bold uppercase text-neutral-500">{w}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          if (c === null) return <span key={i} />;
          const key = ymd(new Date(y, m, c));
          const mk = mark(key);
          const isToday = key === todayKey;
          const isSel = key === selected;
          return (
            <button
              key={i}
              onClick={() => onSelect(key)}
              className={cn(
                "flex h-[46px] flex-col items-center justify-center rounded-lg border text-[12px] font-bold transition active:scale-90",
                isSel
                  ? "border-[#00E5FF] bg-[#00E5FF] text-black shadow-[0_0_14px_rgba(0,229,255,0.45)]"
                  : isToday
                  ? "border-[#00E5FF] bg-[#00E5FF]/10 text-[#00E5FF]"
                  : "border-white/[0.06] bg-white/[0.03] text-neutral-200"
              )}
            >
              <span className="leading-none">{c}</span>
              {mk?.text && (
                <span className="mt-0.5 text-[8.5px] font-extrabold leading-none" style={{ color: isSel ? "#04222a" : mk.color }}>
                  {mk.text}
                </span>
              )}
              {!mk?.text && mk?.count ? (
                <span className="mt-1 flex gap-0.5">
                  {Array.from({ length: Math.min(3, mk.count) }).map((_, k) => (
                    <span key={k} className="h-1 w-1 rounded-full" style={{ background: isSel ? "#04222a" : mk.color ?? "#00FF88" }} />
                  ))}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
