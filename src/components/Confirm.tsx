import { AlertTriangle } from "lucide-react";

export default function Confirm({
  message, confirmLabel = "Apagar", onCancel, onConfirm,
}: { message: string; confirmLabel?: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fade absolute inset-0 z-[70] flex items-center justify-center bg-black/70 p-8 backdrop-blur-sm" onClick={onCancel}>
      <div className="modal-sheet w-full rounded-3xl border border-[#FF4D6D]/30 bg-[#1a1a1a] p-6 text-center" onClick={(e) => e.stopPropagation()}>
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#FF4D6D]/10 text-[#FF4D6D]"><AlertTriangle size={24} /></span>
        <h3 className="mt-3 font-display text-[20px] font-extrabold uppercase">Tem a certeza?</h3>
        <p className="mt-1 text-[12.5px] text-neutral-400">{message}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={onCancel} className="rounded-xl border border-white/15 py-2.5 text-[13px] font-bold text-neutral-300">Cancelar</button>
          <button onClick={onConfirm} className="rounded-xl bg-[#FF4D6D] py-2.5 text-[13px] font-extrabold text-white shadow-[0_0_18px_rgba(255,77,109,0.45)]">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
