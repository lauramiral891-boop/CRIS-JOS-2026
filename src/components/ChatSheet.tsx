import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ChevronLeft, MessageCircle } from "lucide-react";
import { ADM_EMAIL } from "../lib/cloud";
import { chatDelete, chatList, chatSend } from "../lib/commApi";
import type { ChatRow, Member } from "../lib/commApi";
import ChatThread from "./ChatThread";
import { Avatar } from "./PostBits";

type Props = {
  email: string;
  me: string;
  mod: boolean;
  members: Member[];
  start: string;
  onClose: () => void;
};

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="fade absolute inset-0 z-[55] flex flex-col bg-[#050d0a] text-white">
      <div style={{ height: "env(safe-area-inset-top, 0px)" }} />
      {children}
    </div>
  );
}

const LBL = "px-1 text-[11px] font-bold uppercase tracking-wider text-neutral-400";

export default function ChatSheet({ email, me, mod, members, start, onClose }: Props) {
  const [rows, setRows] = useState<ChatRow[]>([]);
  const [view, setView] = useState(start ? `dm:${start}` : "home");
  const [err, setErr] = useState("");
  const last = useRef("");

  const full = useCallback(async () => {
    const r = await chatList(email);
    if (!r.ok) return setErr(r.error);
    const d = r.data ?? [];
    setRows(d);
    last.current = d.length ? d[d.length - 1].created_at : "";
    setErr("");
  }, [email]);

  const more = useCallback(async () => {
    if (!last.current) return full();
    const r = await chatList(email, last.current);
    if (!r.ok) return;
    const d = r.data ?? [];
    if (d.length === 0) return;
    last.current = d[d.length - 1].created_at;
    setRows((x) => {
      const ids = new Set(x.map((y) => y.id));
      return [...x, ...d.filter((y) => !ids.has(y.id))];
    });
  }, [email, full]);

  useEffect(() => {
    void full();
    let n = 0;
    const t = setInterval(() => {
      if (document.hidden) return;
      n += 1;
      void (n % 12 === 0 ? full() : more());
    }, 5000);
    return () => clearInterval(t);
  }, [full, more]);

  const info = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const nameOf = (id: string) => info.get(id)?.name ?? "Jogador";
  const photoOf = (id: string) => info.get(id)?.photo ?? null;

  const send = async (text: string, to?: string) => {
    const r = await chatSend(email, text, to);
    if (!r.ok) return r.error;
    await more();
    return "";
  };

  const remove = async (m: ChatRow) => {
    if (!window.confirm("Apagar esta mensagem?")) return;
    const r = await chatDelete(m.author !== me && mod ? ADM_EMAIL : email, m.id);
    if (!r.ok) return setErr(r.error);
    setRows((x) => x.filter((y) => y.id !== m.id));
  };

  const convos = useMemo(() => {
    const m = new Map<string, ChatRow>();
    rows.forEach((r) => {
      if (!r.to_user) return;
      m.set(r.author === me ? r.to_user : r.author, r);
    });
    return Array.from(m.entries()).sort((a, b) => Date.parse(b[1].created_at) - Date.parse(a[1].created_at));
  }, [rows, me]);

  const dmId = view.startsWith("dm:") ? view.slice(3) : "";

  if (view === "general" || dmId) {
    const list = dmId
      ? rows.filter((r) => r.to_user && ((r.author === me && r.to_user === dmId) || (r.author === dmId && r.to_user === me)))
      : rows.filter((r) => !r.to_user);
    return (
      <Shell>
        <ChatThread title={dmId ? nameOf(dmId) : "Chat geral"} rows={list} me={me} group={!dmId}
          nameOf={nameOf} photoOf={photoOf}
          canDelete={(m) => m.author === me || (!dmId && mod)}
          onSend={(t) => send(t, dmId || undefined)}
          onDelete={(m) => void remove(m)}
          onBack={() => setView("home")} />
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex items-center gap-3 border-b border-white/10 px-3 py-2.5">
        <button onClick={onClose} aria-label="Voltar"
          className="grid h-9 w-9 place-items-center rounded-full bg-white/10">
          <ChevronLeft size={18} />
        </button>
        <h3 className="font-display text-[17px] font-extrabold">Chat</h3>
      </div>
      <div className="thin-scroll flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {err && <p className="rounded-xl bg-[#FF4D6D]/10 p-2.5 text-center text-[12px] text-[#FF8FA3]">{err}</p>}
        <button onClick={() => setView("general")}
          className="flex w-full items-center gap-3 rounded-2xl border border-[#00FF88]/30 bg-[#0a1a14] p-3.5 text-left">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-[#00FF88]/15 text-[#00FF88]">
            <MessageCircle size={22} />
          </span>
          <span>
            <span className="block text-[14.5px] font-bold">Chat geral</span>
            <span className="block text-[11.5px] text-neutral-400">Todos os membros</span>
          </span>
        </button>

        <p className={LBL}>Conversas privadas</p>
        {convos.length === 0 && (
          <p className="px-1 text-[12.5px] text-neutral-500">Ainda sem conversas. Toque em alguém abaixo para começar.</p>
        )}
        {convos.map(([id, m]) => (
          <button key={id} onClick={() => setView(`dm:${id}`)}
            className="flex w-full items-center gap-3 rounded-2xl bg-[#0e1512] p-3 text-left">
            <Avatar name={nameOf(id)} photo={photoOf(id)} size={42} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-bold">{nameOf(id)}</span>
              <span className="block truncate text-[12px] text-neutral-400">
                {m.author === me ? "Você: " : ""}{m.body}
              </span>
            </span>
          </button>
        ))}

        <p className={LBL}>Membros</p>
        {members.filter((m) => m.id !== me).slice(0, 50).map((m) => (
          <button key={m.id} onClick={() => setView(`dm:${m.id}`)}
            className="flex w-full items-center gap-3 rounded-2xl bg-[#0e1512] p-3 text-left">
            <Avatar name={m.name} photo={m.photo} size={38} />
            <span className="min-w-0 flex-1 truncate text-[14px] font-bold">{m.name}</span>
            <span className="text-[12px] font-bold text-[#00FF88]">Mensagem</span>
          </button>
        ))}
      </div>
    </Shell>
  );
}
