import { ADM_EMAIL, cloudRemoveFiles, cloudRest, cloudUid, cloudUpload, hasSession } from "./cloud";
import type { Res } from "./cloud";
import { compressFile, thumbFromDataUrl } from "./imageCompress";

export interface PostRow {
  id: string;
  author: string;
  body: string;
  media: string[];
  created_at: string;
  expires_at: string;
  cj_profiles: { name: string; photo: string | null } | null;
}
export interface Member { id: string; name: string; photo: string | null; bio?: string | null; created_at?: string }

export const canModerate = () => hasSession(ADM_EMAIL);

const newId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  const h = () => Math.floor(Math.random() * 65536).toString(16).padStart(4, "0");
  return `${h()}${h()}-${h()}-4${h().slice(1)}-a${h().slice(1)}-${h()}${h()}${h()}`;
};

const MARK = "/object/public/community/";
const pathsOf = (media: string[]) =>
  (media ?? []).map((u) => u.split(MARK)[1]).filter((x): x is string => !!x);

export async function ensureProfile(email: string, name: string, photo?: string): Promise<Res<void>> {
  const id = cloudUid(email);
  if (!id) return { ok: false, error: "Sem sessão na nuvem." };
  let thumb = "";
  if (photo) {
    try { thumb = await thumbFromDataUrl(photo); } catch { thumb = ""; }
  }
  return cloudRest<void>(email, "/rest/v1/cj_profiles", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: { id, name: name.trim().slice(0, 60) || "Jogador", ...(thumb ? { photo: thumb } : {}) },
  });
}

const SEL = "id,author,body,media,created_at,expires_at,cj_profiles(name)";

export const listPosts = (email: string) =>
  cloudRest<PostRow[]>(email, `/rest/v1/cj_posts?select=${SEL}&order=created_at.desc&limit=50`);

export const listMembers = (email: string) =>
  cloudRest<Member[]>(email, "/rest/v1/cj_profiles?select=id,name,photo,bio,created_at&order=created_at.desc&limit=150");

export async function createPost(email: string, body: string, files: File[]): Promise<Res<void>> {
  const author = cloudUid(email);
  if (!author) return { ok: false, error: "Sem sessão na nuvem." };
  const id = newId();
  const media: string[] = [];
  const done: string[] = [];
  for (let i = 0; i < files.length; i++) {
    let blob: Blob;
    try {
      blob = await compressFile(files[i]);
    } catch {
      await cloudRemoveFiles(email, done);
      return { ok: false, error: "Não foi possível preparar uma das fotos." };
    }
    const path = `${author}/${id}/${i}.jpg`;
    const up = await cloudUpload(email, path, blob);
    if (!up.ok) {
      await cloudRemoveFiles(email, done);
      return { ok: false, error: up.error };
    }
    done.push(path);
    media.push(up.data);
  }
  const r = await cloudRest<void>(email, "/rest/v1/cj_posts", {
    method: "POST",
    prefer: "return=minimal",
    body: { id, author, body: body.trim().slice(0, 2000), media },
  });
  if (!r.ok) await cloudRemoveFiles(email, done);
  return r;
}

export async function deletePost(email: string, p: PostRow): Promise<Res<void>> {
  const r = await cloudRest<void>(email, `/rest/v1/cj_posts?id=eq.${encodeURIComponent(p.id)}`, {
    method: "DELETE",
    prefer: "return=minimal",
  });
  if (r.ok) await cloudRemoveFiles(email, pathsOf(p.media));
  return r;
}

export interface ReactionRow {
  id: string;
  post_id: string | null;
  comment_id: string | null;
  user_id: string;
  emoji: string;
}
export interface CommentRow {
  id: string;
  post_id: string;
  parent_id: string | null;
  author: string;
  body: string;
  created_at: string;
  expires_at: string;
  cj_profiles: { name: string; photo: string | null } | null;
}
export type Target = { post?: string; comment?: string };

export const listReactions = (email: string) =>
  cloudRest<ReactionRow[]>(email, "/rest/v1/cj_reactions?select=id,post_id,comment_id,user_id,emoji&limit=3000");

const CSEL = "id,post_id,parent_id,author,body,created_at,expires_at,cj_profiles(name)";

export const listComments = (email: string) =>
  cloudRest<CommentRow[]>(email, `/rest/v1/cj_comments?select=${CSEL}&order=created_at.asc&limit=1500`);

export async function createComment(email: string, postId: string, body: string, parent?: string): Promise<Res<void>> {
  const author = cloudUid(email);
  if (!author) return { ok: false, error: "Sem sessão na nuvem." };
  return cloudRest<void>(email, "/rest/v1/cj_comments", {
    method: "POST",
    prefer: "return=minimal",
    body: { post_id: postId, parent_id: parent ?? null, author, body: body.trim().slice(0, 1000) },
  });
}

export const deleteComment = (email: string, id: string) =>
  cloudRest<void>(email, `/rest/v1/cj_comments?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    prefer: "return=minimal",
  });

export async function setReaction(email: string, t: Target, emoji: string, mine?: ReactionRow): Promise<Res<void>> {
  const uid = cloudUid(email);
  if (!uid) return { ok: false, error: "Sem sessão na nuvem." };
  if (mine) {
    const url = `/rest/v1/cj_reactions?id=eq.${encodeURIComponent(mine.id)}`;
    if (mine.emoji === emoji) return cloudRest<void>(email, url, { method: "DELETE", prefer: "return=minimal" });
    return cloudRest<void>(email, url, { method: "PATCH", prefer: "return=minimal", body: { emoji } });
  }
  return cloudRest<void>(email, "/rest/v1/cj_reactions", {
    method: "POST",
    prefer: "return=minimal",
    body: { post_id: t.post ?? null, comment_id: t.comment ?? null, user_id: uid, emoji },
  });
}

export async function saveBio(email: string, bio: string): Promise<Res<void>> {
  const id = cloudUid(email);
  if (!id) return { ok: false, error: "Sem sessão na nuvem." };
  return cloudRest<void>(email, `/rest/v1/cj_profiles?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: { bio: bio.trim().slice(0, 200) },
  });
}
