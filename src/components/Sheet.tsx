import { X } from "lucide-react";

export default function Sheet({
  title, subtitle, accent = "#00E5FF", onClose, children, z = 40,
}: {
  title: string;
  subtitle?: string;
  accent?: string;
  onClose: () => void;
  children: React.ReactNode;
  z?: number;
}) {
  return (
    <div
      className="fade absolute inset-0 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      style={{ zIndex: z }}
      onClick={onClose}
    >
      <div
        className="modal-sheet thin-scroll max-h-[90%] w-full overflow-y-auto rounded-t-[24px] border-t bg-[#161616] p-5 pb-8"
        style={{ borderTopColor: `${accent}66` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-white/20" />
        <div className="mb-1 flex items-center justify-between gap-3">
          <h3 className="font-display text-[21px] font-extrabold uppercase leading-tight">{title}</h3>
          <button onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10" aria-label="Fechar">
            <X size={15} />
          </button>
        </div>
        {subtitle && <p className="mb-4 text-[12px] text-neutral-400">{subtitle}</p>}
        {!subtitle && <div className="mb-3" />}
        {children}
      </div>
    </div>
  );
}
