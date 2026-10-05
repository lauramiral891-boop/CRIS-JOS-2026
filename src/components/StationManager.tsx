import { useState } from "react";
import {
  ArrowLeft, Timer, Tag, Trash2, Copy, Monitor, ChevronRight, Plus, Wrench, Check,
} from "lucide-react";
import PlanForm from "./PlanForm";
import type { PlanDraft } from "./PlanForm";
import { fieldCls } from "./ui";
import type { Session, Station, StationStatus } from "../lib/types";
import { formatAOA } from "../lib/format";
import { cn } from "../utils/cn";

const statusLabel: Record<string, { t: string; c: string }> = {
  occupied: { t: "Ocupada", c: "text-[#00E5FF] bg-[#00E5FF]/10" },
  free: { t: "Livre", c: "text-[#00FF88] bg-[#00FF88]/10" },
  reserved: { t: "Reservada", c: "text-[#FFC107] bg-[#FFC107]/10" },
  maintenance: { t: "Manutenção", c: "text-[#FF4D6D] bg-[#FF4D6D]/10" },
};

interface Props {
  stations: Station[];
  sessions: Session[];
  initialStationId: number | null;
  onClose: () => void;
  onAddPlan: (stationId: number, p: PlanDraft) => void;
  onRemovePlan: (stationId: number, planId: string) => void;
  onCopyAll: (stationId: number) => void;
  onAddStations: (n: number) => void;
  onRename: (id: number, name: string) => void;
  onRemoveStation: (id: number) => void;
  onSetStatus: (id: number, st: StationStatus) => void;
}

export default function StationManager({
  stations, sessions, initialStationId, onClose, onAddPlan, onRemovePlan, onCopyAll,
  onAddStations, onRename, onRemoveStation, onSetStatus,
}: Props) {
  const [sel, setSel] = useState<number | null>(initialStationId);
  const [addN, setAddN] = useState("1");
  const [name, setName] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const station = stations.find((s) => s.id === sel);
  const busy = station ? sessions.some((x) => x.stationId === station.id) : false;

  const stateOf = (s: Station): StationStatus | "occupied" =>
    sessions.some((x) => x.stationId === s.id) ? "occupied" : s.status;

  const open = (id: number) => {
    setSel(id);
    setName(stations.find((s) => s.id === id)?.name ?? "");
    setConfirmDel(false);
  };

  return (
    <div className="fade absolute inset-0 z-50 flex flex-col bg-[#121212]">
      <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3.5">
        <button
          onClick={() => (station ? setSel(null) : onClose())}
          className="grid h-9 w-9 place-items-center rounded-full bg-white/10 active:scale-95"
          aria-label="Voltar"
        >
          <ArrowLeft size={17} />
        </button>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-[21px] font-extrabold uppercase leading-none">
            {station ? station.name : "Gestão de Máquinas"}
          </h3>
          <p className="text-[11px] text-neutral-500">
            {station ? "Nome, estado, tempos e preços desta máquina" : `${stations.length} máquina${stations.length === 1 ? "" : "s"} • toque para configurar`}
          </p>
        </div>
        {station && (
          <button onClick={onClose} className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold text-neutral-300">Fechar</button>
        )}
      </div>

      <div className="thin-scroll flex-1 overflow-y-auto px-4 py-4">
        {!station ? (
          <>
            <div className="mb-3 rounded-2xl border border-[#00FF88]/25 bg-[#00FF88]/[0.05] p-3">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#00FF88]">Adicionar máquinas</p>
              <div className="flex gap-2">
                <input value={addN} onChange={(e) => setAddN(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className={`${fieldCls} w-20 text-center font-display text-[18px] font-extrabold`} />
                <button
                  onClick={() => { const n = parseInt(addN, 10); if (n > 0 && n <= 100) { onAddStations(n); setAddN("1"); } }}
                  className="neon-btn-green flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#00FF88] text-[12px] font-extrabold uppercase tracking-wider text-black active:scale-[0.98]"
                >
                  <Plus size={15} strokeWidth={3} /> Adicionar
                </button>
              </div>
            </div>

            {stations.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-[13px] text-neutral-500">
                Ainda não tem máquinas. Adicione acima.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {stations.map((s) => {
                  const m = statusLabel[stateOf(s)];
                  return (
                    <button key={s.id} onClick={() => open(s.id)} className="rounded-2xl border border-white/[0.07] bg-[#1e1e1e] p-3 text-left transition active:scale-[0.98]">
                      <div className="flex items-center justify-between">
                        <span className="flex min-w-0 items-center gap-1.5 text-[13.5px] font-bold"><Monitor size={14} className="shrink-0 text-neutral-500" /> <span className="truncate">{s.name}</span></span>
                        <ChevronRight size={14} className="shrink-0 text-neutral-600" />
                      </div>
                      <span className={cn("mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-extrabold", m.c)}>{m.t}</span>
                      <p className="mt-1.5 text-[11px] text-neutral-500">{s.plans.length} opç{s.plans.length === 1 ? "ão" : "ões"}</p>
                      <p className="truncate text-[11px] text-neutral-400">{s.plans.slice(0, 2).map((p) => p.name).join(" • ") || "Sem opções definidas"}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/[0.08] bg-[#171717] p-3.5">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-400">Nome da máquina</p>
              <div className="flex gap-2">
                <input value={name} onChange={(e) => setName(e.target.value)} className={fieldCls} />
                <button
                  onClick={() => name.trim() && onRename(station.id, name.trim())}
                  className="grid w-12 shrink-0 place-items-center rounded-xl bg-[#00E5FF] text-black active:scale-95"
                  aria-label="Guardar nome"
                >
                  <Check size={18} strokeWidth={3} />
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  disabled={busy}
                  onClick={() => onSetStatus(station.id, "free")}
                  className={cn("rounded-xl border py-2 text-[11.5px] font-extrabold uppercase tracking-wider disabled:opacity-40", station.status !== "maintenance" ? "border-[#00FF88] bg-[#00FF88]/10 text-[#00FF88]" : "border-white/10 text-neutral-500")}
                >
                  Disponível
                </button>
                <button
                  disabled={busy}
                  onClick={() => onSetStatus(station.id, "maintenance")}
                  className={cn("flex items-center justify-center gap-1.5 rounded-xl border py-2 text-[11.5px] font-extrabold uppercase tracking-wider disabled:opacity-40", station.status === "maintenance" ? "border-[#FF4D6D] bg-[#FF4D6D]/10 text-[#FF4D6D]" : "border-white/10 text-neutral-500")}
                >
                  <Wrench size={13} /> Manutenção
                </button>
              </div>
              {busy && <p className="mt-2 text-[11px] text-[#FFC107]">Há uma sessão a decorrer nesta máquina.</p>}
            </div>

            <div>
              <h4 className="mb-2 font-display text-[15px] font-bold uppercase tracking-wider">Opções atuais</h4>
              <div className="space-y-2">
                {station.plans.length === 0 && (
                  <p className="rounded-xl border border-dashed border-white/15 p-4 text-center text-[12.5px] text-neutral-500">Sem opções. Adicione uma abaixo.</p>
                )}
                {station.plans.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-[#1e1e1e] p-3">
                    <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", p.kind === "timed" ? "bg-[#00E5FF]/15 text-[#00E5FF]" : "bg-purple-500/15 text-purple-400")}>
                      {p.kind === "timed" ? <Timer size={18} /> : <Tag size={18} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-bold">{station.name} <span className="text-neutral-500">({p.name})</span></p>
                      <p className="text-[11.5px] text-neutral-400">
                        <span className="font-bold text-[#00FF88]">{formatAOA(p.price)}</span>{" "}
                        {p.kind === "timed" ? `= ${p.minutes} minutos` : "• sem cronómetro"}
                      </p>
                    </div>
                    <button onClick={() => onRemovePlan(station.id, p.id)} className="grid h-8 w-8 place-items-center rounded-lg bg-[#FF4D6D]/10 text-[#FF4D6D] active:scale-90" aria-label="Remover">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#171717] p-3.5">
              <h4 className="mb-2.5 font-display text-[15px] font-bold uppercase tracking-wider">Nova opção</h4>
              <PlanForm machineName={station.name} submitLabel="Adicionar opção" onSubmit={(d) => onAddPlan(station.id, d)} />
            </div>

            <button onClick={() => onCopyAll(station.id)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#00E5FF]/40 bg-[#00E5FF]/10 py-3 text-[12px] font-extrabold uppercase tracking-wider text-[#00E5FF] transition active:scale-[0.98]">
              <Copy size={14} /> Copiar estas opções para todas as máquinas
            </button>

            {!confirmDel ? (
              <button disabled={busy} onClick={() => setConfirmDel(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#FF4D6D]/40 py-3 text-[12px] font-extrabold uppercase tracking-wider text-[#FF4D6D] disabled:opacity-40">
                <Trash2 size={14} /> Remover esta máquina
              </button>
            ) : (
              <div className="rounded-xl border border-[#FF4D6D]/40 bg-[#FF4D6D]/10 p-3 text-center">
                <p className="text-[12.5px] font-semibold text-[#FF8FA3]">Remover {station.name} definitivamente?</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button onClick={() => setConfirmDel(false)} className="rounded-lg border border-white/15 py-2 text-[12px] font-bold">Cancelar</button>
                  <button onClick={() => { onRemoveStation(station.id); setSel(null); }} className="rounded-lg bg-[#FF4D6D] py-2 text-[12px] font-extrabold text-white">Remover</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
