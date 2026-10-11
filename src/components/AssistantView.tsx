import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Bot, Flame, KeyRound, LifeBuoy, MessageCircle, Send, Sparkles, Trash2, Volume2, VolumeX, Wifi, WifiOff } from "lucide-react";
import type { Config } from "../lib/types";
import { askOnline, buildSystemPrompt, fallbackAnswer, localAnswer, norm, suggestions, type AiContext } from "../lib/assistant";
import { getNamespace, uid } from "../lib/storage";
import { ADM_EVENT, loadGlobalAdm, logUnknown } from "../lib/adm";
import { BRAND, normalize, welcomeLine } from "../lib/brain";
import HelpSheet, { ManagerButtons } from "./HelpSheet";
import { setVoiceEnabled, speak, stopVoice, unlockVoice, voiceEnabled, voiceSupported } from "../lib/voice";
import { cn } from "../utils/cn";

interface Msg {
  id: number;
  role: "user" | "assistant";
  text: string;
  source?: "online" | "local" | "data" | "memory";
  /** mostra os botões dos gerentes reais debaixo da resposta */
  help?: boolean;
  topic?: string;
  streaming?: boolean;
}

interface Store {
  msgs: Msg[];
  counts: Record<string, { q: string; n: number }>;
}

const aiKey = () => `cjg-ai:${getNamespace()}`;

const loadStore = (): Store => {
  try {
    const raw = localStorage.getItem(aiKey());
    if (!raw) return { msgs: [], counts: {} };
    const p = JSON.parse(raw) as Store;
    return { msgs: (p.msgs ?? []).map((m) => ({ ...m, streaming: false })), counts: p.counts ?? {} };
  } catch {
    return { msgs: [], counts: {} };
  }
};

function Rich({ text }: { text: string }) {
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((p, i) => {
      if (p.startsWith("**") && p.endsWith("**") && p.length > 4) return <b key={i} className="font-bold text-white">{p.slice(2, -2)}</b>;
      if (p.startsWith("*") && p.endsWith("*") && p.length > 2) return <i key={i}>{p.slice(1, -1)}</i>;
      return <span key={i}>{p}</span>;
    });
  return (
    <div className="space-y-1.5">
      {text.split("\n").map((line, i) => {
        const t = line.trim();
        if (!t) return <div key={i} className="h-1" />;
        const num = t.match(/^(\d+)\.\s+(.*)/);
        if (num) return <div key={i} className="flex gap-2"><span className="w-4 shrink-0 text-right font-bold text-[#00E5FF]">{num[1]}.</span><span className="min-w-0">{inline(num[2])}</span></div>;
        if (/^[-•]\s+/.test(t)) return <div key={i} className="flex gap-2"><span className="shrink-0 text-[#00FF88]">•</span><span className="min-w-0">{inline(t.replace(/^[-•]\s+/, ""))}</span></div>;
        return <p key={i}>{inline(t)}</p>;
      })}
    </div>
  );
}

export default function AssistantView({
  config, ownerName, getCtx, onPatch, onClose,
}: {
  config: Config;
  ownerName: string;
  getCtx: () => AiContext;
  onPatch: (p: Partial<Config>) => void;
  onClose: () => void;
}) {
  const first = ownerName.trim().split(/\s+/)[0] || "proprietário";
  /** Abre as respostas do assistente integrado com uma frase simpática */
  const friendly = (t: string) => {
    if (/^(olá|oi|claro|com certeza|boa pergunta|ótima)/i.test(t.trim())) return t;
    const o = [`Claro, ${first}! `, `Bora lá, ${first}! `, `Boa pergunta, ${first}! `, `Estamos juntos, ${first}! `];
    return o[t.length % o.length] + t;
  };
  const [g, setG] = useState(() => loadGlobalAdm());
  const [helpOpen, setHelpOpen] = useState(false);
  const houseId = getNamespace();
  const gRef = useRef(g);
  gRef.current = g;
  const [store, setStore] = useState<Store>(loadStore);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [showKey, setShowKey] = useState(false);
  const [keyDraft, setKeyDraft] = useState(config.aiKey);
  const [voiceOn, setVoiceOn] = useState(() => voiceSupported() && voiceEnabled());
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const voiceRef = useRef(voiceOn);
  voiceRef.current = voiceOn;
  const msgsRef = useRef<Msg[]>(store.msgs);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const aliveRef = useRef(true);
  msgsRef.current = store.msgs;

  const setMsgs = (fn: (m: Msg[]) => Msg[]) => setStore((s) => ({ ...s, msgs: fn(s.msgs) }));

  useEffect(() => {
    aliveRef.current = true;
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    const pull = () => setG(loadGlobalAdm());
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener(ADM_EVENT, pull);
    window.addEventListener("storage", pull);
    return () => {
      window.removeEventListener(ADM_EVENT, pull);
      window.removeEventListener("storage", pull);
      aliveRef.current = false;
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      abortRef.current?.abort();
      if (timerRef.current) clearInterval(timerRef.current);
      stopVoice();
    };
  }, []);

  /* Boas-vindas por voz, automáticas sempre que o proprietário abre a assistente */
  useEffect(() => {
    if (!voiceRef.current) return;
    unlockVoice();
    const t = setTimeout(() => speak(welcomeLine(ownerName)), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(aiKey(), JSON.stringify({ msgs: store.msgs.filter((m) => !m.streaming && m.text).slice(-40), counts: store.counts }));
    } catch {
      /* sem espaço */
    }
  }, [store]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [store.msgs, busy]);

  const top = useMemo(
    () => Object.values(store.counts).sort((a, b) => b.n - a.n).slice(0, 4),
    [store.counts]
  );

  const typeOut = (full: string, patch: (t: string) => void) =>
    new Promise<void>((resolve) => {
      let i = 0;
      timerRef.current = setInterval(() => {
        i = Math.min(full.length, i + 4);
        patch(full.slice(0, i));
        if (i >= full.length) {
          if (timerRef.current) clearInterval(timerRef.current);
          resolve();
        }
      }, 14);
    });

  const say = (id: number, text: string) => {
    setSpeakingId(id);
    speak(text, () => setSpeakingId((cur) => (cur === id ? null : cur)));
  };

  const toggleVoice = () => {
    const next = !voiceOn;
    setVoiceOn(next);
    setVoiceEnabled(next);
    setSpeakingId(null);
    if (next) { unlockVoice(); speak("Voz ligada. Estou aqui para ajudar!"); }
  };

  const send = async (raw: string) => {
    const q = raw.trim();
    if (!q || busy) return;
    if (voiceRef.current) { stopVoice(); setSpeakingId(null); unlockVoice(); }
    setInput("");
    const key = norm(q);
    const aid = uid();
    setStore((s) => ({
      msgs: [...s.msgs, { id: uid(), role: "user", text: q }, { id: aid, role: "assistant", text: "", streaming: true }],
      counts: { ...s.counts, [key]: { q, n: (s.counts[key]?.n ?? 0) + 1 } },
    }));
    setBusy(true);

    const ctx = getCtx();
    const mem = gRef.current.memories;
    const local = localAnswer(q, ctx, mem);
    if (!local) logUnknown(q);
    const wantsHuman = /gerente|pessoa real|atendimento humano|falar com (alguem|uma pessoa|humano)|suporte/.test(normalize(q));
    const humanCat = local?.hit && ["Cobrança", "Ajuda", "Conta"].includes(local.hit.mem.cat);
    const help = wantsHuman || !!humanCat;
    const patch = (text: string, extra?: Partial<Msg>) => setMsgs((m) => m.map((x) => (x.id === aid ? { ...x, text, ...extra } : x)));
    const history = [...msgsRef.current.filter((m) => !m.streaming && m.text).map((m) => ({ role: m.role, content: m.text })), { role: "user" as const, content: q }];
    let why = "";
    const done = (text: string, source: NonNullable<Msg["source"]>, extra?: Partial<Msg>) => patch(text, { streaming: false, source, help, topic: q, ...extra });

    try {
      if (local?.exact) {
        const txt = friendly(local.text);
        await typeOut(txt, (t) => patch(t));
        done(txt, local.kind === "data" ? "data" : "memory");
        if (voiceRef.current && aliveRef.current) say(aid, txt);
      } else {
        if (!navigator.onLine) throw new Error("offline");
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        let acc = "";
        try { await askOnline(history, buildSystemPrompt(ctx, q, mem), config.aiKey, (d) => { acc += d; patch(acc); }, ctrl.signal); } catch (e) { why = e instanceof Error ? e.message : String(e); throw e; }
        done(acc, "online");
        if (voiceRef.current && aliveRef.current) say(aid, acc);
      }
    } catch {
      if (!aliveRef.current) return;
      const base = friendly(local?.text ?? fallbackAnswer(ctx));
    const text = why && !/abort/i.test(why) ? base + "\n\n(IA online indisponível: " + why + ")" : base;
      await typeOut(text, (t) => patch(t));
      done(text, local?.kind === "memory" ? "memory" : "local", { help: help || !local });
      if (voiceRef.current && aliveRef.current) say(aid, text);
    } finally {
      if (aliveRef.current) setBusy(false);
    }
  };

  const clear = () => {
    stopVoice();
    setSpeakingId(null);
    abortRef.current?.abort();
    if (timerRef.current) clearInterval(timerRef.current);
    setBusy(false);
    setStore((s) => ({ ...s, msgs: [] }));
  };

  const empty = store.msgs.length === 0;

  return (
    <div className="fade absolute inset-0 z-50 flex flex-col bg-[#121212]">
      <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3">
        <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 active:scale-95" aria-label="Voltar"><ArrowLeft size={17} /></button>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#00E5FF] to-[#00FF88] text-black shadow-[0_0_16px_rgba(0,229,255,0.4)]"><Bot size={21} /></span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[20px] font-extrabold uppercase leading-none">Assistente IA</h3>
          <p className={cn("mt-0.5 flex items-center gap-1 text-[11px] font-semibold", online ? "text-[#00FF88]" : "text-[#FFC107]")}>
            {online ? <Wifi size={11} /> : <WifiOff size={11} />} {online ? `Online • assistente ${BRAND.name}` : "Offline • memória da CJ"}
          </p>
        </div>
        <button onClick={() => setHelpOpen(true)} className="grid h-9 w-9 place-items-center rounded-full bg-[#25D366]/15 text-[#25D366]" aria-label="Ajuda e gerentes"><LifeBuoy size={16} /></button>
        <button onClick={() => setShowKey(!showKey)} className={cn("grid h-9 w-9 place-items-center rounded-full", showKey || config.aiKey ? "bg-[#FFC107]/15 text-[#FFC107]" : "bg-white/10 text-neutral-300")} aria-label="Chave de IA"><KeyRound size={15} /></button>
        {voiceSupported() && (
          <button onClick={toggleVoice} className={cn("grid h-9 w-9 place-items-center rounded-full", voiceOn ? "bg-[#00FF88]/15 text-[#00FF88]" : "bg-white/10 text-neutral-400")} aria-label={voiceOn ? "Desligar a voz" : "Ligar a voz"}>
            {voiceOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        )}
        {!empty && <button onClick={clear} className="grid h-9 w-9 place-items-center rounded-full bg-[#FF4D6D]/10 text-[#FF4D6D]" aria-label="Limpar conversa"><Trash2 size={15} /></button>}
      </div>

      {showKey && (
        <div className="fade border-b border-white/[0.07] bg-[#171717] px-4 py-3">
          <p className="text-[11.5px] leading-relaxed text-neutral-400">Opcional: ligue a sua chave da OpenAI para respostas ainda mais fiáveis. Fica guardada só neste telemóvel.</p>
          <div className="mt-2 flex gap-2">
            <input type="password" value={keyDraft} onChange={(e) => setKeyDraft(e.target.value)} placeholder="sk-..." className="w-full rounded-xl border border-white/10 bg-[#252525] px-3 py-2 text-[13px] outline-none focus:border-[#FFC107]" />
            <button onClick={() => { onPatch({ aiKey: keyDraft.trim() }); setShowKey(false); }} className="shrink-0 rounded-xl bg-[#FFC107] px-4 text-[12px] font-extrabold uppercase text-black">Guardar</button>
          </div>
        </div>
      )}

      <div className="thin-scroll flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {empty && (
          <div className="rise">
            <div className="rounded-2xl border border-[#00E5FF]/25 bg-gradient-to-br from-[#00E5FF]/10 to-transparent p-4">
              <p className="flex items-center gap-2 font-display text-[18px] font-extrabold uppercase"><Sparkles size={16} className="text-[#00E5FF]" /> Olá, {ownerName.trim() || first}!</p>
              <p className="mt-1 text-[13px] leading-relaxed text-neutral-300">Sou a assistente da <b>{BRAND.name}</b>, a app do <b>{BRAND.founder}</b>. Pergunte-me sobre <b>como gerir e crescer o negócio</b>, sobre a <b>app</b> ou sobre os <b>seus números</b> em tempo real.</p>
            </div>
            <button onClick={() => setHelpOpen(true)} className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-[#25D366]/35 bg-[#25D366]/10 p-3 text-left active:scale-[0.98]">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#25D366] text-black"><MessageCircle size={18} /></span>
              <span className="leading-tight"><b className="block text-[13.5px]">Precisa de ajuda de uma pessoa?</b><span className="text-[11.5px] text-neutral-400">Fale com um gerente da {BRAND.name} no WhatsApp</span></span>
            </button>
            <p className="mb-2 mt-4 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-500"><Flame size={12} className="text-orange-400" /> Perguntas mais relevantes</p>
            <div className="space-y-1.5">
              {suggestions.map((s) => (
                <button key={s} onClick={() => void send(s)} className="block w-full rounded-xl border border-white/10 bg-[#1e1e1e] px-3.5 py-2.5 text-left text-[13px] font-semibold text-neutral-200 transition active:scale-[0.98]">{s}</button>
              ))}
            </div>
          </div>
        )}

        {store.msgs.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            {m.role === "assistant" && <span className="mr-2 mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#00E5FF] to-[#00FF88] text-black"><Bot size={14} /></span>}
            <div className={cn("max-w-[84%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed", m.role === "user" ? "rounded-br-md bg-[#00E5FF] font-semibold text-black" : "rounded-bl-md border border-white/[0.08] bg-[#1e1e1e] text-neutral-200")}>
              {m.role === "assistant" && m.streaming && !m.text ? (
                <span className="flex items-center gap-1 py-1">
                  {[0, 1, 2].map((d) => <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#00E5FF]" style={{ animationDelay: `${d * 0.15}s` }} />)}
                </span>
              ) : m.role === "assistant" ? <Rich text={m.text} /> : m.text}
              {m.role === "assistant" && !m.streaming && m.source && (
                <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  {m.source === "online" ? "● IA online" : m.source === "data" ? "● Dados da sua Game House" : m.source === "memory" ? `● Memória ${BRAND.name}` : "● Assistente integrado"}
                  {voiceSupported() && (
                    <button onClick={() => (speakingId === m.id ? (stopVoice(), setSpeakingId(null)) : (unlockVoice(), say(m.id, m.text)))} className="ml-2 inline-flex items-center gap-1 rounded-full bg-[#00FF88]/12 px-2 py-0.5 text-[#00FF88] normal-case tracking-normal">
                      <Volume2 size={11} /> {speakingId === m.id ? "Parar" : "Ouvir"}
                    </button>
                  )}
                </p>
              )}
              {m.role === "assistant" && !m.streaming && m.help && (
                g.managers.length > 0 ? <ManagerButtons managers={g.managers} house={config.houseName} owner={ownerName} id={houseId} topic={m.topic} limit={3} /> : null
              )}
              {m.role === "assistant" && !m.streaming && m.help && (
                <button onClick={() => setHelpOpen(true)} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#25D366]/40 bg-[#25D366]/10 py-2 text-[12px] font-extrabold text-[#25D366]"><MessageCircle size={14} /> Falar com um gerente</button>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {!empty && (
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 pb-2">
          {top.length > 0 && top.map((t) => (
            <button key={t.q} disabled={busy} onClick={() => void send(t.q)} className="flex shrink-0 items-center gap-1 rounded-full border border-orange-500/40 bg-orange-500/10 px-3 py-1.5 text-[11.5px] font-semibold text-orange-300 disabled:opacity-40"><Flame size={11} /> {t.q}</button>
          ))}
          {suggestions.slice(0, 5).map((s) => (
            <button key={s} disabled={busy} onClick={() => void send(s)} className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11.5px] font-semibold text-neutral-300 disabled:opacity-40">{s}</button>
          ))}
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="flex items-center gap-2 border-t border-white/[0.07] bg-[#0e0e0e] px-4 py-3">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Escreva a sua pergunta..." className="min-w-0 flex-1 rounded-full border border-white/10 bg-[#252525] px-4 py-3 text-[14px] outline-none transition focus:border-[#00E5FF]" />
        <button type="submit" disabled={busy || !input.trim()} className="neon-btn-cyan grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#00E5FF] text-black transition active:scale-90 disabled:opacity-40" aria-label="Enviar"><Send size={18} /></button>
      </form>
      {helpOpen && <HelpSheet managers={g.managers} house={config.houseName} owner={ownerName} id={houseId} onClose={() => setHelpOpen(false)} />}
    </div>
  );
}
