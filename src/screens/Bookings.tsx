import { useState } from "react";
import { Plus, CalendarDays, Clock3, Check, X, Trash2, ChevronLeft, ChevronRight, Ban } from "lucide-react";
import { NeonCard, ProgressBar } from "../components/shared";
import Sheet from "../components/Sheet";
import MonthCalendar from "../components/MonthCalendar";
import { ErrorBox, Field, fieldCls } from "../components/ui";
import type { Booking, BookingStatus, Station } from "../lib/types";
import {
  WEEKDAYS_SHORT, addDays, bookingTs, dm, longDate, parseYmd, sod, startOfWeek, ymd,
} from "../lib/dates";
import { cn } from "../utils/cn";

const statusText = { confirmed: "Confirmada", pending: "Pendente", cancelled: "Cancelada" } as const;
const statusColor = { confirmed: "#00FF88", pending: "#FFC107", cancelled: "#FF4D6D" } as const;

export type NewBooking = Omit<Booking, "id" | "alerted">;

export default function BookingsScreen({
  bookings, stations, now, lang, onAdd, onStatus, onRemove,
}: {
  bookings: Booking[];
  stations: Station[];
  now: number;
  lang: string;
  onAdd: (b: NewBooking) => void;
  onStatus: (id: number, s: BookingStatus) => void;
  onRemove: (id: number) => void;
}) {
  const todayKey = ymd(new Date(now));
  const [day, setDay] = useState(todayKey);
  const [showAdd, setShowAdd] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    date: todayKey, start: "18:00", end: "20:00", stationId: "", pkg: "", game: "", players: "", status: "confirmed" as BookingStatus,
  });

  const selected = parseYmd(day);
  const weekStart = startOfWeek(selected);
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const countOf = (k: string) => bookings.filter((b) => b.date === k && b.status !== "cancelled").length;
  const list = bookings.filter((b) => b.date === day).sort((a, b) => a.start.localeCompare(b.start));

  const openAdd = () => {
    setForm((f) => ({ ...f, date: day }));
    setErr("");
    setShowAdd(true);
  };

  const submit = () => {
    if (!form.players.trim()) return setErr("Indique o(s) jogador(es) da reserva.");
    if (!form.date || !form.start || !form.end) return setErr("Indique a data e as horas.");
    if (form.end <= form.start) return setErr("A hora de fim deve ser depois da hora de início.");
    const st = stations.find((s) => String(s.id) === form.stationId);
    onAdd({
      date: form.date, start: form.start, end: form.end,
      stationId: st ? st.id : null, stationName: st ? st.name : "Sem máquina definida",
      pkg: form.pkg.trim() || "Reserva", game: form.game.trim(), players: form.players.trim(), status: form.status,
    });
    setDay(form.date);
    setShowAdd(false);
    setForm((f) => ({ ...f, players: "", pkg: "", game: "" }));
  };

  return (
    <div className="space-y-4 px-4 pb-6">
      <h1 className="rise pt-1 text-center font-display text-[26px] font-extrabold uppercase tracking-wide">Reservas Próximas</h1>

      <div className="rise rise-1 flex items-center gap-1.5">
        <button onClick={() => setDay(ymd(addDays(selected, -7)))} className="grid h-9 w-7 shrink-0 place-items-center rounded-lg bg-white/[0.06] active:scale-90" aria-label="Semana anterior"><ChevronLeft size={15} /></button>
        <div className="grid flex-1 grid-cols-7 gap-1">
          {week.map((d, i) => {
            const k = ymd(d);
            const active = k === day;
            const isToday = k === todayKey;
            const n = countOf(k);
            return (
              <button key={k} onClick={() => setDay(k)} className={cn("flex flex-col items-center rounded-xl border py-1.5 transition active:scale-95", active ? "border-[#00E5FF] bg-[#00E5FF] text-black shadow-[0_0_18px_rgba(0,229,255,0.5)]" : isToday ? "border-[#00E5FF]/60 bg-[#00E5FF]/10 text-[#00E5FF]" : "border-white/10 bg-[#1e1e1e] text-neutral-400")}>
                <span className={cn("text-[9.5px] font-semibold", active ? "text-black/70" : "")}>{isToday ? "Hoje" : WEEKDAYS_SHORT[i]}</span>
                <span className="font-display text-[18px] font-extrabold leading-none">{d.getDate()}</span>
                <span className="mt-0.5 flex h-1.5 gap-0.5">
                  {Array.from({ length: Math.min(3, n) }).map((_, j) => <span key={j} className="h-1 w-1 rounded-full" style={{ background: active ? "#04222a" : "#00FF88" }} />)}
                </span>
              </button>
            );
          })}
        </div>
        <button onClick={() => setDay(ymd(addDays(selected, 7)))} className="grid h-9 w-7 shrink-0 place-items-center rounded-lg bg-white/[0.06] active:scale-90" aria-label="Semana seguinte"><ChevronRight size={15} /></button>
      </div>

      <p className="text-center text-[11px] font-medium capitalize text-neutral-500">
        {longDate(selected, lang)} • <span className="font-bold text-[#00E5FF]">{list.length} agendamento{list.length === 1 ? "" : "s"}</span>
        {day !== todayKey && <button onClick={() => setDay(todayKey)} className="ml-2 font-extrabold uppercase text-[#00E5FF]">Hoje</button>}
      </p>

      <div className="space-y-2.5">
        {list.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-[13px] leading-relaxed text-neutral-500">
            Sem reservas para este dia. Toque em “Adicionar Nova Reserva”.
          </div>
        )}
        {list.map((b) => {
          const s = bookingTs(b.date, b.start);
          const e = bookingTs(b.date, b.end);
          const live = b.status !== "cancelled" && now >= s && now < e;
          const color = statusColor[b.status];
          return (
            <NeonCard key={b.id} className={cn("p-3", live && "border-[#00E5FF]/50")}>
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border font-display text-[14px] font-extrabold" style={{ borderColor: `${color}55`, background: `${color}14`, color }}>
                  {b.start.slice(0, 2)}h
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1 text-[11.5px] font-semibold text-neutral-300"><Clock3 size={11} className="text-neutral-500" /> {b.start} - {b.end}</span>
                    <span className="text-[12px] font-bold" style={{ color }}>{statusText[b.status]}</span>
                  </div>
                  <p className="mt-0.5 text-[13.5px] font-semibold leading-snug text-white">
                    {b.stationName} - {b.pkg}{b.game ? ` (${b.game})` : ""} - <span className="font-bold">{b.players}</span>
                  </p>
                </div>
              </div>
              {live && (
                <div className="mt-2.5">
                  <ProgressBar value={((now - s) / (e - s)) * 100} color="#00E5FF" live />
                  <p className="mt-1 text-[10.5px] font-bold text-[#00E5FF]">A decorrer agora</p>
                </div>
              )}
              <div className="mt-2.5 flex gap-2">
                {b.status === "pending" && (
                  <button onClick={() => onStatus(b.id, "confirmed")} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#00FF88] py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-black active:scale-95"><Check size={13} /> Confirmar</button>
                )}
                {b.status !== "cancelled" ? (
                  <button onClick={() => onStatus(b.id, "cancelled")} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/15 py-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-400 active:scale-95"><Ban size={12} /> Cancelar</button>
                ) : (
                  <button onClick={() => onStatus(b.id, "confirmed")} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-[#00FF88]/40 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#00FF88] active:scale-95">Reativar</button>
                )}
                <button onClick={() => onRemove(b.id)} className="grid w-9 place-items-center rounded-lg bg-[#FF4D6D]/10 text-[#FF4D6D]" aria-label="Apagar reserva"><Trash2 size={14} /></button>
              </div>
            </NeonCard>
          );
        })}
      </div>

      <div className="rise rise-4 flex flex-col items-end gap-2 pt-1">
        <button onClick={openAdd} className="neon-btn-cyan flex items-center gap-2 rounded-full bg-[#00E5FF] px-5 py-2.5 text-[13px] font-bold text-black transition active:scale-95">
          <Plus size={16} strokeWidth={3} /> Adicionar Nova Reserva
        </button>
        <button onClick={() => { setCalMonth(new Date(selected.getFullYear(), selected.getMonth(), 1)); setShowGrid(true); }} className="flex items-center gap-2 rounded-full bg-[#00E5FF] px-5 py-2.5 text-[13px] font-bold text-black transition active:scale-95">
          <CalendarDays size={15} /> Ver Calendário
        </button>
      </div>

      {showAdd && (
        <Sheet title="Nova Reserva" subtitle="Agende uma máquina para um jogador ou equipa" onClose={() => setShowAdd(false)}>
          <div className="space-y-2.5">
            <Field label="Data"><input type="date" value={form.date} min={ymd(sod(new Date()))} onChange={(e) => setForm({ ...form, date: e.target.value })} className={fieldCls} /></Field>
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Início"><input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} className={fieldCls} /></Field>
              <Field label="Fim"><input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} className={fieldCls} /></Field>
            </div>
            <Field label="Máquina">
              <select value={form.stationId} onChange={(e) => setForm({ ...form, stationId: e.target.value })} className={fieldCls}>
                <option value="">Sem máquina específica</option>
                {stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Pacote"><input value={form.pkg} onChange={(e) => setForm({ ...form, pkg: e.target.value })} placeholder="Ex: Missão" className={fieldCls} /></Field>
              <Field label="Jogo"><input value={form.game} onChange={(e) => setForm({ ...form, game: e.target.value })} placeholder="Ex: FIFA 24" className={fieldCls} /></Field>
            </div>
            <Field label="Jogador(es)"><input value={form.players} onChange={(e) => setForm({ ...form, players: e.target.value })} placeholder="Ex: Lucas & Matheus" className={fieldCls} /></Field>
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-[#1e1e1e] p-1.5">
              {(["confirmed", "pending"] as const).map((s) => (
                <button key={s} onClick={() => setForm({ ...form, status: s })} className={cn("rounded-xl py-2 text-[12px] font-extrabold uppercase tracking-wider", form.status === s ? (s === "confirmed" ? "bg-[#00FF88] text-black" : "bg-[#FFC107] text-black") : "text-neutral-500")}>
                  {statusText[s]}
                </button>
              ))}
            </div>
            <ErrorBox msg={err} />
            <button onClick={submit} className="neon-btn-cyan w-full rounded-xl bg-[#00E5FF] py-3 text-[13px] font-extrabold uppercase tracking-widest text-black transition active:scale-[0.98]">Guardar Reserva</button>
          </div>
        </Sheet>
      )}

      {showGrid && (
        <Sheet title="Calendário" subtitle="Toque num dia para ver as reservas. Os pontos indicam quantas existem." onClose={() => setShowGrid(false)}>
          <MonthCalendar
            month={calMonth}
            onMonth={setCalMonth}
            selected={day}
            today={new Date(now)}
            onSelect={(k) => { setDay(k); setShowGrid(false); }}
            mark={(k) => { const n = countOf(k); return n ? { count: n, color: "#00FF88" } : null; }}
          />
          <p className="mt-3 text-center text-[11px] text-neutral-500">Semana atual: {dm(startOfWeek(new Date(now)))} – {dm(addDays(startOfWeek(new Date(now)), 6))}</p>
          <button onClick={() => setShowGrid(false)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-2.5 text-[12px] font-bold"><X size={14} /> Fechar</button>
        </Sheet>
      )}
    </div>
  );
}
