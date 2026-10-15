import { useState } from "react";
import { Send, X } from "lucide-react";
import type { CommentRow, PostRow, ReactionRow, Target } from "../lib/commApi";
import { mentionParts } from "../lib/community";
import { timeAgo } from "../lib/format";
import { Avatar } from "./PostBits";
import { ReactButton, Summary } from "./Reactions";

type Props = {
  post: PostRow;
  comments: CommentRow[];
  reactions: ReactionRow[];
  me: string;
  mod: boolean;
  name: string;
  photo: string;
  onSend: (body: string, parent?: string) => Promise<string>;
  onDelete: (c: CommentRow) => void;
  onReact: (t: Target, emoji: string) => void;
  onProfile: (id: string) => void;
  onClose: () => void;
};

const QUICK = ["😀", "😂", "😍", "🔥", "👏", "😮", "😢", "😡"];

type ItemProps = {
  c: CommentRow;
  rs: ReactionRow[];
  me: string;
  mod: boolean;
  deep?: boolean;
  onReact: Props["onReact"];
  onReply: (c: CommentRow) => void;
  onProfile: (id: string) => void;
  onDelete: (c: CommentRow) => void;
};

function Item({ c, rs, me, mod, deep, onReact, onReply, onDelete, onProfile }: ItemProps) {
  const mine = rs.find((r) => r.user_id === me);
  const nm = c.cj_profiles?.name ?? "Jogador";
  return (
    <div className={`flex gap-2 ${deep ? "ml-10" : ""}`}>
      <button onClick={() => onProfile(c.author)} className="shrink-0 self-start"><Avatar name={nm} photo={c.cj_profiles?.photo} size={deep ? 28 : 34} /></button>
      <div className="min-w-0 flex-1">
        <div className="inline-block max-w-full rounded-2xl bg-[#262626] px-3 py-2">
          <button onClick={() => onProfile(c.author)} className="block text-left text-[12.5px] font-bold">{nm}</button>
          <p className="whitespace-pre-wrap break-words text-[13.5px]">
            {mentionParts(c.body).map((p, i) => (
              <span key={i} className={p.m ? "text-[#00FF88]" : ""}>{p.t}</span>
            ))}
          </p>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11.5px] text-neutral-400">
          <ReactButton mine={mine} onPick={(e) => onReact({ comment: c.id }, e)} />
          <button onClick={() => onReply(c)} className="font-bold">Responder</button>
          <span>{timeAgo(Date.parse(c.created_at), Date.now())}</span>
          {(c.author === me || mod) && (
            <button onClick={() => onDelete(c)} className="font-bold text-[#FF8FA3]">Apagar</button>
          )}
          <Summary rs={rs} />
        </div>
      </div>
    </div>
  );
}

export default function CommentsSheet(p: Props) {
  const [text, setText] = useState("");
  const [parent, setParent] = useState<CommentRow | null>(null);
  const [emojis, setEmojis] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const roots = p.comments.filter((c) => !c.parent_id);
  const kids = (id: string) => p.comments.filter((c) => c.parent_id === id);
  const rsOf = (id: string) => p.reactions.filter((r) => r.comment_id === id);
  const postRs = p.reactions.filter((r) => r.post_id === p.post.id);

  const reply = (c: CommentRow) => {
    const root = c.parent_id ? p.comments.find((x) => x.id === c.parent_id) ?? c : c;
    setParent(root);
    setText(`@${(c.cj_profiles?.name ?? "").replace(/\s+/g, "")} `);
  };

  const send = async () => {
    if (busy || !text.trim()) return;
    setBusy(true);
    setErr("");
    const e = await p.onSend(text, parent?.id);
    setBusy(false);
    if (e) return setErr(e);
    setText("");
    setParent(null);
    setEmojis(false);
  };

  const itemProps = { me: p.me, mod: p.mod, onReact: p.onReact, onReply: reply, onDelete: p.onDelete, onProfile: p.onProfile };

  return (
    <div className="fade absolute inset-0 z-[60] flex flex-col justify-end bg-black/60" onClick={p.onClose}>
      <div className="flex max-h-[88%] min-h-[55%] flex-col rounded-t-3xl bg-[#161616]" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/25" />
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          {postRs.length > 0
            ? <Summary rs={postRs} />
            : <span className="text-[13px] text-neutral-400">Sê a primeira pessoa a gostar disto</span>}
          <button onClick={p.onClose} aria-label="Fechar"
            className="grid h-8 w-8 place-items-center rounded-full bg-white/10"><X size={15} /></button>
        </div>
        <div className="thin-scroll flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {roots.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-[17px] font-extrabold">Ainda sem comentários</p>
              <p className="text-[13px] text-neutral-400">Sê a primeira pessoa a comentar.</p>
            </div>
          )}
          {roots.map((c) => (
            <div key={c.id} className="space-y-3">
              <Item c={c} rs={rsOf(c.id)} {...itemProps} />
              {kids(c.id).map((k) => <Item key={k.id} c={k} rs={rsOf(k.id)} deep {...itemProps} />)}
            </div>
          ))}
        </div>
        {parent && (
          <div className="flex items-center justify-between bg-white/5 px-4 py-1.5 text-[12px] text-neutral-300">
            <span>A responder a <b>{parent.cj_profiles?.name ?? "Jogador"}</b></span>
            <button onClick={() => { setParent(null); setText(""); }} aria-label="Cancelar"><X size={14} /></button>
          </div>
        )}
        {emojis && (
          <div className="flex justify-around px-3 py-1.5 text-[24px]">
            {QUICK.map((e) => <button key={e} onClick={() => setText((t) => t + e)}>{e}</button>)}
          </div>
        )}
        {err && <p className="px-4 pb-1 text-center text-[12px] text-[#FF8FA3]">{err}</p>}
        <div className="flex items-center gap-2 border-t border-white/10 px-3 pt-2"
          style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom, 0px))" }}>
          <Avatar name={p.name} photo={p.photo} size={34} />
          <input value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void send(); }}
            placeholder={`Comentar como ${p.name}`} maxLength={1000}
            className="min-w-0 flex-1 rounded-full bg-[#262626] px-4 py-2.5 text-[13.5px] outline-none placeholder:text-neutral-500" />
          <button onClick={() => setText((t) => t + "@")} aria-label="Mencionar"
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-[16px] font-bold">@</button>
          <button onClick={() => setEmojis((v) => !v)} aria-label="Emoji"
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-[17px]">😀</button>
          <button onClick={() => void send()} disabled={busy || !text.trim()} aria-label="Enviar"
            className="grid h-9 w-9 place-items-center rounded-full bg-[#00FF88] text-black disabled:opacity-40">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
