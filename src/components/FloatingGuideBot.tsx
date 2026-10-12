import { useState } from "react";
import { Bot, BookOpen, MessageCircle, X, ChevronRight, Sparkles } from "lucide-react";

interface Props {
  onStartGuide: () => void;
  onOpenAI: () => void;
  isOwner: boolean;
}

export default function FloatingGuideBot({ onStartGuide, onOpenAI, isOwner }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <style>{`
        @keyframes cjBotFloat {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50% { transform: translateY(-13px) rotate(2deg); }
        }
        @keyframes cjBotGlow {
          0%, 100% { box-shadow: 0 0 15px #00bfff44, 0 0 32px #0077ff22; }
          50% { box-shadow: 0 0 24px #00bfff99, 0 0 48px #0077ff44; }
        }
        @keyframes cjBotTurn {
          0%, 88%, 100% { rotate: 0deg; }
          92% { rotate: -7deg; }
          96% { rotate: 7deg; }
        }
        .cj-bot-float { animation: cjBotFloat 3.2s ease-in-out infinite, cjBotTurn 8s ease-in-out infinite; }
        .cj-bot-glow { animation: cjBotGlow 2.8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .cj-bot-float, .cj-bot-glow { animation: none !important; }
        }
      `}</style>

      <div className="fixed bottom-5 right-4 z-[90] flex flex-col items-end gap-3 sm:bottom-7 sm:right-7">
        {open && (
          <section className="w-[min(310px,calc(100vw-32px))] overflow-hidden rounded-3xl border border-sky-400/30 bg-[#10151f]/95 text-white shadow-2xl shadow-sky-950/50 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/10 bg-sky-400/10 p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl border border-sky-300/40 bg-sky-400/15 text-sky-300">
                  <Bot size={23} />
                </div>
                <div>
                  <p className="text-sm font-extrabold">CJ Assistente</p>
                  <p className="text-[11px] text-sky-300">Guia do CJ Gerenciamento</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Fechar ajuda" className="rounded-xl p-2 text-neutral-400 hover:bg-white/10 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-4">
              <p className="text-sm font-bold">Olá! 👋 Bem-vindo ao CJ Gerenciamento.</p>
              <p className="mt-2 text-xs leading-5 text-neutral-300">
                Posso apresentar as funções da aplicação e ajudar-te a descobrir onde gerir máquinas, sessões, vendas e relatórios.
              </p>

              <button onClick={() => { setOpen(false); onStartGuide(); }} className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-sky-400/30 bg-sky-400/10 p-3 text-left transition hover:bg-sky-400/20">
                <BookOpen size={20} className="shrink-0 text-sky-300" />
                <span className="flex-1">
                  <span className="block text-sm font-bold">Começar apresentação</span>
                  <span className="mt-1 block text-[11px] text-neutral-400">Guia passo a passo pela aplicação</span>
                </span>
                <ChevronRight size={17} className="text-sky-300" />
              </button>

              {isOwner && (
                <button onClick={() => { setOpen(false); onOpenAI(); }} className="mt-2 flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition hover:bg-white/10">
                  <MessageCircle size={20} className="shrink-0 text-emerald-300" />
                  <span className="flex-1">
                    <span className="block text-sm font-bold">Conversar com a IA</span>
                    <span className="mt-1 block text-[11px] text-neutral-400">Abrir o assistente inteligente</span>
                  </span>
                  <ChevronRight size={17} className="text-neutral-400" />
                </button>
              )}

              <div className="mt-4 flex items-center gap-2 text-[10px] text-neutral-500">
                <Sparkles size={13} className="text-sky-300" />
                Ajuda rápida, sempre disponível.
              </div>
            </div>
          </section>
        )}

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? "Fechar assistente CJ" : "Abrir assistente CJ"}
          aria-expanded={open}
          className="cj-bot-float cj-bot-glow relative grid h-[68px] w-[68px] place-items-center rounded-[25px] border border-sky-200/70 bg-gradient-to-br from-white via-slate-100 to-sky-200 text-slate-900 shadow-xl transition active:scale-95"
        >
          <span className="absolute -inset-1 -z-10 rounded-[28px] bg-sky-400/20 blur-md" />
          <svg viewBox="0 0 64 64" className="h-[58px] w-[58px]" role="img" aria-label="Robô CJ branco com olhos azuis">
            <defs>
              <linearGradient id="cjBotHead" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="65%" stopColor="#e7f4ff" />
                <stop offset="100%" stopColor="#91c8ec" />
              </linearGradient>
              <linearGradient id="cjBotBody" x1="0" y1="0" x2="0.8" y2="1">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#a8d9f5" />
              </linearGradient>
              <filter id="cjBotEyeGlow">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <path d="M32 5v6" stroke="#6abff5" strokeWidth="3" strokeLinecap="round" />
            <circle cx="32" cy="4" r="3" fill="#00c8ff" />
            <rect x="8" y="13" width="48" height="34" rx="13" fill="url(#cjBotHead)" stroke="#9bc8e8" strokeWidth="1.4" />
            <path d="M13 23Q16 15 25 15" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
            <rect x="3" y="25" width="6" height="12" rx="3" fill="#80c9f4" />
            <rect x="55" y="25" width="6" height="12" rx="3" fill="#80c9f4" />
            <rect x="17" y="24" width="10" height="9" rx="4.5" fill="#078bff" filter="url(#cjBotEyeGlow)" />
            <rect x="37" y="24" width="10" height="9" rx="4.5" fill="#078bff" filter="url(#cjBotEyeGlow)" />
            <path d="M26 39Q32 43 38 39" fill="none" stroke="#63a9d8" strokeWidth="2" strokeLinecap="round" />
            <rect x="18" y="48" width="28" height="13" rx="6" fill="url(#cjBotBody)" stroke="#8fc7ed" strokeWidth="1.2" />
            <rect x="27" y="51" width="10" height="4" rx="2" fill="#08baff" />
            <path d="M15 52l-5 4M49 52l5 4" stroke="#91c8ec" strokeWidth="4" strokeLinecap="round" />
          </svg>
          <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-400" />
        </button>
      </div>
    </>
  );
}
