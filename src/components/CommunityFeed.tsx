import { useCallback, useEffect, useState } from "react";
import { ADM_EMAIL, cloudUid } from "../lib/cloud";
import {
  canModerate, createComment, createPost, deleteComment, deletePost, ensureProfile,
  listComments, listMembers, listPosts, listReactions, setReaction,
} from "../lib/commApi";
import type { CommentRow, Member, PostRow, ReactionRow, Target } from "../lib/commApi";
import CommentsSheet from "./CommentsSheet";
import Composer from "./Composer";
import GroupHeader from "./GroupHeader";
import PhotoViewer from "./PhotoViewer";
import PostCard from "./PostCard";

type Props = { email: string; name: string; photo: string; q: string };
type View = { photos: string[]; start: number } | null;

export default function CommunityFeed({ email, name, photo, q }: Props) {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [reactions, setReactions] = useState<ReactionRow[]>([]);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [openId, setOpenId] = useState("");
  const [err, setErr] = useState("");
  const [view, setView] = useState<View>(null);
  const me = cloudUid(email);
  const mod = canModerate();

  const load = useCallback(async () => {
    const [a, b, c, d] = await Promise.all([
      listPosts(email), listMembers(email), listReactions(email), listComments(email),
    ]);
    if (a.ok) {
      setPosts(a.data ?? []);
      setErr("");
    } else {
      setErr(a.error);
    }
    if (b.ok) setMembers(b.data ?? []);
    if (c.ok) setReactions(c.data ?? []);
    if (d.ok) setComments(d.data ?? []);
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

  const n = q.trim().toLowerCase();
  const shown = n
    ? posts.filter((p) => p.body.toLowerCase().includes(n) || (p.cj_profiles?.name ?? "").toLowerCase().includes(n))
    : posts;
  const openPost = posts.find((p) => p.id === openId);

  return (
    <div className="space-y-3">
      <GroupHeader members={members} />
      <Composer name={name} photo={photo} onPublish={publish} />
      {err && <p className="rounded-xl bg-[#FF4D6D]/10 p-2.5 text-center text-[12px] text-[#FF8FA3]">{err}</p>}
      {shown.length === 0 && !err && (
        <p className="py-8 text-center text-[13px] text-neutral-500">Ainda sem publicações. Seja o primeiro!</p>
      )}
      {shown.map((p) => (
        <PostCard key={p.id} p={p} me={me}
          rs={reactions.filter((r) => r.post_id === p.id)}
          nComments={comments.filter((c) => c.post_id === p.id).length}
          canDelete={p.author === me || mod}
          onDelete={() => void removePost(p)}
          onOpen={(photos, start) => setView({ photos, start })}
          onReact={(e) => void react({ post: p.id }, e)}
          onComments={() => setOpenId(p.id)} />
      ))}
      {view && <PhotoViewer photos={view.photos} start={view.start} onClose={() => setView(null)} />}
      {openPost && (
        <CommentsSheet post={openPost} me={me} mod={mod} name={name} photo={photo}
          comments={comments.filter((c) => c.post_id === openPost.id)}
          reactions={reactions.filter((r) => r.post_id === openPost.id || comments.some((c) => c.id === r.comment_id && c.post_id === openPost.id))}
          onSend={(body, parent) => sendComment(openPost.id, body, parent)}
          onDelete={(c) => void removeComment(c)}
          onReact={(t, e) => void react(t, e)}
          onClose={() => setOpenId("")} />
      )}
    </div>
  );
}
