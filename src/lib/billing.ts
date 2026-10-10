import type { Billing, Payment } from "./types";
import { uid } from "./storage";

export const DAY = 24 * 3600 * 1000;

export type BillStatus = "off" | "ok" | "soon" | "overdue" | "blocked";

export interface BillInfo {
  status: BillStatus;
  daysLeft: number | null; // dias até ao vencimento (negativo = em atraso)
  blockAt: number | null;
}

export function billInfo(b: Billing, now: number): BillInfo {
  if (b.manualBlock) return { status: "blocked", daysLeft: b.dueAt ? Math.ceil((b.dueAt - now) / DAY) : null, blockAt: null };
  if (!b.enabled || b.dueAt == null) return { status: "off", daysLeft: null, blockAt: null };
  const blockAt = b.dueAt + b.graceDays * DAY;
  const daysLeft = Math.ceil((b.dueAt - now) / DAY);
  if (now >= blockAt) return { status: "blocked", daysLeft, blockAt };
  if (now >= b.dueAt) return { status: "overdue", daysLeft, blockAt };
  if (now >= b.dueAt - b.warnDays * DAY) return { status: "soon", daysLeft, blockAt };
  return { status: "ok", daysLeft, blockAt };
}

/** Novo fim de acesso quando um pagamento é confirmado. */
export const extendFrom = (b: Billing, now: number) =>
  Math.max(now, b.dueAt ?? 0) + b.periodDays * DAY;

export function confirmPayment(b: Billing, paymentId: number, now: number): Billing {
  const pay = b.payments.find((p) => p.id === paymentId);
  if (!pay || pay.status !== "pending") return b;
  return {
    ...b,
    enabled: true,
    manualBlock: false,
    dueAt: extendFrom(b, now),
    payments: b.payments.map((p) => (p.id === paymentId ? { ...p, status: "confirmed", decidedAt: now } : p)),
  };
}

export const rejectPayment = (b: Billing, paymentId: number, now: number): Billing => ({
  ...b,
  payments: b.payments.map((p) => (p.id === paymentId && p.status === "pending" ? { ...p, status: "rejected", decidedAt: now } : p)),
});

export const newPayment = (amount: number, method: string, ref: string, status: Payment["status"] = "pending"): Payment => ({
  id: uid(), ts: Date.now(), amount, method, ref, status, decidedAt: status === "pending" ? undefined : Date.now(),
});
