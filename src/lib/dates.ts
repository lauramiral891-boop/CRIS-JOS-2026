export const WEEKDAYS_SHORT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
export const WEEKDAYS_FULL = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
export const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
export const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const p2 = (n: number) => String(n).padStart(2, "0");

export const ymd = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;

export const parseYmd = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

/** 0 = segunda ... 6 = domingo */
export const mondayIndex = (d: Date) => (d.getDay() + 6) % 7;

export const sod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const startOfWeek = (d: Date) => addDays(sod(d), -mondayIndex(d));

export const isoWeek = (d: Date) => {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - y0.getTime()) / 86400000 + 1) / 7);
};

export const dm = (d: Date) => `${p2(d.getDate())}/${p2(d.getMonth() + 1)}`;

export const bookingTs = (date: string, time: string) => {
  const [h, m] = time.split(":").map(Number);
  const d = parseYmd(date);
  d.setHours(h || 0, m || 0, 0, 0);
  return d.getTime();
};

export const longDate = (d: Date, lang: string) => {
  try {
    return d.toLocaleDateString(lang, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  } catch {
    return d.toDateString();
  }
};

export const shortDate = (d: Date, lang: string) => {
  try {
    return d.toLocaleDateString(lang, { weekday: "short", day: "2-digit", month: "short" });
  } catch {
    return d.toDateString();
  }
};

export const timeHMS = (d: Date) => `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;

/** A Game House está aberta neste momento? (suporta horário que passa da meia-noite) */
export function isOpenNow(c: { openTime: string; closeTime: string; openDays: number[] }, now: Date) {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const open = toMin(c.openTime);
  const close = toMin(c.closeTime);
  const cur = now.getHours() * 60 + now.getMinutes();
  const day = now.getDay();
  if (open === close) return c.openDays.includes(day);
  if (open < close) return c.openDays.includes(day) && cur >= open && cur < close;
  if (cur >= open) return c.openDays.includes(day);
  if (cur < close) return c.openDays.includes((day + 6) % 7);
  return false;
}
