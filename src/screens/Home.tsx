import { useState } from "react";
import {
  Users, Play, Package, CalendarPlus, TriangleAlert, MonitorSmartphone,
  Zap, TrendingUp, Clock3, Plus, Square, Wrench, Trophy, Target, CalendarClock,
  Gamepad2, Sparkles, Settings2, Tag, Timer, DoorOpen, DoorClosed, ShoppingCart,
} from "lucide-react";
import { NeonCard, ProgressBar, SectionTitle } from "../components/shared";
import type { Booking, Config, InventoryItem, Session, Station, StationStatus, Transaction } from "../lib/types";
import { compactAOA, formatAOAshort, formatClock, pad } from "../lib/format";
import { bookingTs, dm, isOpenNow, shortDate, sod, timeHMS } from "../lib/dates";
import { cn } from "../utils/cn";

function DailyChart({ hours }: { hours: number[] }) {
  const from = 8;
  const slice = hours.slice(from);
  const W = 320, H = 120, PAD = 12;
  const max = Math.max(...slice, 1);
  const hasData = slice.some((v) => v > 0);
  const stepX = (W - PAD * 2) / (slice.length - 1);
  const pts = slice.map((v, i) => ({
    v, h: from + i, x: PAD + i * stepX, y: H - PAD - (v / max) * (H - PAD * 2 - 14),
  }));
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const cx = (a.x + b.x) / 2;
    d += ` C${cx},${a.y} ${cx},${b.y} ${b.x},${b.y}`;
  }
  const area = `${d} L${pts[pts.length - 1].x},${H - PAD} L${pts[0].x},${H - PAD} Z`;
  const peakI = hasData ? slice.indexOf(Math.max(...slice)) : -1;
  const peak = peakI >= 0 ? pts[peakI] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[128px] w-full">
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="chartLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.6" />
            <stop offset="55%" stopColor="#00E5FF" />
            <stop offset="100%" stopColor="#00FF88" />
          </linearGradient>
          <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={PAD} x2={W - PAD} y1={H * f} y2={H * f} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 4" />
        ))}
        <path d={area} fill="url(#chartFill)" />
        <path d={d} fill="none" stroke="url(#chartLine)" strokeWidth="2.5" strokeLinecap="round" filter="url(#glow)" />
        {pts.map((p, i) => p.v > 0 && (
          <circle key={i} cx={p.x} cy={p.y} r={i === peakI ? 4 : 2.4} fill={i === peakI ? "#00E5FF" : "#0d2b33"} stroke={i === peakI ? "#fff" : "#00E5FF"} strokeWidth={i === peakI ? 1.5 : 1.2} />
        ))}
        {peak && (
          <text x={Math.min(W - 40, Math.max(PAD, peak.x - 14))} y={Math.max(10, peak.y - 10)} fontSize="9" fontWeight="800" fill="#00E5FF">{compactAOA(peak.v)}</text>
        )}
        {!hasData && (
          <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="10" fontWeight="700" fill="#6b7280">Sem movimento hoje ainda</text>
        )}
      </svg>
      <div className="flex justify-between px-1 text-[9px] font-bold tracking-wider text-neutral-500">
        {pts.filter((_, i) => i % 3 === 0).map((p) => <span key={p.h}>{pad(p.h)}h</span>)}
      </div>
    </div>
  );
}

type MapState = "occupied" | StationStatus;

const stationMeta: Record<MapState, { label: string; color: string; bg: string; border: string }> = {
  occupied: { label: "Ocupada", color: "#00E5FF", bg: "rgba(0,229,255,0.12)", border: "rgba(0,229,255,0.5)" },
  free: { label: "Livre", color: "#00FF88", bg: "rgba(0,255,136,0.12)", border: "rgba(0,255,136,0.55)" },
  reserved: { label: "Reservada", color: "#FFC107", bg: "rgba(255,193,7,0.12)", border: "rgba(255,193,7,0.5)" },
  maintenance: { label: "Manutenção", color: "#FF4D6D", bg: "rgba(255,77,109,0.1)", border: "rgba(255,77,109,0.45)" },
};

const tone = (p: number) => (p >= 1 ? "#FF4D6D" : p >= 0.85 ? "#FF7A1A" : p >= 0.6 ? "#FFC107" : "#00E5FF");

function GoalRing({ pct }: { pct: number }) {
  const r = 30, c = 2 * Math.PI * r;
  const p = Math.min(100, pct);
  return (
    <svg width="78" height="78" viewBox="0 0 78 78" className="shrink-0 -rotate-90">
      <circle cx="39" cy="39" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
      <circle cx="39" cy="39" r={r} fill="none" stroke="url(#ringGrad)" strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * p) / 100} style={{ filter: "drop-shadow(0 0 6px rgba(0,255,136,0.7))", transition: "stroke-dashoffset 0.8s" }} />
      <defs>
        <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00E5FF" />
          <stop offset="100%" stopColor="#00FF88" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const barColors = ["#FF4D6D", "#00E5FF", "#FFB020", "#A855F7", "#00FF88"];

interface Props {
  config: Config;
  stations: Station[];
  sessions: Session[];
  transactions: Transaction[];
  bookings: Booking[];
  inventory: InventoryItem[];
  now: number;
  onQuick: (action: string) => void;
  onExtend: (id: number, minutes: number) => void;
  onEnd: (id: number) => void;
  onSetStatus: (id: number, st: StationStatus) => void;
  onStartOn: (stationId: number) => void;
  onManage: (stationId: number | null) => void;
  onOpenReports: () => void;
}

export default function HomeScreen({
  config, stations, sessions, transactions, bookings, inventory, now,
  onQuick, onExtend, onEnd, onSetStatus, onStartOn, onManage, onOpenReports,
}: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const nowD = new Date(now);
  const dayStart = sod(nowD).getTime();
  const dayEnd = dayStart + 86400000;

  const stateOf = (s: Station): MapState => (sessions.some((x) => x.stationId === s.id) ? "occupied" : s.status);
  const sessionOf = (id: number) => sessions.find((x) => x.stationId === id);
  const nameOf = (id: number) => stations.find((s) => s.id === id)?.name ?? `Máquina ${id}`;

  const todayTx = transactions.filter((t) => t.ts >= dayStart && t.ts < dayEnd);
  const revenue = todayTx.filter((t) => t.type === "in").reduce((a, t) => a + t.value, 0);
  const hours = Array.from({ length: 24 }, () => 0);
  todayTx.forEach((t) => { if (t.type === "in") hours[new Date(t.ts).getHours()] += t.value; });
  const peakHour = Math.max(...hours) > 0 ? hours.indexOf(Math.max(...hours)) : -1;

  const occupied = sessions.length;
  const playersNow = new Set(sessions.map((s) => s.player.trim().toLowerCase())).size;
  const goal = config.dailyGoal;
  const goalPct = goal > 0 ? Math.round((revenue / goal) * 100) : 0;
  const open = isOpenNow(config, nowD);

  const sold: Record<string, { n: number; money: number }> = {};
  todayTx.filter((t) => t.type === "in" && t.category === "sessao" && t.plan).forEach((t) => {
    const k = t.plan as string;
    sold[k] = { n: (sold[k]?.n ?? 0) + 1, money: (sold[k]?.money ?? 0) + t.value };
  });
  const top = Object.entries(sold).sort((a, b) => b[1].n - a[1].n).slice(0, 5);
  const topMax = top[0]?.[1].n ?? 1;

  const next = bookings
    .filter((b) => b.status !== "cancelled")
    .map((b) => ({ b, ts: bookingTs(b.date, b.start) }))
    .filter((x) => x.ts >= now)
    .sort((a, b) => a.ts - b.ts)[0];
  const untilNext = (ts: number) => {
    const diff = ts - now;
    if (diff < 3600000) return `daqui a ${Math.max(1, Math.ceil(diff / 60000))} min`;
    if (diff < 86400000) return `daqui a ${Math.floor(diff / 3600000)}h${pad(Math.floor((diff % 3600000) / 60000))}`;
    return `${dm(new Date(ts))} às ${next?.b.start}`;
  };

  const low = inventory.filter((i) => i.stock <= i.min);

  const quick = [
    { id: "add-player", label: "Adicionar Jogador", icon: Users, border: "border-[#00E5FF]/60", text: "text-[#00E5FF]", bg: "bg-[#00E5FF]/10" },
    { id: "start", label: "Iniciar Sessão", icon: Play, border: "border-orange-500/60", text: "text-orange-400", bg: "bg-orange-500/10" },
    { id: "inventory", label: "Sala de Stock", icon: Package, border: "border-orange-500/60", text: "text-orange-400", bg: "bg-orange-500/10" },
    { id: "book", label: "Reservar Máquina", icon: CalendarPlus, border: "border-purple-500/60", text: "text-purple-400", bg: "bg-purple-500/10" },
    { id: "sell", label: "Vender Produtos", icon: ShoppingCart, border: "border-[#00FF88]/60", text: "text-[#00FF88]", bg: "bg-[#00FF88]/10" },
  ];

  const kinds: MapState[] = ["occupied", "free", "reserved", "maintenance"];
  const counts = kinds.map((k) => ({ k, n: stations.filter((s) => stateOf(s) === k).length }));
  const sel = selected !== null ? stations.find((s) => s.id === selected) : undefined;
  const selState = sel ? stateOf(sel) : undefined;
  const selSession = sel ? sessionOf(sel.id) : undefined;
  const btn = "rounded-lg border py-2 text-[11.5px] font-extrabold uppercase tracking-wider active:scale-95";

  return (
    <div className="space-y-4 px-4 pb-6">
      <div className="rise pt-1 text-center">
        <h1 className="truncate font-display text-[26px] font-extrabold uppercase leading-none tracking-wide text-white">
          {config.houseName || "Game House"}
        </h1>
        <p className="mt-1.5 flex items-center justify-center gap-2 text-[11px] font-semibold capitalize text-neutral-400">
          <span className="live-dot h-1.5 w-1.5 rounded-full bg-[#00FF88]" />
          {shortDate(nowD, config.lang)} • <span className="tabular-nums text-white">{timeHMS(nowD)}</span>
          <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase", open ? "bg-[#00FF88]/15 text-[#00FF88]" : "bg-[#FF4D6D]/15 text-[#FF4D6D]")}>
            {open ? <DoorOpen size={11} /> : <DoorClosed size={11} />} {open ? "Aberta" : "Fechada"}
          </span>
        </p>
      </div>

      <div className="rise rise-1 grid grid-cols-3 gap-2">
        <NeonCard className="card-sheen border-[#00E5FF]/30 p-2.5 text-center">
          <div className="text-[10px] font-medium leading-tight text-neutral-300">Máquinas Ativas</div>
          <div className="font-display text-[20px] font-extrabold text-white">{occupied}<span className="text-neutral-500">/{stations.length}</span></div>
          <div className="mx-auto mt-1 h-1 w-10 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#00E5FF] shadow-[0_0_8px_#00E5FF] transition-all" style={{ width: `${stations.length ? (occupied / stations.length) * 100 : 0}%` }} /></div>
        </NeonCard>
        <NeonCard className="card-sheen border-purple-500/30 p-2.5 text-center">
          <div className="text-[10px] font-medium leading-tight text-neutral-300">Jogadores Agora</div>
          <div className="font-display text-[20px] font-extrabold text-white">{playersNow}</div>
          <div className="mt-1 flex items-center justify-center gap-1 text-[9px] font-bold text-[#00FF88]"><TrendingUp size={10} /> {sessions.length} sessões</div>
        </NeonCard>
        <button onClick={onOpenReports} className="text-left">
          <NeonCard className="card-sheen border-orange-500/30 p-2.5 text-center">
            <div className="text-[10px] font-medium leading-tight text-neutral-300">Receita (Hoje)</div>
            <div className="font-display text-[15px] font-extrabold leading-[26px] text-white">{formatAOAshort(revenue)}</div>
            <div className="text-[9px] font-bold text-orange-400">{goal > 0 ? `META ${goalPct}%` : "SEM META"}</div>
          </NeonCard>
        </button>
      </div>

      {next ? (
        <button onClick={() => onQuick("book")} className="rise rise-1 flex w-full items-center gap-3 rounded-2xl border border-[#FFC107]/30 bg-gradient-to-r from-[#FFC107]/10 to-transparent p-3 text-left transition active:scale-[0.99]">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#FFC107]/15 text-[#FFC107]"><CalendarClock size={19} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#FFC107]">Próxima reserva • {untilNext(next.ts)}</p>
            <p className="truncate text-[13px] font-semibold text-white">{next.b.stationName} - {next.b.pkg} - {next.b.players}</p>
          </div>
          <span className="rounded-full bg-[#FFC107]/15 px-2 py-1 text-[10px] font-bold text-[#FFC107]">{next.b.start}</span>
        </button>
      ) : (
        <button onClick={() => onQuick("book")} className="rise rise-1 flex w-full items-center gap-3 rounded-2xl border border-dashed border-white/15 p-3 text-left transition active:scale-[0.99]">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-neutral-500"><CalendarClock size={19} /></span>
          <p className="text-[12.5px] text-neutral-400">Sem reservas agendadas. Toque para criar uma.</p>
        </button>
      )}

      <NeonCard className="rise rise-2 p-3.5">
        <div className="mb-1 flex items-center justify-between">
          <span className="font-display text-[15px] font-bold uppercase tracking-wider">Visão Geral Diária</span>
          <span className="flex items-center gap-1 text-[10px] font-medium text-neutral-400"><Clock3 size={11} className="text-[#00E5FF]" /> Pico: {peakHour >= 0 ? `${pad(peakHour)}:00-${pad(peakHour + 1)}:00` : "—"}</span>
        </div>
        <div className="mb-1 flex items-center gap-2 text-[10px] font-bold text-neutral-500">
          <span>Receita por hora</span>
          <span className="ml-auto flex items-center gap-1 rounded-full bg-[#00FF88]/10 px-2 py-0.5 text-[#00FF88]"><Zap size={9} /> AO VIVO</span>
        </div>
        <DailyChart hours={hours} />
      </NeonCard>

      <NeonCard className="rise rise-2 flex items-center gap-4 border-[#00FF88]/20 p-3.5">
        {goal > 0 ? (
          <>
            <div className="relative">
              <GoalRing pct={goalPct} />
              <div className="absolute inset-0 grid place-items-center"><span className="font-display text-[18px] font-extrabold text-white">{goalPct}%</span></div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 font-display text-[15px] font-bold uppercase tracking-wider"><Target size={14} className="text-[#00FF88]" /> Meta Diária</p>
              <p className="mt-0.5 text-[12px] text-neutral-400">{formatAOAshort(revenue)} de {formatAOAshort(goal)}</p>
              <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[#00FF88]/10 px-2 py-0.5 text-[10.5px] font-bold text-[#00FF88]">
                <Sparkles size={10} /> {revenue >= goal ? "Meta atingida!" : `Faltam ${formatAOAshort(goal - revenue)}`}
              </p>
            </div>
          </>
        ) : (
          <>
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#00FF88]/10 text-[#00FF88]"><Target size={26} /></span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-[15px] font-bold uppercase tracking-wider">Meta Diária</p>
              <p className="text-[12px] text-neutral-400">Defina quanto quer faturar por dia.</p>
              <button onClick={() => onQuick("goal")} className="mt-1.5 rounded-full bg-[#00FF88] px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-black active:scale-95">Definir meta</button>
            </div>
          </>
        )}
      </NeonCard>

      <div className="rise rise-3">
        <SectionTitle
          right={
            <button onClick={() => onManage(null)} className="flex items-center gap-1 rounded-full border border-[#00E5FF]/40 bg-[#00E5FF]/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#00E5FF] active:scale-95">
              <Settings2 size={11} /> Tempos e Preços
            </button>
          }
        >
          Mapa das Máquinas
        </SectionTitle>
        <NeonCard className="p-3">
          {stations.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-[13px] text-neutral-400">Ainda não tem máquinas configuradas.</p>
              <button onClick={() => onManage(null)} className="mt-2 rounded-full bg-[#00FF88] px-4 py-1.5 text-[12px] font-extrabold uppercase tracking-wider text-black">Adicionar máquinas</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-5 gap-1.5">
                {stations.map((st) => {
                  const state = stateOf(st);
                  const m = stationMeta[state];
                  const isSel = selected === st.id;
                  const sess = sessionOf(st.id);
                  const prog = sess && sess.kind === "timed" ? Math.min(1, (now - sess.startedAt) / 1000 / sess.durationSec) : 0;
                  return (
                    <button
                      key={st.id}
                      onClick={() => setSelected(isSel ? null : st.id)}
                      className="relative flex h-[50px] flex-col items-center justify-center rounded-lg border transition active:scale-90"
                      style={{ background: m.bg, borderColor: isSel ? "#fff" : m.border, boxShadow: isSel ? `0 0 14px ${m.color}` : "none" }}
                    >
                      {state === "maintenance" ? <Wrench size={14} style={{ color: m.color }} /> : <Gamepad2 size={14} style={{ color: m.color }} />}
                      <span className="mt-0.5 text-[10px] font-extrabold" style={{ color: m.color }}>{String(st.id).padStart(2, "0")}</span>
                      {state === "occupied" && <span className="live-dot absolute right-1 top-1 h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />}
                      {sess && sess.kind === "timed" && (
                        <span className="absolute inset-x-1.5 bottom-1 h-[3px] overflow-hidden rounded-full bg-white/10">
                          <span className="block h-full rounded-full transition-all duration-1000 ease-linear" style={{ width: `${Math.max(4, prog * 100)}%`, background: tone(prog) }} />
                        </span>
                      )}
                      {sess && sess.kind === "fixed" && <Tag size={8} className="absolute bottom-0.5 text-purple-400" />}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-y-1 text-[10px] font-bold">
                {counts.map(({ k, n }) => (
                  <span key={k} className="flex items-center gap-1.5 text-neutral-300">
                    <span className="h-2 w-2 rounded-sm" style={{ background: stationMeta[k].color }} />
                    {stationMeta[k].label} <span style={{ color: stationMeta[k].color }}>{n}</span>
                  </span>
                ))}
              </div>

              {sel && selState && (
                <div className="fade mt-3 rounded-xl border border-white/10 bg-[#161616] p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-display text-[16px] font-extrabold uppercase">
                      {sel.name}
                      <span className="ml-2 text-[11px] font-bold" style={{ color: stationMeta[selState].color }}>• {stationMeta[selState].label}</span>
                    </p>
                    <button onClick={() => setSelected(null)} className="text-[11px] font-bold text-neutral-500">Fechar</button>
                  </div>
                  <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto pb-1">
                    {sel.plans.length === 0 && <span className="text-[11px] text-neutral-500">Sem opções definidas — toque em “Definir tempos e preços”.</span>}
                    {sel.plans.map((p) => (
                      <span key={p.id} className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10.5px] font-semibold text-neutral-300">
                        {p.name} • <span className="text-[#00FF88]">{formatAOAshort(p.price)}</span> {p.kind === "timed" ? `• ${p.minutes} min` : "• fixo"}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2.5 grid grid-cols-2 gap-2">
                    {selState === "occupied" && selSession && (
                      <>
                        {selSession.kind === "timed" && <button onClick={() => onExtend(selSession.id, 15)} className={`${btn} border-[#00E5FF]/50 bg-[#00E5FF]/10 text-[#00E5FF]`}>+15 min</button>}
                        <button onClick={() => { onEnd(selSession.id); setSelected(null); }} className={cn(btn, "border-[#FF4D6D]/50 bg-[#FF4D6D]/10 text-[#FF4D6D]", selSession.kind === "fixed" && "col-span-2")}>Encerrar sessão</button>
                      </>
                    )}
                    {(selState === "free" || selState === "reserved") && (
                      <button onClick={() => onStartOn(sel.id)} className="col-span-2 rounded-lg bg-[#00FF88] py-2 text-[11.5px] font-extrabold uppercase tracking-wider text-black active:scale-95">Iniciar sessão</button>
                    )}
                    {selState === "free" && <button onClick={() => { onSetStatus(sel.id, "reserved"); setSelected(null); }} className={`${btn} border-[#FFC107]/50 bg-[#FFC107]/10 text-[#FFC107]`}>Reservar</button>}
                    {selState === "reserved" && <button onClick={() => { onSetStatus(sel.id, "free"); setSelected(null); }} className={`${btn} border-[#00FF88]/50 bg-[#00FF88]/10 text-[#00FF88]`}>Libertar</button>}
                    {(selState === "free" || selState === "reserved") && <button onClick={() => { onSetStatus(sel.id, "maintenance"); setSelected(null); }} className={`${btn} border-[#FF4D6D]/50 bg-[#FF4D6D]/10 text-[#FF4D6D]`}>Manutenção</button>}
                    {selState === "maintenance" && <button onClick={() => { onSetStatus(sel.id, "free"); setSelected(null); }} className={`${btn} col-span-2 border-[#00FF88]/50 bg-[#00FF88]/10 text-[#00FF88]`}>Libertar máquina</button>}
                    <button onClick={() => onManage(sel.id)} className={`${btn} col-span-2 flex items-center justify-center gap-1.5 border-white/15 bg-white/[0.04] text-neutral-200`}>
                      <Settings2 size={13} /> Definir tempos e preços
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </NeonCard>
      </div>

      <div className="rise rise-3">
        <SectionTitle>Ações Rápidas</SectionTitle>
        <div className="grid grid-cols-5 gap-1.5">
          {quick.map((q) => (
            <button key={q.id} data-guide-id={q.id} onClick={() => onQuick(q.id)} className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border bg-[#1e1e1e] px-1 py-3 transition active:scale-95 ${q.border}`}>
              <span className={`grid h-8 w-8 place-items-center rounded-lg ${q.bg} ${q.text}`}><q.icon size={18} /></span>
              <span className="text-center text-[9.5px] font-semibold leading-tight text-neutral-200">{q.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rise rise-4">
        <SectionTitle right={<span className="flex items-center gap-1.5 rounded-full bg-[#00FF88]/10 px-2 py-1 text-[10px] font-bold text-[#00FF88]"><span className="live-dot h-1.5 w-1.5 rounded-full bg-[#00FF88]" /> {sessions.length} AO VIVO</span>}>
          Sessões Ativas
        </SectionTitle>
        <div className="space-y-2">
          {sessions.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-[12.5px] text-neutral-500">Nenhuma sessão ativa. Toque em “Iniciar Sessão”.</div>
          )}
          {sessions.map((s) => {
            const timed = s.kind === "timed";
            const prog = timed ? Math.min(1, Math.max(0, (now - s.startedAt) / 1000 / s.durationSec)) : 0;
            const left = s.durationSec - (now - s.startedAt) / 1000;
            const over = timed && left <= 0;
            const color = timed ? tone(prog) : "#A855F7";
            const elapsedMin = Math.floor((now - s.startedAt) / 60000);
            return (
              <NeonCard key={s.id} className={cn("p-3", over && "border-[#FF4D6D]/60")}>
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white" style={{ background: `linear-gradient(135deg, ${color}, #0b3b44)` }}>
                    {timed ? <MonitorSmartphone size={18} /> : <Tag size={18} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-[13px] font-semibold text-white">{nameOf(s.stationId)} - {s.plan} - {s.player}</p>
                      {timed ? (
                        <span className={cn("shrink-0 font-display text-[15px] font-extrabold tabular-nums", over && "animate-pulse")} style={{ color }}>{over ? `+${formatClock(-left)}` : formatClock(left)}</span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-extrabold uppercase text-purple-300">Preço fixo</span>
                      )}
                    </div>
                    {timed ? <div className="mt-1.5"><ProgressBar value={prog * 100} color={color} live={!over} /></div> : <p className="mt-1 text-[10.5px] text-neutral-500">Sem cronómetro • pago no início</p>}
                  </div>
                </div>
                <div className="mt-2.5 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-[10.5px] text-neutral-500">
                    {timed ? <><Timer size={11} /> {elapsedMin} de {Math.round(s.durationSec / 60)} min • {over ? <b className="text-[#FF4D6D]">Tempo esgotado</b> : "a decorrer"}</> : `Iniciou há ${elapsedMin} min`}
                    <span className="ml-1 font-bold text-[#00FF88]">{formatAOAshort(s.price)}</span>
                  </span>
                  <div className="flex gap-1.5">
                    {timed && (
                      <button onClick={() => onExtend(s.id, 15)} className="flex items-center gap-1 rounded-lg border border-[#00E5FF]/40 bg-[#00E5FF]/10 px-2.5 py-1 text-[10.5px] font-extrabold text-[#00E5FF] transition active:scale-95"><Plus size={11} strokeWidth={3} /> 15 min</button>
                    )}
                    <button onClick={() => onEnd(s.id)} className="flex items-center gap-1 rounded-lg border border-[#FF4D6D]/40 bg-[#FF4D6D]/10 px-2.5 py-1 text-[10.5px] font-extrabold text-[#FF4D6D] transition active:scale-95"><Square size={10} fill="currentColor" /> Encerrar</button>
                  </div>
                </div>
              </NeonCard>
            );
          })}
        </div>
      </div>

      <NeonCard className="rise rise-4 p-3.5">
        <SectionTitle right={<span className="text-[10px] font-bold text-neutral-500">HOJE</span>}>
          <span className="flex items-center gap-2"><Trophy size={15} className="text-[#FFC107]" /> Opções Mais Vendidas</span>
        </SectionTitle>
        {top.length === 0 ? (
          <p className="py-2 text-center text-[12px] text-neutral-500">Ainda sem vendas hoje. O ranking aparece com as primeiras sessões.</p>
        ) : (
          <div className="space-y-2.5">
            {top.map(([name, v], i) => (
              <div key={name}>
                <div className="mb-1 flex items-center justify-between text-[12px]">
                  <span className="flex items-center gap-2 font-semibold text-neutral-100">
                    <span className="grid h-5 w-5 place-items-center rounded-md bg-white/[0.06] text-[10px] font-extrabold text-neutral-400">{i + 1}</span>
                    {name}
                  </span>
                  <span className="font-bold text-neutral-400">{v.n}x • {formatAOAshort(v.money)}</span>
                </div>
                <ProgressBar value={(v.n / topMax) * 100} color={barColors[i % barColors.length]} />
              </div>
            ))}
          </div>
        )}
      </NeonCard>

      <NeonCard className={cn("rise rise-5 border-l-2 p-3.5", low.length ? "border-l-orange-500" : "border-l-[#00FF88]")}>
        <SectionTitle>Alertas de Inventário</SectionTitle>
        {low.length > 0 ? (
          <div className="flex items-start gap-2.5 rounded-xl bg-orange-500/[0.07] p-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-orange-500/15 text-orange-400"><TriangleAlert size={16} /></span>
            <p className="text-[12.5px] leading-snug text-neutral-300">
              <span className="font-bold text-orange-400">Stock Baixo:</span> {low.map((i) => `${i.name} (${i.stock})`).join(", ")}
              <span className="mt-1 block text-[11px] text-neutral-500">Reponha antes que acabe.</span>
            </p>
          </div>
        ) : (
          <p className="rounded-xl bg-[#00FF88]/[0.06] p-3 text-[12.5px] text-neutral-400">
            {inventory.length === 0 ? "Inventário vazio. Adicione os seus itens (headsets, comandos, snacks…)." : "Tudo em ordem — nenhum item com stock baixo."}
          </p>
        )}
        <button onClick={() => onQuick("inventory")} className="mt-2.5 w-full rounded-xl border border-orange-500/40 bg-orange-500/10 py-2 text-[12px] font-bold uppercase tracking-wider text-orange-300 transition active:scale-[0.98]">
          {inventory.length === 0 ? "Adicionar itens" : "Abrir Sala de Stock"}
        </button>
      </NeonCard>
    </div>
  );
}
