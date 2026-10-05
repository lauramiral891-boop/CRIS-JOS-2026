import { FileText, Wallet } from "lucide-react";
import type { Transaction } from "../lib/types";
import { sod, addDays } from "../lib/dates";
import { clockHM, formatAOA } from "../lib/format";
import { NeonCard } from "./shared";
import { cn } from "../utils/cn";

/** Movimentos de hoje registados por uma pessoa (funcionário ou proprietário). */
export function todaysOf(txs: Transaction[], actorId: string, now: number): Transaction[] {
  const from = sod(new Date(now)).getTime();
  const to = addDays(sod(new Date(now)), 1).getTime();
  return txs.filter((t) => t.actorId === actorId && t.ts >= from && t.ts < to).sort((a, b) => b.ts - a.ts);
}

export const sumTx = (list: Transaction[]) => {
  const income = list.filter((t) => t.type === "in").reduce((a, t) => a + t.value, 0);
  const expense = list.filter((t) => t.type === "out").reduce((a, t) => a + t.value, 0);
  return { income, expense, net: income - expense };
};

/** "A minha caixa de hoje": tudo o que o funcionário registou hoje e quanto dinheiro isso soma. */
export default function MyCashCard({ mine, onSendPdf }: { mine: Transaction[]; onSendPdf: () => void }) {
  const t = sumTx(mine);
  return (
    <div className="px-4">
      <NeonCard className="border-[#00FF88]/25 bg-gradient-to-br from-[#00FF88]/[0.08] to-transparent p-4">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-400"><Wallet size={13} /> A minha caixa de hoje</p>
          <span className="text-[11px] font-semibold text-neutral-500">{mine.length} movimento{mine.length === 1 ? "" : "s"}</span>
        </div>
        <p className="mt-1 font-display text-[34px] font-extrabold leading-none text-[#00FF88]">{formatAOA(t.net)}</p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
          <div className="rounded-xl bg-black/25 p-2"><span className="block text-neutral-500">Entradas</span><b className="text-[#00FF88]">+ {formatAOA(t.income)}</b></div>
          <div className="rounded-xl bg-black/25 p-2"><span className="block text-neutral-500">Saídas</span><b className="text-[#FF8FA3]">- {formatAOA(t.expense)}</b></div>
        </div>

        {mine.length > 0 ? (
          <ul className="mt-3 space-y-1.5">
            {mine.slice(0, 5).map((x) => (
              <li key={x.id} className="flex items-center justify-between gap-2 text-[12px]">
                <span className="min-w-0 truncate text-neutral-300">{x.label}</span>
                <span className={cn("shrink-0 font-bold", x.type === "in" ? "text-[#00FF88]" : "text-[#FF8FA3]")}>{x.type === "in" ? "+" : "-"} {formatAOA(x.value)} <span className="font-medium text-neutral-500">{clockHM(x.ts)}</span></span>
              </li>
            ))}
            {mine.length > 5 && <li className="text-[11px] text-neutral-500">+ {mine.length - 5} movimentos anteriores</li>}
          </ul>
        ) : (
          <p className="mt-3 text-[12px] text-neutral-500">Ainda não registou nada hoje. Cada sessão, venda ou recarga que fizer aparece aqui.</p>
        )}

        <button onClick={onSendPdf} disabled={mine.length === 0}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 text-[12.5px] font-extrabold uppercase tracking-wider text-black transition active:scale-[0.98] disabled:opacity-40">
          <FileText size={15} /> Enviar a minha caixa (PDF)
        </button>
      </NeonCard>
    </div>
  );
}
