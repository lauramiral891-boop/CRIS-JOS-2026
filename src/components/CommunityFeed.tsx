import { useCallback, useEffect, useState } from "react";
import { ADM_EMAIL, cloudUid } from "../lib/cloud";
import { canModerate, createPost, deletePost, ensureProfile, listMembers, listPosts } from "../lib/commApi";
import type { Member, PostRow } from "../lib/commApi";
import Composer from "./Composer";
import GroupHeader from "./GroupHeader";
import PhotoViewer from "./PhotoViewer";
import PostCard from "./PostCard";

type Props = { email: string; name: string; photo: string; q: string };
type View = { photos: string[]; start: number } | null;

export default function CommunityFeed({ email, name, photo, q }: Props) {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [err, setErr] = useState("");
  const [view, setView] = useState<View>(null);
  const me = cloudUid(email);
  const mod = canModerate();

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([listPosts(email), listMembers(email)]);
    if (a.ok) {
      setPosts(a.data ?? []);
      setErr("");
    } else {
      setErr(a.error);
    }
    if (b.ok) setMembers(b.data ?? []);
  }, [email]);

  useEffect(() => {
    let off = false;
    void ensureProfile(email, name, photo).then(() => {
      if (!off) void load();
    });
    const t = setInterval(() => void load(), 20000);
    return () => {
      off = true;
      clearInterval(t);
    };
  }, [email, name, photo, load]);

  const publish = async (text: string, files: File[]) => {
    const r = await createPost(email, text, files);
    if (!r.ok) return r.error;
    void load();
    return "";
  };

  const remove = async (p: PostRow) => {
    if (!window.confirm("Apagar esta publicação?")) return;
    const asAdm = p.author !== me && mod;
    const r = await deletePost(asAdm ? ADM_EMAIL : email, p);
    if (!r.ok) return setErr(r.error);
    void load();
  };

  const n = q.trim().toLowerCase();
  const shown = n
    ? posts.filter((p) => p.body.toLowerCase().includes(n) || (p.cj_profiles?.name ?? "").toLowerCase().includes(n))
    : posts;

  return (
    <div className="space-y-3">
      <GroupHeader members={members} />
      <Composer name={name} photo={photo} onPublish={publish} />
      {err && <p className="rounded-xl bg-[#FF4D6D]/10 p-2.5 text-center text-[12px] text-[#FF8FA3]">{err}</p>}
      {shown.length === 0 && !err && (
        <p className="py-8 text-center text-[13px] text-neutral-500">Ainda sem publicações. Seja o primeiro!</p>
      )}
      {shown.map((p) => (
        <PostCard key={p.id} p={p} canDelete={p.author === me || mod}
          onDelete={() => void remove(p)} onOpen={(photos, start) => setView({ photos, start })} />
      ))}
      {view && <PhotoViewer photos={view.photos} start={view.start} onClose={() => setView(null)} />}
    </div>
  );
}
