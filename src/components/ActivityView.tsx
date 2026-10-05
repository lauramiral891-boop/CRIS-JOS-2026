import { useState } from "react";
import { Lock } from "lucide-react";
import Sheet from "./Sheet";
import type { ActivityEvent, SessionRecord, Staff } from "../lib/types";
import { formatAOAshort, pad } from "../lib/format";
import { cn } from "../utils/cn";

const fmt = (ts: number) => {
  const d = new Date(ts);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

type Tab = "all" | "delete" | "sessions";

export default function ActivityView({
  activity, history, staff, onClose,
}: { activity: ActivityEvent[]; history: SessionRecord[]; staff: Staff[]; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("all");
  const [actor, setActor] = useState<string>("all");
  const [open, setOpen] = useState<number | null>(null);

  const list = activity
    .filter((a) => (tab === "delete" ? a.severity === "delete" : true))
    .filter((a) => (actor === "all" ? true : a.actorId === actor))
    .slice(0, 300);

  const chip = (on: boolean) =>
    cn("shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold", on ? "bg-[#00E5FF] text-black" : "bg-white/10 text-neutral-300");

  return (
    <Sheet title="Registo de atividade" onClose={onClose} z={50}>
      <p className="-mt-2 mb-3 flex items-center gap-1.5 text-[11px] text-neutral-500">
        <Lock size={11} /> Registo permanente: não pode ser apagado dentro da app.
      </p>
      <div className="mb-3 flex gap-2">
        <button className={chip(tab === "all")} onClick={() => setTab("all")}>Tudo</button>
        <button className={chip(tab === "delete")} onClick={() => setTab("delete")}>Apagados</button>
        <button className={chip(tab === "sessions")} onClick={() => setTab("sessions")}>Sessões</button>
      </div>

      {tab !== "sessions" && staff.length > 0 && (
        <div className="thin-scroll mb-3 flex gap-2 overflow-x-auto pb-1">
          <button className={chip(actor === "all")} onClick={() => setActor("all")}>Todos</button>
          <button className={chip(actor === "owner")} onClick={() => setActor("owner")}>Proprietário</button>
          {staff.map((s) => <button key={s.id} className={chip(actor === s.id)} onClick={() => setActor(s.id)}>{s.name.split(" ")[0]}</button>)}
        </div>
      )}

      {tab !== "sessions" && (
        <div className="space-y-2">
          {list.length === 0 && <p className="rounded-xl border border-dashed border-white/15 p-5 text-center text-[12.5px] text-neutral-500">Sem registos.</p>}
          {list.map((a) => (
            <div key={a.id} className={cn("rounded-xl border p-3", a.severity === "delete" ? "border-[#FF4D6D]/35 bg-[#FF4D6D]/[0.07]" : a.severity === "warn" ? "border-[#FFC107]/25 bg-[#1e1e1e]" : "border-white/[0.06] bg-[#1e1e1e]")}>
              <div className="flex items-center gap-2 text-[10.5px]">
                <span className={cn("rounded-full px-2 py-0.5 font-bold", a.role === "owner" ? "bg-[#00E5FF]/15 text-[#00E5FF]" : "bg-[#FFC107]/15 text-[#FFC107]")}>
                  {a.role === "owner" ? "Proprietário" : a.actorName}
                </span>
                <span className="text-neutral-500">{fmt(a.ts)}</span>
              </div>
              <p className="mt-1 text-[13px] font-semibold">{a.label}</p>
              {a.detail && <p className="text-[12px] text-neutral-400">{a.detail}</p>}
              {a.snapshot && (
                <>
                  <button onClick={() => setOpen(open === a.id ? null : a.id)} className="mt-1.5 text-[11.5px] font-bold text-[#FF8FA3]">
                    {open === a.id ? "Esconder dados apagados" : "Ver dados apagados"}
                  </button>
                  {open === a.id && <pre className="thin-scroll mt-1.5 max-h-40 overflow-auto rounded-lg bg-black/40 p-2 text-[10.5px] text-neutral-300">{(() => { try { return JSON.stringify(JSON.parse(a.snapshot), null, 2); } catch { return a.snapshot; } })()}</pre>}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "sessions" && (
        <div className="space-y-2">
          {history.length === 0 && <p className="rounded-xl border border-dashed border-white/15 p-5 text-center text-[12.5px] text-neutral-500">Ainda não há sessões encerradas.</p>}
          {history.slice(0, 300).map((h) => (
            <div key={h.id} className="rounded-xl border border-white/[0.06] bg-[#1e1e1e] p-3">
              <div className="flex items-center justify-between text-[13px] font-semibold">
                <span>{h.stationName} • {h.player}</span>
                <span className="text-[#00FF88]">{formatAOAshort(h.price)}</span>
              </div>
              <p className="text-[11.5px] text-neutral-500">{h.plan} • {fmt(h.startedAt)} → {fmt(h.endedAt)} • encerrada por {h.endedBy}</p>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}
