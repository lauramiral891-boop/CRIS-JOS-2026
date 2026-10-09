// Secure Gemini proxy for CJ Gerenciamento.
// Set GEMINI_API_KEY with `supabase secrets set GEMINI_API_KEY=...`.
// The Google key is never sent to the browser or stored in app data.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
// Best-effort per-isolate throttle; production-grade quotas should also be enforced at project/provider level.
const recentRequests = new Map<string, number[]>();

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return json({ error: "Autenticação necessária." }, 401);
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const geminiKey = Deno.env.get("GEMINI_API_KEY") ?? "";
  if (!supabaseUrl || !anonKey || !geminiKey) return json({ error: "O serviço seguro da IA ainda não está configurado." }, 503);

  // Validate the user's access token with Supabase Auth before using the paid/private Gemini key.
  try {
    const authRes = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: authorization },
    });
    if (!authRes.ok) return json({ error: "Sessão inválida ou expirada." }, 401);
    const user = await authRes.json() as { id?: string };
    if (!user.id) return json({ error: "Utilizador não autenticado." }, 401);
    const now = Date.now();
    const recent = (recentRequests.get(user.id) ?? []).filter((ts) => now - ts < 60_000);
    if (recent.length >= 12) return json({ error: "Muitos pedidos de IA num minuto. Aguarde um pouco." }, 429);
    recent.push(now);
    recentRequests.set(user.id, recent);
  } catch {
    return json({ error: "Não foi possível validar a sessão online." }, 503);
  }

  let input: { history?: { role?: string; content?: string }[]; system?: string; search?: boolean; maxOutputTokens?: number; temperature?: number };
  try { input = await req.json(); } catch { return json({ error: "Pedido inválido." }, 400); }
  const history = Array.isArray(input.history) ? input.history.slice(-8) : [];
  const latestQuestion = [...history].reverse().find((item) => item.role !== "assistant")?.content ?? "";
  const normalizedQuestion = latestQuestion.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const detectedSearch = /\b(pesquis\w*|procur\w*|google|internet|fontes?|noticias?|hoje|agora|atual\w*|recent\w*|preco atual|lancament\w*|ultim\w*)\b/i.test(normalizedQuestion);
  const useSearch = input.search === true || detectedSearch;
  // Em pesquisas atuais, enviar apenas a pergunta mais recente e um prompt público.
  // Assim o histórico e os dados privados da Game House não são enviados ao Google.
  const selectedHistory = useSearch ? [{ role: "user", content: latestQuestion }] : history;
  const system = useSearch
    ? "És um assistente de pesquisa rigoroso. Responde em português de Angola. Usa a ferramenta Google Search para verificar informações atuais. Não inventes notícias, datas, números nem URLs. Resume apenas o que as fontes consultadas sustentam. Se não conseguires confirmar algo, declara essa limitação."
    : (typeof input.system === "string" ? input.system.slice(0, 10000) : "Responde em português claro. Não inventes dados.");
  const contents = selectedHistory.map((item) => ({
    role: item.role === "assistant" ? "model" : "user",
    parts: [{ text: String(item.content ?? "").slice(0, 3000) }],
  })).filter((item) => item.parts[0].text.trim());
  if (!contents.length) return json({ error: "Escreva uma pergunta para a IA." }, 400);

  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: system }] },
    contents,
    generationConfig: {
      temperature: Math.min(0.6, Math.max(0, Number(input.temperature ?? 0.35))),
      maxOutputTokens: Math.min(1200, Math.max(100, Number(input.maxOutputTokens ?? 900))),
    },
  };
  if (useSearch) body.tools = [{ google_search: {} }];

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
      body: JSON.stringify(body),
    });
    const payload = await response.json() as {
      candidates?: { content?: { parts?: { text?: string }[] }; groundingMetadata?: { groundingChunks?: { web?: { title?: string; uri?: string } }[] } }[];
      error?: { message?: string };
    };
    if (!response.ok) return json({ error: response.status === 429 ? "A IA está com muitos pedidos. Aguarde e tente novamente." : "A IA não está disponível neste momento." }, response.status === 429 ? 429 : 502);
    const candidate = payload.candidates?.[0];
    const text = (candidate?.content?.parts ?? []).map((part) => part.text ?? "").join("").trim();
    if (!text) return json({ error: "A IA não devolveu uma resposta." }, 502);
    const seen = new Set<string>();
    const sources = (candidate?.groundingMetadata?.groundingChunks ?? []).flatMap((chunk) => {
      const web = chunk.web;
      if (!web?.uri || seen.has(web.uri)) return [];
      seen.add(web.uri);
      return [{ title: web.title ?? "Fonte consultada", url: web.uri }];
    }).slice(0, 6);
    if (useSearch && sources.length === 0) {
      return json({ error: "A pesquisa não devolveu fontes verificáveis. Não é seguro apresentar esta resposta como notícia confirmada. Tente novamente." }, 502);
    }
    return json({ text, sources, searched: useSearch });
  } catch {
    return json({ error: "Sem ligação ao serviço Gemini. Verifique a internet e tente novamente." }, 503);
  }
});
