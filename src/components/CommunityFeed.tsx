import { useCallback, useEffect, useMemo, useState } from "react";
import { ADM_EMAIL, cloudUid } from "../lib/cloud";
import {
  canModerate, createComment, createPost, deleteComment, deletePost, ensureProfile,
  listComments, listMembers, listPosts, listReactions, saveBio, setReaction, sweepFiles,
} from "../lib/commApi";
import type { CommentRow, Member, PostRow, ReactionRow, Target } from "../lib/commApi";
import CommentsSheet from "./CommentsSheet";
import Composer from "./Composer";
import GroupHeader from "./GroupHeader";
import PhotoViewer from "./PhotoViewer";
import PostCard from "./PostCard";
import ProfileHeader from "./ProfileHeader";

type Props = { email: string; name: string; photo: string; q: string };
type View = { photos: string[]; start: number } | null;

export default function CommunityFeed({ email, name, photo, q }: Props) {
  const [rawPosts, setRawPosts] = useState<PostRow[]>([]);
  const [rawComments, setRawComments] = useState<CommentRow[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [reactions, setReactions] = useState<ReactionRow[]>([]);
  const [openId, setOpenId] = useState("");
  const [profileId, setProfileId] = useState("");
  const [err, setErr] = useState("");
  const [view, setView] = useState<View>(null);
  const [top, setTop] = useState(false);
  const me = cloudUid(email);
  const mod = canModerate();

  const photoOf = useMemo(() => {
    const m = new Map<string, string | null>();
    members.forEach((x) => m.set(x.id, x.photo));
    return m;
  }, [members]);

  const posts = useMemo(
    () => rawPosts.map((p) => ({
      ...p,
      cj_profiles: { name: p.cj_profiles?.name ?? "Jogador", photo: photoOf.get(p.author) ?? null },
    })),
    [rawPosts, photoOf],
  );
  const comments = useMemo(
    () => rawComments.map((c) => ({
      ...c,
      cj_profiles: { name: c.cj_profiles?.name ?? "Jogador", photo: photoOf.get(c.author) ?? null },
    })),
    [rawComments, photoOf],
  );

  const loadMembers = useCallback(async () => {
    const r = await listMembers(email);
    if (r.ok) setMembers(r.data ?? []);
  }, [email]);

  const load = useCallback(async () => {
    if (document.hidden) return;
    const [a, c, d] = await Promise.all([listPosts(email), listReactions(email), listComments(email)]);
    if (a.ok) {
      setRawPosts(a.data ?? []);
      setErr("");
    } else {
      setErr(a.error);
    }
    if (c.ok) setReactions(c.data ?? []);
    if (d.ok) setRawComments(d.data ?? []);
  }, [email]);

  useEffect(() => {
    let off = false;
    void ensureProfile(email, name, photo).then(() => {
      if (off) return;
      void loadMembers();
      void load();
      void sweepFiles(email);
    });
    const t1 = setInterval(() => void load(), 20000);
    const t2 = setInterval(() => void loadMembers(), 600000);
    return () => {
      off = true;
      clearInterval(t1);
      clearInterval(t2);
    };
  }, [email, name, photo, load, loadMembers]);

  const publish = async (text: string, files: File[]) => {
    const r = await createPost(email, text, files);
    if (!r.ok) return r.error;
    void load();
    return "";
  };

  const removePost = async (p: PostRow) => {
    if (!window.confirm("Apagar esta publicação?")) return;
    const r = await deletePost(p.author !== me && mod ? ADM_EMAIL : email, p);
    if (!r.ok) return setErr(r.error);
    void load();
  };

  const react = async (t: Target, emoji: string) => {
    const mine = reactions.find(
      (r) => r.user_id === me && (t.post ? r.post_id === t.post : r.comment_id === t.comment),
    );
    const r = await setReaction(email, t, emoji, mine);
    if (!r.ok) return setErr(r.error);
    void load();
  };

  const sendComment = async (postId: string, body: string, parent?: string) => {
    const r = await createComment(email, postId, body, parent);
    if (!r.ok) return r.error;
    await load();
    return "";
  };

  const removeComment = async (c: CommentRow) => {
    if (!window.confirm("Apagar este comentário?")) return;
    const r = await deleteComment(c.author !== me && mod ? ADM_EMAIL : email, c.id);
    if (!r.ok) return setErr(r.error);
    void load();
  };

  const saveMyBio = async (bio: string) => {
    const r = await saveBio(email, bio);
    if (!r.ok) return r.error;
    await loadMembers();
    return "";
  };

  const n = q.trim().toLowerCase();
  const inProfile = !!profileId;
  const base = inProfile ? posts.filter((p) => p.author === profileId) : posts;
  const shown = n && !inProfile
    ? base.filter((p) => p.body.toLowerCase().includes(n) || p.cj_profiles.name.toLowerCase().includes(n))
    : base;
  const score = (id: string) => reactions.filter((r) => r.post_id === id).length + comments.filter((c) => c.post_id === id).length;
  const ordered = top ? [...shown].sort((a, b) => score(b.id) - score(a.id)) : shown;
  const openPost = posts.find((p) => p.id === openId);
  const prof = members.find((m) => m.id === profileId);
  const profName = prof?.name ?? posts.find((p) => p.author === profileId)?.cj_profiles.name ?? "Jogador";
  const profPhoto = profileId === me && photo ? photo : prof?.photo ?? null;

  return (
    <div className="space-y-2">
      {inProfile ? (
        <ProfileHeader name={profName} photo={profPhoto} bio={prof?.bio} since={prof?.created_at}
          isMe={profileId === me} count={base.length} onBack={() => setProfileId("")} onSaveBio={saveMyBio} />
      ) : (
        <>
          <GroupHeader members={members} />
          <Composer name={name} photo={photo} onPublish={publish} />
        </>
      )}
      <div className="flex items-center justify-between bg-[#0e1512] px-4 py-3">
        <span className="text-[16px] font-extrabold">{top ? "Mais populares" : "Mais recentes"}</span>
        <button onClick={() => setTop((v) => !v)} className="text-[13px] font-bold uppercase text-neutral-400">Ordenar</button>
      </div>
      {err && <p className="mx-3 rounded-xl bg-[#FF4D6D]/10 p-2.5 text-center text-[12px] text-[#FF8FA3]">{err}</p>}
      {shown.length === 0 && !err && (
        <p className="py-8 text-center text-[13px] text-neutral-500">
          {inProfile ? "Sem publicações." : "Ainda sem publicações. Seja o primeiro!"}
        </p>
      )}
      {ordered.map((p) => (
        <PostCard key={p.id} p={p} me={me}
          rs={reactions.filter((r) => r.post_id === p.id)}
          nComments={comments.filter((c) => c.post_id === p.id).length}
          canDelete={p.author === me || mod}
          onDelete={() => void removePost(p)}
          onOpen={(photos, start) => setView({ photos, start })}
          onReact={(e) => void react({ post: p.id }, e)}
          onComments={() => setOpenId(p.id)}
          onProfile={(id) => setProfileId(id)} />
      ))}
      {view && <PhotoViewer photos={view.photos} start={view.start} onClose={() => setView(null)} />}
      {openPost && (
        <CommentsSheet post={openPost} me={me} mod={mod} name={name} photo={photo}
          comments={comments.filter((c) => c.post_id === openPost.id)}
          reactions={reactions.filter((r) => r.post_id === openPost.id || comments.some((c) => c.id === r.comment_id && c.post_id === openPost.id))}
          onSend={(body, parent) => sendComment(openPost.id, body, parent)}
          onDelete={(c) => void removeComment(c)}
          onReact={(t, e) => void react(t, e)}
          onProfile={(id) => { setOpenId(""); setProfileId(id); }}
          onClose={() => setOpenId("")} />
      )}
    </div>
  );
}
