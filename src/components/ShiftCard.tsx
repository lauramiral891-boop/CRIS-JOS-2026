import { CheckCircle2, Clock3, TriangleAlert } from "lucide-react";
import { useState } from "react";
import type { Shift, Staff, Transaction } from "../lib/types";
import { cn } from "../utils/cn";

const pad = (n: number) => String(n).padStart(2, "0");
const hm = (ts: number) => {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const dmy = (ts: number) => {
  const d = new Date(ts);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};
const dur = (ms: number) => {
  const m = Math.max(0, Math.round(ms / 60000));
  return `${Math.floor(m / 60)}h${pad(m % 60)}`;
};
const sod = (ts: number) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

interface Props {
  shifts: Shift[];
  transactions: Transaction[];
  actorId: string;
  actorName: string;
  isOwner: boolean;
  now: number;
  onChange: (fn: (list: Shift[]) => Shift[]) => void;
  onOpenReport: () => void;
  staff: Staff[];
  onStaffSchedule: (id: string, p: { schedStart?: string; schedEnd?: string }) => void;
}

export default function ShiftCard({ shifts, transactions, actorId, actorName, isOwner, now, onChange, onOpenReport, staff, onStaffSchedule }: Props) {
  const mine = shifts.find((s) => s.actorId === actorId && !s.end);
  const today = sod(now);
  const [editId, setEditId] = useState<number | null>(null);
  const me = staff.find((x) => x.id === actorId);
  const atTime = (ts: number, hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    const d = new Date(ts);
    d.setHours(h || 0, m || 0, 0, 0);
    return d.getTime();
  };
  const setTime = (s: Shift, which: "start" | "end", hhmm: string) => {
    if (!hhmm) return;
    const ts = atTime(s.start, hhmm);
    onChange((l) => l.map((x) => (x.id !== s.id ? x : which === "start" ? { ...x, start: ts } : { ...x, end: ts })));
  };
  const flags = (s: Shift) => {
    const st = staff.find((x) => x.id === s.actorId);
    if (!st?.schedStart || !st?.schedEnd) return "";
    const out: string[] = [];
    const late = Math.round((s.start - atTime(s.start, st.schedStart)) / 60000);
    if (late > 5) out.push(`atraso ${late} min`);
    if (s.end) {
      const diff = Math.round((s.end - atTime(s.start, st.schedEnd)) / 60000);
      if (diff < -5) out.push(`saiu ${-diff} min antes`);
      else if (diff > 5) out.push(`+${diff} min extra`);
    }
    return out.join(" • ");
  };
  const list = (isOwner ? shifts : shifts.filter((s) => s.actorId === actorId))
    .filter((s) => s.start >= today - 14 * 86400000)
    .sort((a, b) => b.start - a.start)
    .slice(0, 30);
  const pending = list.filter((s) => !s.delivered && (!!s.end || s.start < today)).length;

  const start = () => {
    if (mine) return;
    const t = Date.now();
    onChange((l) => [{ id: t, actorId, actorName, start: t, end: null, delivered: false, deliveredAt: null }, ...l]);
  };
  const end = (id: number) => onChange((l) => l.map((s) => (s.id === id ? { ...s, end: Date.now() } : s)));
  const deliver = (id: number) => onChange((l) => l.map((s) => (s.id === id ? { ...s, delivered: true, deliveredAt: Date.now() } : s)));
  const closeOld = (s: Shift) => {
    const last = transactions
      .filter((t) => t.actorId === s.actorId && t.ts >= s.start && t.ts < s.start + 18 * 3600000)
      .reduce((m, t) => Math.max(m, t.ts), s.start);
    onChange((l) => l.map((x) => (x.id === s.id ? { ...x, end: last } : x)));
  };

  return (
    <div className="px-4 pt-3">
      <div className="rounded-2xl border border-white/10 bg-[#141414] p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 font-display text-[15px] font-extrabold uppercase tracking-wide">
            <Clock3 size={16} className="text-[#00E5FF]" /> Turno
          </p>
          {isOwner && pending > 0 && (
            <span className="rounded-full bg-[#FFC107]/15 px-2 py-0.5 text-[10.5px] font-extrabold text-[#FFC107]">{pending} por entregar</span>
          )}
        </div>
        <p className="mt-2 text-[12.5px] text-neutral-300">
          {mine ? `Turno iniciado às ${hm(mine.start)} • ${dur(now - mine.start)}` : "Sem turno iniciado."}
        </p>
        {me?.schedStart && me?.schedEnd && <p className="mt-1 text-[11px] text-neutral-500">Horário: {me.schedStart} - {me.schedEnd}</p>}
        <div className="mt-3 grid grid-cols-2 gap-2">
          {mine ? (
            <button type="button" onClick={() => { end(mine.id); onOpenReport(); }} className="rounded-xl bg-[#FF4D6D] py-2.5 text-[12px] font-extrabold uppercase tracking-wider text-white active:scale-95">
              Terminar turno
            </button>
          ) : (
            <button type="button" onClick={start} className="rounded-xl bg-[#00FF88] py-2.5 text-[12px] font-extrabold uppercase tracking-wider text-black active:scale-95">
              Iniciar turno
            </button>
          )}
          <button type="button" onClick={onOpenReport} className="rounded-xl border border-white/15 py-2.5 text-[12px] font-bold text-neutral-200 active:scale-95">
            Abrir relatório
          </button>
        </div>
        {isOwner && staff.filter((x) => x.active).length > 0 && (
          <div className="mt-3 rounded-xl bg-white/[0.04] p-3">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-400">Horário dos funcionários</p>
            <ul className="mt-2 space-y-2">
              {staff.filter((x) => x.active).map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold">{x.name}</span>
                  <input type="time" value={x.schedStart ?? ""} onChange={(e) => onStaffSchedule(x.id, { schedStart: e.target.value })} className="w-[84px] rounded-lg bg-[#252525] px-2 py-1.5 text-[12px] outline-none" style={{ colorScheme: "dark" }} aria-label="Entrada" />
                  <span className="text-neutral-500">-</span>
                  <input type="time" value={x.schedEnd ?? ""} onChange={(e) => onStaffSchedule(x.id, { schedEnd: e.target.value })} className="w-[84px] rounded-lg bg-[#252525] px-2 py-1.5 text-[12px] outline-none" style={{ colorScheme: "dark" }} aria-label="Saída" />
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[10.5px] text-neutral-500">Entrada e saída previstas. Os turnos mostram atrasos e horas extra.</p>
          </div>
        )}
        {list.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {list.map((s) => {
              const open = !s.end;
              const old = open && s.start < today;
              return (
                <li key={s.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.04] px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold">{isOwner ? s.actorName : dmy(s.start)}</p>
                    <p className="text-[11px] text-neutral-400">
                      {dmy(s.start)} • {hm(s.start)}{s.end ? ` - ${hm(s.end)} • ${dur(s.end - s.start)}` : open && !old ? ` • ${dur(now - s.start)}` : ""}
                    </p>
                    {flags(s) && <p className="text-[10.5px] font-bold text-[#FFC107]">{flags(s)}</p>}
                    {isOwner && (editId === s.id ? (
                      <div className="mt-1 flex items-center gap-1.5">
                        <input type="time" value={hm(s.start)} onChange={(e) => setTime(s, "start", e.target.value)} className="w-[80px] rounded-lg bg-[#252525] px-1.5 py-1 text-[11px] outline-none" style={{ colorScheme: "dark" }} aria-label="Entrada" />
                        <input type="time" value={s.end ? hm(s.end) : ""} onChange={(e) => setTime(s, "end", e.target.value)} className="w-[80px] rounded-lg bg-[#252525] px-1.5 py-1 text-[11px] outline-none" style={{ colorScheme: "dark" }} aria-label="Saída" />
                        <button type="button" onClick={() => setEditId(null)} className="text-[10.5px] font-extrabold text-[#00FF88]">OK</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setEditId(s.id)} className="mt-0.5 text-[10.5px] font-bold text-neutral-500 underline">Editar horas</button>
                    ))}
                  </div>
                  {old ? (
                    <button type="button" onClick={() => closeOld(s)} className="flex shrink-0 items-center gap-1 rounded-lg bg-[#FF4D6D]/15 px-2 py-1 text-[10.5px] font-extrabold text-[#FF4D6D]">
                      <TriangleAlert size={12} /> Não terminado
                    </button>
                  ) : open ? (
                    <span className="shrink-0 rounded-lg bg-[#00E5FF]/15 px-2 py-1 text-[10.5px] font-extrabold text-[#00E5FF]">Em curso</span>
                  ) : s.delivered ? (
                    <span className="flex shrink-0 items-center gap-1 rounded-lg bg-[#00FF88]/15 px-2 py-1 text-[10.5px] font-extrabold text-[#00FF88]">
                      <CheckCircle2 size={12} /> Entregue
                    </span>
                  ) : (
                    <button type="button" onClick={() => deliver(s.id)} className={cn("shrink-0 rounded-lg bg-[#FFC107]/15 px-2 py-1 text-[10.5px] font-extrabold text-[#FFC107] active:scale-95")}>
                      Pendente • marcar entregue
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
