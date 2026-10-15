import { useState } from "react";
import { MessageCircle, MoreHorizontal } from "lucide-react";
import type { PostRow, ReactionRow } from "../lib/commApi";
import { timeAgo } from "../lib/format";
import { Avatar, PostMedia } from "./PostBits";
import { ReactButton, Summary } from "./Reactions";

type Props = {
  p: PostRow;
  rs: ReactionRow[];
  me: string;
  nComments: number;
  canDelete: boolean;
  onDelete: () => void;
  onOpen: (photos: string[], i: number) => void;
  onReact: (emoji: string) => void;
  onComments: () => void;
  onProfile: (id: string) => void;
};
const LONG = 180;

export default function PostCard(x: Props) {
  const { p, rs } = x;
  const [more, setMore] = useState(false);
  const [menu, setMenu] = useState(false);
  const name = p.cj_profiles?.name ?? "Jogador";
  const left = Math.max(1, Math.ceil((Date.parse(p.expires_at) - Date.now()) / 3600000));
  const cut = p.body.length > LONG && !more;
  const text = cut ? `${p.body.slice(0, LONG).trimEnd()}…` : p.body;
  const mine = rs.find((r) => r.user_id === x.me);
  return (
    <article className="bg-[#0e1512] px-3.5 py-3">
      <div className="flex items-center gap-3">
        <button onClick={() => x.onProfile(p.author)} className="shrink-0"><Avatar name={name} photo={p.cj_profiles?.photo} /></button>
        <div className="min-w-0 flex-1 leading-tight">
          <button onClick={() => x.onProfile(p.author)} className="block max-w-full truncate text-left text-[14px] font-bold">{name}</button>
          <p className="text-[10.5px] text-neutral-500">
            {timeAgo(Date.parse(p.created_at), Date.now())} • apaga em {left}h
          </p>
        </div>
        {x.canDelete && (
          <div className="relative">
            <button onClick={() => setMenu((v) => !v)} aria-label="Mais"
              className="grid h-8 w-8 place-items-center rounded-full bg-white/10">
              <MoreHorizontal size={16} />
            </button>
            {menu && (
              <button onClick={() => { setMenu(false); x.onDelete(); }}
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
          {cut && <button onClick={() => setMore(true)} className="ml-1 font-semibold text-neutral-400">Ver mais</button>}
        </p>
      )}
      <PostMedia photos={p.media ?? []} onOpen={(i) => x.onOpen(p.media ?? [], i)} />
      <div className="mt-3 flex items-center justify-between text-[12px] text-neutral-400">
        <Summary rs={rs} />
        <button onClick={x.onComments}>
          {x.nComments} {x.nComments === 1 ? "comentário" : "comentários"}
        </button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <ReactButton bar mine={mine} onPick={x.onReact} />
        <button onClick={x.onComments}
          className="flex items-center justify-center gap-1.5 rounded-full bg-white/10 py-3 text-[13px] font-bold text-neutral-300">
          <MessageCircle size={16} />Comentar
        </button>
      </div>
    </article>
  );
}
