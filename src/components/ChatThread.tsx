import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Send, Trash2 } from "lucide-react";
import type { ChatRow } from "../lib/commApi";
import { hhmm, mentionParts } from "../lib/community";
import { Avatar } from "./PostBits";

type Props = {
  title: string;
  rows: ChatRow[];
  me: string;
  group: boolean;
  nameOf: (id: string) => string;
  photoOf: (id: string) => string | null;
  canDelete: (m: ChatRow) => boolean;
  onSend: (text: string) => Promise<string>;
  onDelete: (m: ChatRow) => void;
  onBack: () => void;
};

export default function ChatThread(p: Props) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [p.rows.length]);

  const send = async () => {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    setErr("");
    const e = await p.onSend(t);
    setBusy(false);
    if (e) return setErr(e);
    setText("");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-white/10 px-3 py-2.5">
        <button onClick={p.onBack} aria-label="Voltar"
          className="grid h-9 w-9 place-items-center rounded-full bg-white/10">
          <ChevronLeft size={18} />
        </button>
        <h3 className="min-w-0 flex-1 truncate font-display text-[17px] font-extrabold">{p.title}</h3>
      </div>
      <div className="thin-scroll flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {p.rows.length === 0 && (
          <p className="pt-10 text-center text-[13px] text-neutral-500">Ainda sem mensagens. Diga olá!</p>
        )}
        {p.rows.map((m) => {
          const mine = m.author === p.me;
          return (
            <div key={m.id} className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
              {!mine && <Avatar name={p.nameOf(m.author)} photo={p.photoOf(m.author)} size={30} />}
              <div className={`max-w-[78%] rounded-2xl px-3 py-2 ${mine ? "bg-[#00FF88] text-black" : "bg-[#262626]"}`}>
                {p.group && !mine && (
                  <p className="text-[11px] font-bold text-[#00FF88]">{p.nameOf(m.author)}</p>
                )}
                <p className="whitespace-pre-wrap break-words text-[13.5px]">
                  {mentionParts(m.body).map((x, i) => (
                    <span key={i} className={x.m ? (mine ? "font-extrabold underline" : "text-[#00FF88]") : ""}>{x.t}</span>
                  ))}
                </p>
                <p className="mt-0.5 flex items-center justify-end gap-2 text-[9.5px] opacity-60">
                  {hhmm(Date.parse(m.created_at))}
                  {p.canDelete(m) && (
                    <button onClick={() => p.onDelete(m)} aria-label="Apagar"><Trash2 size={11} /></button>
                  )}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={end} />
      </div>
      {err && <p className="px-4 pb-1 text-center text-[12px] text-[#FF8FA3]">{err}</p>}
      <div className="flex items-center gap-2 border-t border-white/10 px-3 py-2"
        style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom, 0px))" }}>
        <input value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void send(); }}
          placeholder="Escrever mensagem…" maxLength={1000} enterKeyHint="send"
          className="min-w-0 flex-1 rounded-full border border-[#00FF88]/30 bg-[#0a1a14] px-4 py-2.5 text-[13.5px] outline-none placeholder:text-neutral-500 focus:border-[#00FF88]" />
        <button onClick={() => void send()} disabled={busy || !text.trim()} aria-label="Enviar"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#00FF88] text-black disabled:opacity-40">
          <Send size={17} />
        </button>
      </div>
    </div>
  );
}
