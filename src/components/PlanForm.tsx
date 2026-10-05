import { useState } from "react";
import { Timer, Tag } from "lucide-react";
import { cn } from "../utils/cn";
import type { PlanKind } from "../lib/types";
import { formatAOA } from "../lib/format";

export interface PlanDraft {
  name: string;
  kind: PlanKind;
  price: number;
  minutes?: number;
}

export default function PlanForm({
  onSubmit,
  submitLabel,
  machineName,
}: {
  onSubmit: (p: PlanDraft) => void;
  submitLabel: string;
  machineName?: string;
}) {
  const [kind, setKind] = useState<PlanKind>("timed");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [minutes, setMinutes] = useState("60");
  const [err, setErr] = useState("");

  const priceNum = parseFloat(price.replace(",", "."));
  const minNum = parseInt(minutes, 10);

  const submit = () => {
    if (!name.trim()) return setErr("Dê um nome à opção (ex: Missão, Football).");
    if (!priceNum || priceNum <= 0) return setErr("Indique um preço válido em AOA.");
    if (kind === "timed" && (!minNum || minNum <= 0 || minNum > 1440))
      return setErr("Indique os minutos (1 a 1440).");
    setErr("");
    onSubmit({
      name: name.trim(),
      kind,
      price: priceNum,
      minutes: kind === "timed" ? minNum : undefined,
    });
    setName("");
    setPrice("");
  };

  const field =
    "w-full rounded-xl border border-white/10 bg-[#252525] px-3 py-2.5 text-[13px] outline-none transition focus:border-[#00E5FF]";
  const label = "mb-1 block text-[11px] font-bold uppercase tracking-wider text-neutral-400";

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-[#1e1e1e] p-1.5">
        {([
          { k: "timed", t: "Por tempo", s: "com cronómetro", i: Timer },
          { k: "fixed", t: "Preço fixo", s: "sem cronómetro", i: Tag },
        ] as const).map((o) => (
          <button
            key={o.k}
            type="button"
            onClick={() => setKind(o.k)}
            className={cn(
              "flex flex-col items-center rounded-xl py-2 transition",
              kind === o.k
                ? "bg-[#00E5FF] text-black shadow-[0_0_16px_rgba(0,229,255,0.4)]"
                : "text-neutral-400"
            )}
          >
            <span className="flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-wider">
              <o.i size={13} /> {o.t}
            </span>
            <span className={cn("text-[10px] font-medium", kind === o.k ? "text-black/70" : "text-neutral-600")}>{o.s}</span>
          </button>
        ))}
      </div>

      <label className="block">
        <span className={label}>Nome da opção</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === "timed" ? "Ex: Missão" : "Ex: Football"} className={field} />
      </label>

      <div className={cn("grid gap-2.5", kind === "timed" ? "grid-cols-2" : "grid-cols-1")}>
        <label className="block">
          <span className={label}>Preço (AOA)</span>
          <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="1500" inputMode="decimal" className={field} />
        </label>
        {kind === "timed" && (
          <label className="block">
            <span className={label}>Minutos</span>
            <input value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ""))} placeholder="60" inputMode="numeric" className={field} />
          </label>
        )}
      </div>

      {kind === "timed" && (
        <div className="flex flex-wrap gap-1.5">
          {["15", "30", "45", "60", "90", "120", "180"].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMinutes(m)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-bold transition",
                minutes === m ? "border-[#00E5FF] bg-[#00E5FF]/10 text-[#00E5FF]" : "border-white/10 text-neutral-500"
              )}
            >
              {m} min
            </button>
          ))}
        </div>
      )}

      {(name || price) && (
        <p className="rounded-xl bg-white/[0.04] px-3 py-2 text-[12px] text-neutral-300">
          <span className="font-bold text-white">{machineName ?? "Máquina"}</span> ({name || "…"}) •{" "}
          <span className="font-bold text-[#00FF88]">{priceNum > 0 ? formatAOA(priceNum) : "AOA …"}</span>{" "}
          {kind === "timed" ? `= ${minNum || "…"} minutos` : "• preço fixo, sem cronómetro"}
        </p>
      )}

      {err && <p className="rounded-xl border border-[#FF4D6D]/40 bg-[#FF4D6D]/10 px-3 py-2 text-[12px] font-semibold text-[#FF8FA3]">{err}</p>}

      <button type="button" onClick={submit} className="neon-btn-green w-full rounded-xl bg-[#00FF88] py-3 text-[13px] font-extrabold uppercase tracking-widest text-black transition active:scale-[0.98]">
        {submitLabel}
      </button>
    </div>
  );
}
