import { useCallback, useEffect, useState } from "react";
import { ADM_EMAIL, cloudUid } from "../lib/cloud";
import { canModerate, createPost, deletePost, ensureProfile, listPosts } from "../lib/commApi";
import type { PostRow } from "../lib/commApi";
import PostCard from "./PostCard";

type Props = { email: string; name: string; q: string };

export default function CommunityFeed({ email, name, q }: Props) {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const me = cloudUid(email);
  const mod = canModerate();

  const load = useCallback(async () => {
    const r = await listPosts(email);
    if (r.ok) {
      setPosts(r.data ?? []);
      setErr("");
    } else {
      setErr(r.error);
    }
  }, [email]);

  useEffect(() => {
    let off = false;
    void ensureProfile(email, name).then(() => {
      if (!off) void load();
    });
    const t = setInterval(() => void load(), 20000);
    return () => {
      off = true;
      clearInterval(t);
    };
  }, [email, name, load]);

  const publish = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    const r = await createPost(email, text);
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    setText("");
    void load();
  };

  const remove = async (p: PostRow) => {
    if (!window.confirm("Apagar esta publicação?")) return;
    const asAdm = p.author !== me && mod;
    const r = await deletePost(asAdm ? ADM_EMAIL : email, p.id);
    if (!r.ok) return setErr(r.error);
    void load();
  };

  const n = q.trim().toLowerCase();
  const shown = n
    ? posts.filter(
        (p) => p.body.toLowerCase().includes(n) || (p.cj_profiles?.name ?? "").toLowerCase().includes(n),
      )
    : posts;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-[#00FF88]/30 bg-[#0a1a14] p-3">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={2000}
          placeholder="Em que está a pensar? Publique para a comunidade…"
          className="w-full resize-none rounded-xl bg-black/30 px-3 py-2 text-[13.5px] outline-none placeholder:text-neutral-500" />
        <button onClick={publish} disabled={busy || !text.trim()}
          className="mt-2 w-full rounded-xl bg-[#00FF88] py-2.5 text-[13px] font-extrabold uppercase text-black active:scale-95 disabled:opacity-40">
          {busy ? "A publicar…" : "Publicar"}
        </button>
        <p className="mt-1.5 text-center text-[10px] text-neutral-500">Tudo some sozinho 24h depois.</p>
      </div>
      {err && (
        <p className="rounded-xl bg-[#FF4D6D]/10 p-2.5 text-center text-[12px] text-[#FF8FA3]">{err}</p>
      )}
      {shown.length === 0 && !err && (
        <p className="py-8 text-center text-[13px] text-neutral-500">Ainda sem publicações. Seja o primeiro!</p>
      )}
      {shown.map((p) => (
        <PostCard key={p.id} p={p} canDelete={p.author === me || mod} onDelete={() => void remove(p)} />
      ))}
    </div>
  );
}
