import { useEffect, useRef, useState } from "react";

interface Props {
  src: string;
  aspect: number;
  maxSide?: number;
  quality?: number;
  onDone: (dataUrl: string) => void;
  onCancel: () => void;
}

/** Ajusta a foto à moldura: arrastar para mover, barra para o zoom, e "Foto inteira" para não cortar nada. */
export default function PhotoAdjust({ src, aspect, maxSide = 640, quality = 0.72, onDone, onCancel }: Props) {
  const FW = Math.min(360, window.innerWidth - 40);
  const FH = FW / aspect;
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [z, setZ] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null);

  useEffect(() => {
    const im = new Image();
    im.onload = () => {
      imgRef.current = im;
      setNat({ w: im.naturalWidth, h: im.naturalHeight });
    };
    im.src = src;
  }, [src]);

  if (!nat) return null;

  const contain = Math.min(FW / nat.w, FH / nat.h);
  const cover = Math.max(FW / nat.w, FH / nat.h);
  const maxZ = (cover / contain) * 2.5;
  const scale = contain * z;
  const w = nat.w * scale;
  const h = nat.h * scale;

  const clamp = (p: { x: number; y: number }, zz: number) => {
    const mx = Math.max(0, (nat.w * contain * zz - FW) / 2);
    const my = Math.max(0, (nat.h * contain * zz - FH) / 2);
    return { x: Math.min(mx, Math.max(-mx, p.x)), y: Math.min(my, Math.max(-my, p.y)) };
  };

  const down = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { sx: e.clientX, sy: e.clientY, px: pos.x, py: pos.y };
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    setPos(clamp({ x: d.px + e.clientX - d.sx, y: d.py + e.clientY - d.sy }, z));
  };
  const up = () => {
    drag.current = null;
  };
  const setZoom = (v: number) => {
    setZ(v);
    setPos((p) => clamp(p, v));
  };
  const fit = () => {
    setZ(1);
    setPos({ x: 0, y: 0 });
  };
  const fill = () => {
    setZ(cover / contain);
    setPos({ x: 0, y: 0 });
  };

  const save = () => {
    const im = imgRef.current;
    if (!im) return;
    const OW = maxSide;
    const OH = Math.round(maxSide / aspect);
    const k = OW / FW;
    const c = document.createElement("canvas");
    c.width = OW;
    c.height = OH;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, OW, OH);
    ctx.drawImage(im, (FW / 2 - w / 2 + pos.x) * k, (FH / 2 - h / 2 + pos.y) * k, w * k, h * k);
    onDone(c.toDataURL("image/jpeg", quality));
  };

  const pill = "rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-[13px] font-bold text-white active:scale-95";

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 p-4">
      <div className="w-full max-w-[400px] rounded-2xl border border-white/10 bg-[#161616] p-4 text-white">
        <p className="mb-1 text-[15px] font-extrabold">Ajustar foto</p>
        <p className="mb-3 text-[12px] text-neutral-400">Arrasta para mover. Usa a barra para aproximar.</p>

        <div
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          className="relative mx-auto overflow-hidden rounded-xl"
          style={{ width: FW, height: FH, background: "#0a0a0a", touchAction: "none" }}
        >
          <img
            src={src}
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              width: w,
              height: h,
              left: FW / 2 - w / 2 + pos.x,
              top: FH / 2 - h / 2 + pos.y,
              maxWidth: "none",
              userSelect: "none",
              pointerEvents: "none",
            }}
          />
        </div>

        <input
          type="range"
          min={1}
          max={maxZ}
          step={0.01}
          value={z}
          onChange={(e) => setZoom(parseFloat(e.target.value))}
          className="mt-4 w-full"
          aria-label="Zoom"
        />

        <div className="mt-3 flex gap-2">
          <button type="button" onClick={fit} className={pill}>
            Foto inteira
          </button>
          <button type="button" onClick={fill} className={pill}>
            Preencher
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onCancel} className={pill + " flex-1"}>
            Cancelar
          </button>
          <button type="button" onClick={save} className="flex-1 rounded-xl bg-[#00E5FF] px-3 py-2 text-[13px] font-extrabold text-black active:scale-95">
            Guardar foto
          </button>
        </div>
      </div>
    </div>
  );
}
