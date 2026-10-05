export const fieldCls =
  "w-full rounded-xl border border-white/10 bg-[#252525] px-3 py-2.5 text-[13px] outline-none transition focus:border-[#00E5FF]";

export const labelCls = "mb-1 block text-[11px] font-bold uppercase tracking-wider text-neutral-400";

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[10.5px] text-neutral-500">{hint}</span>}
    </label>
  );
}

export function ErrorBox({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <p className="rounded-xl border border-[#FF4D6D]/40 bg-[#FF4D6D]/10 px-3 py-2 text-[12px] font-semibold text-[#FF8FA3]">
      {msg}
    </p>
  );
}

export function PrimaryButton({
  children, onClick, tone = "green", type = "button", disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tone?: "green" | "cyan" | "red";
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const cls =
    tone === "green"
      ? "bg-[#00FF88] text-black neon-btn-green"
      : tone === "cyan"
      ? "bg-[#00E5FF] text-black neon-btn-cyan"
      : "bg-[#FF4D6D] text-white";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-xl py-3 text-[13px] font-extrabold uppercase tracking-widest transition active:scale-[0.98] disabled:opacity-40 ${cls}`}
    >
      {children}
    </button>
  );
}
