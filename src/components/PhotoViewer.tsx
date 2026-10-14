import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

type Props = { photos: string[]; start: number; onClose: () => void };

export default function PhotoViewer({ photos, start, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(start);

  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollLeft = el.clientWidth * start;
  }, [start]);

  const onScroll = () => {
    const el = ref.current;
    if (el && el.clientWidth) setIdx(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div className="fade absolute inset-0 z-[70] flex flex-col bg-black">
      <div style={{ height: "env(safe-area-inset-top, 0px)" }} />
      <div className="flex items-center justify-between px-3 py-2">
        <button onClick={onClose} aria-label="Fechar"
          className="grid h-9 w-9 place-items-center rounded-full bg-white/15">
          <X size={18} />
        </button>
        <span className="text-[12px] text-neutral-300">{idx + 1} / {photos.length}</span>
      </div>
      <div ref={ref} onScroll={onScroll} className="flex flex-1 snap-x snap-mandatory overflow-x-auto">
        {photos.map((p, i) => (
          <div key={i} className="flex w-full shrink-0 snap-center items-center justify-center">
            <img src={p} alt="" className="max-h-full max-w-full object-contain" />
          </div>
        ))}
      </div>
    </div>
  );
}
