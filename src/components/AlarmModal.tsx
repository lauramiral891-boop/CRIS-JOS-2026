import { BellRing, Plus, VolumeX, Square } from "lucide-react";
import { formatClock } from "../lib/format";

export default function AlarmModal({
  label,
  player,
  plan,
  overtimeSec,
  onSilence,
  onExtend,
  onEnd,
}: {
  label: string;
  player: string;
  plan: string;
  overtimeSec: number;
  onSilence: () => void;
  onExtend: (min: number) => void;
  onEnd: () => void;
}) {
  return (
    <div className="fade absolute inset-0 z-[70] grid place-items-center bg-black/85 p-5 backdrop-blur-sm">
      <div className="alarm-ring w-full rounded-3xl border border-[#FF4D6D]/60 bg-[#170d10] p-6 text-center">
        <span className="bell-shake mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#FF4D6D]/15 text-[#FF4D6D]">
          <BellRing size={32} />
        </span>
        <p className="mt-3 text-[11px] font-extrabold uppercase tracking-[0.3em] text-[#FF4D6D]">Alarme</p>
        <h3 className="font-display text-[30px] font-extrabold uppercase leading-none">Tempo esgotado!</h3>
        <p className="mt-2 text-[14px] font-semibold text-white">{label}</p>
        <p className="text-[12.5px] text-neutral-400">{plan} • {player}</p>
        <p className="mt-2 inline-block rounded-full bg-[#FF4D6D]/15 px-3 py-1 font-display text-[18px] font-extrabold text-[#FF8FA3]">
          +{formatClock(overtimeSec)} em excesso
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={() => onExtend(15)} className="flex items-center justify-center gap-1 rounded-xl border border-[#00E5FF]/50 bg-[#00E5FF]/10 py-2.5 text-[12px] font-extrabold uppercase tracking-wider text-[#00E5FF] active:scale-95">
            <Plus size={13} strokeWidth={3} /> 15 min
          </button>
          <button onClick={() => onExtend(30)} className="flex items-center justify-center gap-1 rounded-xl border border-[#00E5FF]/50 bg-[#00E5FF]/10 py-2.5 text-[12px] font-extrabold uppercase tracking-wider text-[#00E5FF] active:scale-95">
            <Plus size={13} strokeWidth={3} /> 30 min
          </button>
          <button onClick={onSilence} className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.05] py-2.5 text-[12px] font-extrabold uppercase tracking-wider text-neutral-200 active:scale-95">
            <VolumeX size={14} /> Silenciar
          </button>
          <button onClick={onEnd} className="flex items-center justify-center gap-1.5 rounded-xl bg-[#FF4D6D] py-2.5 text-[12px] font-extrabold uppercase tracking-wider text-white shadow-[0_0_18px_rgba(255,77,109,0.45)] active:scale-95">
            <Square size={11} fill="currentColor" /> Encerrar
          </button>
        </div>
      </div>
    </div>
  );
}
