import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Avatar } from "./PostBits";

type Props = {
  name: string;
  photo?: string | null;
  bio?: string | null;
  since?: string;
  isMe: boolean;
  count: number;
  onBack: () => void;
  onSaveBio: (bio: string) => Promise<string>;
};

export default function ProfileHeader(p: Props) {
  const [edit, setEdit] = useState(false);
  const [bio, setBio] = useState(p.bio ?? "");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const since = p.since ? new Date(p.since).toLocaleDateString("pt-PT") : "";

  const save = async () => {
    setBusy(true);
    setErr("");
    const e = await p.onSaveBio(bio);
    setBusy(false);
    if (e) return setErr(e);
    setEdit(false);
  };

  return (
    <div className="mx-3 mt-3 overflow-hidden rounded-2xl border border-[#00FF88]/20 bg-[#0a1a14]">
      <div className="relative h-28 bg-gradient-to-br from-[#00FF88]/35 via-[#0a1a14] to-[#00E5FF]/25">
        <button onClick={p.onBack} aria-label="Voltar"
          className="absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/50">
          <ChevronLeft size={18} />
        </button>
      </div>
      <div className="px-4 pb-4">
        <div className="-mt-12 w-fit rounded-full border-4 border-[#0a1a14]">
          <Avatar name={p.name} photo={p.photo} size={96} />
        </div>
        <h2 className="mt-2 font-display text-[22px] font-extrabold leading-tight">{p.name}</h2>
        <p className="text-[12px] text-neutral-400">
          {since && `Membro desde ${since} · `}
          {p.count} {p.count === 1 ? "publicação" : "publicações"} nas últimas 24h
        </p>

        {!edit && p.bio && <p className="mt-2 text-[13.5px] text-neutral-200">{p.bio}</p>}
        {!edit && !p.bio && p.isMe && <p className="mt-2 text-[12.5px] text-neutral-500">Ainda sem bio.</p>}
        {!edit && p.isMe && (
          <button onClick={() => { setBio(p.bio ?? ""); setEdit(true); }}
            className="mt-3 rounded-xl bg-white/10 px-4 py-2 text-[12.5px] font-bold">
            Editar bio
          </button>
        )}
        {edit && (
          <div className="mt-3 space-y-2">
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={200}
              placeholder="Fala um pouco sobre ti…"
              className="w-full resize-none rounded-xl bg-black/30 px-3 py-2 text-[13.5px] outline-none placeholder:text-neutral-500" />
            {err && <p className="text-[12px] text-[#FF8FA3]">{err}</p>}
            <div className="flex gap-2">
              <button onClick={() => void save()} disabled={busy}
                className="flex-1 rounded-xl bg-[#00FF88] py-2 text-[12.5px] font-extrabold text-black disabled:opacity-40">
                {busy ? "A guardar…" : "Guardar"}
              </button>
              <button onClick={() => setEdit(false)}
                className="flex-1 rounded-xl bg-white/10 py-2 text-[12.5px] font-bold">Cancelar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
