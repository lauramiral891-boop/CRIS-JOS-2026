import { ADM_EMAIL, cloudRest, cloudUid, hasSession } from "./cloud";
import type { Res } from "./cloud";

export interface PostRow {
  id: string;
  author: string;
  body: string;
  media: string[];
  created_at: string;
  expires_at: string;
  cj_profiles: { name: string; photo: string | null } | null;
}

export const canModerate = () => hasSession(ADM_EMAIL);

export async function ensureProfile(email: string, name: string): Promise<Res<void>> {
  const id = cloudUid(email);
  if (!id) return { ok: false, error: "Sem sessão na nuvem." };
  return cloudRest<void>(email, "/rest/v1/cj_profiles", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: { id, name: name.trim().slice(0, 60) || "Jogador" },
  });
}

const SEL = "id,author,body,media,created_at,expires_at,cj_profiles(name,photo)";

export const listPosts = (email: string) =>
  cloudRest<PostRow[]>(email, `/rest/v1/cj_posts?select=${SEL}&order=created_at.desc&limit=50`);

export async function createPost(email: string, body: string): Promise<Res<void>> {
  const author = cloudUid(email);
  if (!author) return { ok: false, error: "Sem sessão na nuvem." };
  return cloudRest<void>(email, "/rest/v1/cj_posts", {
    method: "POST",
    prefer: "return=minimal",
    body: { author, body: body.trim().slice(0, 2000) },
  });
}

export const deletePost = (email: string, id: string) =>
  cloudRest<void>(email, `/rest/v1/cj_posts?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    prefer: "return=minimal",
  });
