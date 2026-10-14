import { Trash2 } from "lucide-react";
import type { PostRow } from "../lib/commApi";
import { timeAgo } from "../lib/format";

type Props = { p: PostRow; canDelete: boolean; onDelete: () => void };

const AV =
  "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#00FF88]/40 bg-black/30 text-[14px] font-extrabold text-[#00FF88]";

export default function PostCard({ p, canDelete, onDelete }: Props) {
  const name = p.cj_profiles?.name ?? "Jogador";
  const left = Math.max(1, Math.ceil((Date.parse(p.expires_at) - Date.now()) / 3600000));
  return (
    <article className="rounded-2xl border border-[#00FF88]/20 bg-[#0a1a14] p-3.5">
      <div className="flex items-center gap-3">
        <span className={AV}>{name.slice(0, 1).toUpperCase()}</span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[14px] font-bold">{name}</p>
          <p className="text-[10.5px] text-neutral-500">
            {timeAgo(Date.parse(p.created_at), Date.now())} • apaga em {left}h
          </p>
        </div>
        {canDelete && (
          <button onClick={onDelete} aria-label="Apagar"
            className="grid h-8 w-8 place-items-center rounded-full bg-[#FF4D6D]/15 text-[#FF4D6D]">
            <Trash2 size={14} />
          </button>
        )}
      </div>
      {p.body && (
        <p className="mt-2.5 whitespace-pre-wrap break-words text-[14px] leading-relaxed text-neutral-100">
          {p.body}
        </p>
      )}
    </article>
  );
}
