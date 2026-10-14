import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Send } from "lucide-react";
import { hhmm, listMessages, mentionParts, sendMessage } from "../lib/community";
import type { Msg, Role } from "../lib/community";

type Me = { name: string; role: Role };
type Props = { channel: string; me: Me; onBack: () => void };

const BADGE: Record<Role, string> = {
  adm: "bg-[#FFC107]/20 text-[#FFC107]",
  dev: "bg-[#00FF88]/20 text-[#00FF88]",
  user: "",
};
const LABEL: Record<Role, string> = { adm: "ADM", dev: "DEV", user: "" };
const AV =
  "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#00FF88]/40 bg-[#0a1a14] text-[14px] font-extrabold text-[#00FF88]";

function Bubble({ m }: { m: Msg }) {
  return (
    <div className="flex gap-3">
      <span className={AV}>{m.name.slice(0, 1).toUpperCase()}</span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-[14px] font-bold">
          {m.name}
          {m.role !== "user" && (
            <span className={`rounded px-1.5 py-0.5 text-[9.5px] font-extrabold ${BADGE[m.role]}`}>
              {LABEL[m.role]}
            </span>
          )}
          <span className="text-[10.5px] font-normal text-neutral-500">{hhmm(m.ts)}</span>
        </p>
        <p className="whitespace-pre-wrap break-words text-[13.5px] text-neutral-200">
          {mentionParts(m.text).map((p, i) => (
            <span key={i} className={p.m ? "rounded bg-[#00FF88]/15 text-[#00FF88]" : ""}>{p.t}</span>
          ))}
        </p>
      </div>
    </div>
  );
}

export default function CommunityChat({ channel, me, onBack }: Props) {
  const [msgs, setMsgs] = useState<Msg[]>(() => listMessages(channel));
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setMsgs(listMessages(channel)), 3000);
    return () => clearInterval(t);
  }, [channel]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [msgs.length]);

  const send = () => {
    const t = text.trim();
    if (!t) return;
    sendMessage({ channel, name: me.name, role: me.role, text: t.slice(0, 1000) });
    setText("");
    setMsgs(listMessages(channel));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <button onClick={onBack} aria-label="Voltar"
          className="grid h-9 w-9 place-items-center rounded-full bg-white/10">
          <ChevronLeft size={18} />
        </button>
        <h3 className="font-display text-[18px] font-extrabold">#{channel}</h3>
      </div>
      <div className="thin-scroll flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {msgs.length === 0 && (
          <p className="pt-10 text-center text-[13px] text-neutral-500">Ainda sem mensagens. Diga olá!</p>
        )}
        {msgs.map((m) => <Bubble key={m.id} m={m} />)}
        <div ref={end} />
      </div>
      <div className="flex items-center gap-2 border-t border-white/10 px-3 py-2">
        <input value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          placeholder={`Escrever em #${channel}…`} enterKeyHint="send"
          className="min-w-0 flex-1 rounded-full border border-[#00FF88]/30 bg-[#0a1a14] px-4 py-2.5 text-[13.5px] outline-none placeholder:text-neutral-500 focus:border-[#00FF88]" />
        <button onClick={send} aria-label="Enviar"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#00FF88] text-black active:scale-95">
          <Send size={17} />
        </button>
      </div>
      <p className="px-4 pb-2 text-center text-[10px] text-neutral-600">
        As mensagens apagam-se sozinhas 24h depois.
      </p>
    </div>
  );
}
