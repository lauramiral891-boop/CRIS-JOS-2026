type AvProps = { name: string; photo?: string | null; size?: number };

export function Avatar({ name, photo, size = 40 }: AvProps) {
  const st = { width: size, height: size };
  const ring = "shrink-0 rounded-full border border-[#00FF88]/40";
  if (photo) return <img src={photo} alt="" style={st} className={`${ring} object-cover`} />;
  return (
    <span style={st} className={`${ring} grid place-items-center bg-black/30 text-[14px] font-extrabold text-[#00FF88]`}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

type MediaProps = { photos: string[]; onOpen: (i: number) => void };

export function PostMedia({ photos, onOpen }: MediaProps) {
  if (!photos || photos.length === 0) return null;
  const shown = photos.slice(0, 4);
  const extra = photos.length - shown.length;
  const one = photos.length === 1;
  return (
    <div className={`mt-2.5 -mx-3.5 grid gap-0.5 ${one ? "grid-cols-1" : "grid-cols-2"}`}>
      {shown.map((s, i) => (
        <button key={i} onClick={() => onOpen(i)} className="relative block">
          <img src={s} alt="" loading="lazy"
            className={`w-full object-cover ${one ? "max-h-[420px]" : "aspect-square"}`} />
          {extra > 0 && i === shown.length - 1 && (
            <span className="absolute inset-0 grid place-items-center bg-black/55 text-[22px] font-extrabold">
              +{extra}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
