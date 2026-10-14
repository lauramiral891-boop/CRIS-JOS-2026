import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Avatar } from "./PostBits";

type Props = { name: string; photo: string; onPublish: (text: string, files: File[]) => Promise<string> };
const MAX = 6;

export default function Composer({ name, photo, onPublish }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);

  const pick = (l: FileList | null) => {
    if (!l) return;
    setFiles((x) => [...x, ...Array.from(l)].slice(0, MAX));
  };

  const send = async () => {
    if (busy || (!text.trim() && files.length === 0)) return;
    setBusy(true);
    setErr("");
    const e = await onPublish(text, files);
    setBusy(false);
    if (e) return setErr(e);
    setText("");
    setFiles([]);
    setOpen(false);
  };

  return (
    <>
      <input ref={input} type="file" accept="image/*" multiple hidden
        onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
      <div className="flex items-center gap-3 rounded-2xl border border-[#00FF88]/30 bg-[#0a1a14] p-3">
        <Avatar name={name} photo={photo} size={42} />
        <button onClick={() => setOpen(true)}
          className="flex-1 rounded-full bg-black/30 px-4 py-2.5 text-left text-[13.5px] text-neutral-400">
          Escreve algo…
        </button>
        <button onClick={() => { setOpen(true); input.current?.click(); }}
          className="flex flex-col items-center text-[10.5px] text-neutral-300">
          <ImagePlus size={22} className="text-[#00FF88]" />Foto
        </button>
      </div>

      {open && (
        <div className="fade absolute inset-0 z-50 flex flex-col bg-[#050d0a] text-white">
          <div style={{ height: "env(safe-area-inset-top, 0px)" }} />
          <div className="flex items-center gap-3 border-b border-white/10 px-3 py-2.5">
            <button onClick={() => setOpen(false)} aria-label="Fechar"
              className="grid h-9 w-9 place-items-center rounded-full bg-white/10">
              <X size={18} />
            </button>
            <h3 className="flex-1 font-display text-[17px] font-extrabold">Criar publicação</h3>
            <button onClick={send} disabled={busy || (!text.trim() && files.length === 0)}
              className="rounded-full bg-[#00FF88] px-5 py-2 text-[13px] font-extrabold text-black disabled:opacity-40">
              {busy ? "A publicar…" : "Publicar"}
            </button>
          </div>
          <div className="thin-scroll flex-1 space-y-3 overflow-y-auto p-4">
            <div className="flex items-center gap-3">
              <Avatar name={name} photo={photo} size={40} />
              <p className="text-[14px] font-bold">{name}</p>
            </div>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} maxLength={2000}
              placeholder="Escreve algo…"
              className="w-full resize-none bg-transparent text-[15px] outline-none placeholder:text-neutral-500" />
            {urls.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {urls.map((u, i) => (
                  <div key={u} className="relative">
                    <img src={u} alt="" className="aspect-square w-full rounded-xl object-cover" />
                    <button onClick={() => setFiles((x) => x.filter((_, j) => j !== i))} aria-label="Tirar"
                      className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/70">
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {files.length < MAX && (
              <button onClick={() => input.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#00FF88]/40 py-3 text-[13px] font-bold text-[#00FF88]">
                <ImagePlus size={17} />Adicionar fotos ({files.length}/{MAX})
              </button>
            )}
            {err && <p className="rounded-xl bg-[#FF4D6D]/10 p-2.5 text-center text-[12px] text-[#FF8FA3]">{err}</p>}
            <p className="text-center text-[10.5px] text-neutral-500">Tudo some sozinho 24h depois.</p>
          </div>
        </div>
      )}
    </>
  );
}
