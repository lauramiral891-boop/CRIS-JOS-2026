import shutil

A = "src/lib/adm.ts"
B = "src/App.tsx"
a = open(A).read()
b = open(B).read()
assert "loadSeenItems" not in a, "ja aplicado"
shutil.copy(A, A + ".bak-anuncios")
shutil.copy(B, B + ".bak-anuncios")

# 1) adm.ts: lista de jogos/anuncios ja notificados por conta
a += '''
/** Jogos e anúncios do ADM já notificados por cada casa. null = primeira vez (só regista, não avisa). */
const seenItemsKey = (accountId: string) => `cjg-adm-seen-items:${accountId}`;
export const loadSeenItems = (accountId: string): string[] | null => {
  try {
    const raw = localStorage.getItem(seenItemsKey(accountId));
    return raw === null ? null : (JSON.parse(raw) as string[]);
  } catch { return null; }
};
export const saveSeenItems = (accountId: string, ids: string[]) => {
  try { localStorage.setItem(seenItemsKey(accountId), JSON.stringify(ids.slice(-300))); } catch { /* ignora */ }
};
'''
open(A, "w").write(a)

# 2) App.tsx: import
old_imp = 'import { ADM_EVENT, loadGlobalAdm, loadSeenNotices, saveGlobalAdm, saveSeenNotices } from "./lib/adm";'
assert b.count(old_imp) == 1, "import nao encontrado"
b = b.replace(old_imp, 'import { ADM_EVENT, loadGlobalAdm, loadSeenItems, loadSeenNotices, saveGlobalAdm, saveSeenItems, saveSeenNotices } from "./lib/adm";')

# 3) App.tsx: efeito que avisa jogos e anuncios novos
anchor = "  }, [gadm.notices]);"
assert b.count(anchor) == 1, "ancora dos avisos nao encontrada"
effect = '''

  /* Jogos e anúncios novos do ADM: notificação uma só vez (na primeira abertura só regista o que já existe) */
  useEffect(() => {
    const seen = loadSeenItems(account.id);
    const items = [
      ...(gadm.games ?? []).filter((g) => g.active).map((g) => ({ key: "g:" + g.id, title: "🎮 Novo jogo: " + g.name, text: g.description, ok: g.createdAt >= account.createdAt })),
      ...(gadm.ads ?? []).filter((x) => x.active).map((x) => ({ key: "a:" + x.id, title: x.title || "Novo anúncio", text: x.text, ok: !!gadm.adsOn })),
    ];
    const keys = items.map((i) => i.key);
    if (seen === null) { saveSeenItems(account.id, keys); return; }
    const fresh = items.filter((i) => !seen.includes(i.key));
    if (!fresh.length) return;
    saveSeenItems(account.id, [...seen, ...keys.filter((k) => !seen.includes(k))]);
    const toNotify = fresh.filter((i) => i.ok);
    if (toNotify.length > 3) broadcast("Novidades da CJ", toNotify.length + " novos jogos e anúncios.");
    else toNotify.forEach((i) => broadcast(i.title, (i.text || "").slice(0, 120)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gadm.games, gadm.ads, gadm.adsOn]);'''
b = b.replace(anchor, anchor + effect)
open(B, "w").write(b)
print("ok")
