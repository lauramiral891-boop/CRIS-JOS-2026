import type { Transaction, TxCategory } from "./types";

export const categoryLabels: Record<TxCategory, string> = {
  sessao: "Sessões de máquinas",
  extensao: "Extensões de tempo",
  recarga: "Recargas de saldo",
  venda: "Vendas de produtos",
  servico: "Serviços (cópias, impressão...)",
  manual: "Outros movimentos",
};

export interface CatRow {
  key: TxCategory;
  label: string;
  income: number;
  expense: number;
  count: number;
}

export function byCategory(txs: Transaction[], from: Date, to: Date): CatRow[] {
  const a = from.getTime();
  const b = to.getTime();
  const map = new Map<TxCategory, CatRow>();
  for (const t of txs) {
    if (t.ts < a || t.ts >= b) continue;
    const key = t.category ?? "manual";
    const row = map.get(key) ?? { key, label: categoryLabels[key] ?? "Outros movimentos", income: 0, expense: 0, count: 0 };
    if (t.type === "in") row.income += t.value;
    else row.expense += t.value;
    row.count += 1;
    map.set(key, row);
  }
  return [...map.values()].sort((x, y) => y.income + y.expense - (x.income + x.expense));
}
