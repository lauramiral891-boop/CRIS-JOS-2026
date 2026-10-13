import type { ComponentType } from "react";
import { Plus, Trash2, X } from "lucide-react";
import type { Game, GamePart } from "../lib/types";
import { ytId } from "../lib/gameUtils";
import { fieldCls } from "./ui";
import type { Patch } from "./GameInfoFields";

export type PickerType = ComponentType<{
  label: string;
  multiple?: boolean;
  maxSide: number;
  quality: number;
  aspect?: number;
  onPick: (imgs: string[]) => void;
  onError: (m: string) => void;
}>;

type Props = { v: Partial<Game>; on: Patch; Picker: PickerType; onWarn: (m: string) => void };

export function GameMediaFields({ v, on, Picker, onWarn }: Props) {
  const parts = v.parts ?? [];
  const shots = v.shots ?? [];
  const setPart = (i: number, p: Partial<GamePart>) =>
    on({ parts: parts.map((x, j) => (j === i ? { ...x, ...p } : x)) });
  const addPart = () => {
    if (parts.length >= 12) return;
    on({ parts: [...parts, { label: `Parte ${parts.length + 1}`, link: "" }] });
  };
  const trailer = v.trailer ?? "";
  return (
    <div className="space-y-2">
      <input value={trailer} onChange={(e) => on({ trailer: e.target.value })}
        placeholder="Link do trailer no YouTube" inputMode="url" autoCapitalize="none" className={fieldCls} />
      {trailer.trim() && (
        <p className={ytId(trailer) ? "text-[11px] text-[#00FF88]" : "text-[11px] text-[#FF8FA3]"}>
          {ytId(trailer) ? "Link do YouTube válido." : "Não parece um link do YouTube."}
        </p>
      )}

      <p className="pt-1 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
        Partes do download (opcional)
      </p>
      {parts.map((x, i) => (
        <div key={i} className="flex gap-1.5">
          <input value={x.label} onChange={(e) => setPart(i, { label: e.target.value })}
            placeholder="Parte 1" className={`${fieldCls} w-24 shrink-0`} />
          <input value={x.link} onChange={(e) => setPart(i, { link: e.target.value })}
            placeholder="Link https://…" inputMode="url" autoCapitalize="none" className={fieldCls} />
          <button type="button" onClick={() => on({ parts: parts.filter((_, j) => j !== i) })}
            aria-label="Tirar parte" className="grid w-9 shrink-0 place-items-center rounded-xl bg-[#FF4D6D]/15 text-[#FF4D6D]">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button type="button" onClick={addPart}
        className="w-full rounded-xl bg-white/10 py-2 text-[12px] font-extrabold uppercase">
        <Plus size={13} className="mr-1 inline" />Adicionar parte
      </button>

      <p className="pt-1 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
        Capturas de ecrã ({shots.length}/6)
      </p>
      <div className="flex gap-2 overflow-x-auto">
        {shots.map((s, i) => (
          <div key={i} className="relative shrink-0">
            <img src={s} alt="" className="h-16 w-24 rounded-lg object-cover" />
            <button type="button" onClick={() => on({ shots: shots.filter((_, j) => j !== i) })}
              aria-label="Tirar" className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/70">
              <X size={11} />
            </button>
          </div>
        ))}
      </div>
      {shots.length < 6 && (
        <Picker label="Adicionar capturas" multiple maxSide={640} quality={0.7} onError={onWarn}
          onPick={(imgs) => on({ shots: [...shots, ...imgs].slice(0, 6) })} />
      )}
    </div>
  );
}
