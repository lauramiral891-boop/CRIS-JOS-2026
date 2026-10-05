import { useState } from "react";
import { Play, Timer, Tag, X, Settings2, Plus } from "lucide-react";
import PlanForm from "./PlanForm";
import type { Plan, Player, Session, Station } from "../lib/types";
import { formatAOA } from "../lib/format";
import { cn } from "../utils/cn";

export default function StartSessionModal({
  stations, sessions, players, initialStationId, onStart, onClose, onManage,
}: {
  players: Player[];
  stations: Station[];
  sessions: Session[];
  initialStationId: number | null;
  onStart: (stationId: number, plan: Plan, player: string) => void;
  onClose: () => void;
  onManage: (stationId: number) => void;
}) {
  const available = stations.filter(
    (s) => s.status !== "maintenance" && !sessions.some((x) => x.stationId === s.id)
  );
  const first = initialStationId ?? available[0]?.id ?? null;
  const [stationId, setStationId] = useState<number | null>(first);
  const [planId, setPlanId] = useState<string>(
    () => stations.find((s) => s.id === first)?.plans[0]?.id ?? "custom"
  );
  const [player, setPlayer] = useState("");
  const [err, setErr] = useState("");

  const station = stations.find((s) => s.id === stationId);
  const plan = station?.plans.find((p) => p.id === planId);

  const pick = (id: number) => {
    setStationId(id);
    setPlanId(stations.find((s) => s.id === id)?.plans[0]?.id ?? "custom");
  };

  const go = (p: Plan) => {
    if (!station) return setErr("Escolha uma máquina livre.");
    if (!player.trim()) return setErr("Indique o nome do jogador.");
    onStart(station.id, p, player.trim());
  };

  return (
    <div className="fade absolute inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="modal-sheet thin-scroll max-h-[90%] w-full overflow-y-auto rounded-t-[24px] border-t border-[#00FF88]/40 bg-[#161616] p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-white/20" />
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-[21px] font-extrabold uppercase"><Play size={18} className="text-[#00FF88]" /> Iniciar Sessão</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-white/10"><X size={15} /></button>
        </div>
        <p className="mb-4 text-[12px] text-neutral-400">Escolha a máquina e a opção. O cronómetro arranca logo.</p>

        {available.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/15 p-6 text-center text-[13px] text-neutral-500">Não há máquinas livres neste momento.</p>
        ) : (
          <div className="space-y-3.5">
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-neutral-400">Jogador</span>
              <input list="players-list" value={player} onChange={(e) => setPlayer(e.target.value)} placeholder="Nome ou escolha um jogador registado" className="w-full rounded-xl border border-white/10 bg-[#252525] px-3 py-2.5 text-[13px] outline-none focus:border-[#00FF88]" />
              <datalist id="players-list">
                {players.map((p) => <option key={p.id} value={p.name} />)}
              </datalist>
            </label>

            <div>
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-neutral-400">Máquina</span>
              <div className="flex flex-wrap gap-1.5">
                {available.map((s) => (
                  <button key={s.id} onClick={() => pick(s.id)} className={cn(
                    "rounded-lg border px-2.5 py-1.5 text-[12px] font-extrabold transition active:scale-95",
                    stationId === s.id ? "border-[#00FF88] bg-[#00FF88]/10 text-[#00FF88]" : "border-white/10 bg-[#252525] text-neutral-400"
                  )}>
                    {String(s.id).padStart(2, "0")}
                    {s.status === "reserved" && <span className="ml-1 text-[#FFC107]">•</span>}
                  </button>
                ))}
              </div>
            </div>

            {station && (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Opções da {station.name}</span>
                  <button onClick={() => onManage(station.id)} className="flex items-center gap-1 text-[11px] font-bold text-[#00E5FF]"><Settings2 size={12} /> Editar</button>
                </div>
                <div className="space-y-1.5">
                  {station.plans.map((p) => (
                    <button key={p.id} onClick={() => setPlanId(p.id)} className={cn(
                      "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition active:scale-[0.99]",
                      planId === p.id ? "border-[#00E5FF] bg-[#00E5FF]/10" : "border-white/10 bg-[#1e1e1e]"
                    )}>
                      <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", p.kind === "timed" ? "bg-[#00E5FF]/15 text-[#00E5FF]" : "bg-purple-500/15 text-purple-400")}>
                        {p.kind === "timed" ? <Timer size={16} /> : <Tag size={16} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13.5px] font-bold">{p.name}</span>
                        <span className="block text-[11px] text-neutral-400">{p.kind === "timed" ? `${p.minutes} minutos • cronómetro` : "Preço fixo • sem cronómetro"}</span>
                      </span>
                      <span className="text-[13px] font-extrabold text-[#00FF88]">{formatAOA(p.price).replace(",00", "")}</span>
                    </button>
                  ))}
                  <button onClick={() => setPlanId("custom")} className={cn(
                    "flex w-full items-center gap-3 rounded-xl border border-dashed p-3 text-left transition",
                    planId === "custom" ? "border-[#00FF88] bg-[#00FF88]/10 text-[#00FF88]" : "border-white/20 text-neutral-400"
                  )}>
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/[0.06]"><Plus size={16} /></span>
                    <span className="text-[13px] font-bold">Personalizado (qualquer minutos / preço)</span>
                  </button>
                </div>
              </div>
            )}

            {err && <p className="rounded-xl border border-[#FF4D6D]/40 bg-[#FF4D6D]/10 px-3 py-2 text-[12px] font-semibold text-[#FF8FA3]">{err}</p>}

            {planId === "custom" ? (
              <div className="rounded-2xl border border-white/10 bg-[#1b1b1b] p-3">
                <PlanForm
                  machineName={station?.name}
                  submitLabel="Iniciar agora"
                  onSubmit={(d) => go({ id: "custom", name: d.name, kind: d.kind, price: d.price, minutes: d.minutes })}
                />
              </div>
            ) : (
              <button
                onClick={() => plan && go(plan)}
                className="neon-btn-green w-full rounded-xl bg-[#00FF88] py-3 text-[13px] font-extrabold uppercase tracking-widest text-black transition active:scale-[0.98]"
              >
                {plan?.kind === "fixed" ? "Registar preço fixo" : "Iniciar cronómetro"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
