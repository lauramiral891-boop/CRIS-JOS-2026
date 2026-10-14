import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import type { PostRow } from "../lib/commApi";
import { timeAgo } from "../lib/format";
import { Avatar, PostMedia } from "./PostBits";

type Props = {
  p: PostRow;
  canDelete: boolean;
  onDelete: () => void;
  onOpen: (photos: string[], i: number) => void;
};
const LONG = 180;

export default function PostCard({ p, canDelete, onDelete, onOpen }: Props) {
  const [more, setMore] = useState(false);
  const [menu, setMenu] = useState(false);
  const name = p.cj_profiles?.name ?? "Jogador";
  const left = Math.max(1, Math.ceil((Date.parse(p.expires_at) - Date.now()) / 3600000));
  const cut = p.body.length > LONG && !more;
  const text = cut ? `${p.body.slice(0, LONG).trimEnd()}…` : p.body;
  return (
    <article className="rounded-2xl border border-[#00FF88]/20 bg-[#0a1a14] p-3.5">
      <div className="flex items-center gap-3">
        <Avatar name={name} photo={p.cj_profiles?.photo} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[14px] font-bold">{name}</p>
          <p className="text-[10.5px] text-neutral-500">
            {timeAgo(Date.parse(p.created_at), Date.now())} • apaga em {left}h
          </p>
        </div>
        {canDelete && (
          <div className="relative">
            <button onClick={() => setMenu((v) => !v)} aria-label="Mais"
              className="grid h-8 w-8 place-items-center rounded-full bg-white/10">
              <MoreHorizontal size={16} />
            </button>
            {menu && (
              <button onClick={() => { setMenu(false); onDelete(); }}
                className="absolute right-0 top-9 z-10 rounded-xl bg-[#1e1e1e] px-4 py-2 text-[13px] font-bold text-[#FF8FA3] shadow-lg">
                Apagar
              </button>
            )}
          </div>
        )}
      </div>
      {p.body && (
        <p className="mt-2.5 whitespace-pre-wrap break-words text-[14px] leading-relaxed text-neutral-100">
          {text}
          {cut && (
            <button onClick={() => setMore(true)} className="ml-1 font-semibold text-neutral-400">Ver mais</button>
          )}
        </p>
      )}
      <PostMedia photos={p.media ?? []} onOpen={(i) => onOpen(p.media ?? [], i)} />
    </article>
  );
}
