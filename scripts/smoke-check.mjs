import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const checks = [];
function check(name, fn) { fn(); checks.push(name); }

check('guia contextual existe e guarda progresso por conta', () => {
  const s = read('src/components/OnboardingGuide.tsx');
  assert.match(s, /cjg-guide-v1:/);
  assert.match(s, /seenRooms/);
  assert.match(s, /tab:\$\{tab\}/);
  assert.match(s, /Iniciar tutorial/);
  assert.match(s, /Avançar/);
  assert.match(s, /Voltar/);
  assert.match(s, /Saltar/);
});
check('tutoriais usam separação de conta e papel', () => {
  const s = read('src/App.tsx');
  assert.match(s, /userKey=\{`\$\{account\.id\}:\$\{session\.role\}:/);
  assert.match(s, /data-guide-id=\{t\.id\}/);
  assert.match(read('src/screens/Home.tsx'), /data-guide-id=\{q\.id\}/);
  assert.match(read('src/screens/Finance.tsx'), /data-guide-id="reports"/);
});
check('PDF real usa jsPDF, imagem, assinatura e tabelas de utilização', () => {
  const s = read('src/lib/pdf.ts');
  assert.match(s, /from "jspdf"/);
  assert.match(s, /doc\.addImage\(logoDataUrl/);
  assert.match(s, /Assinatura e contacto de suporte/);
  assert.match(s, /Utilização das máquinas/);
  assert.match(s, /Resumo por funcionário/);
  assert.match(s, /doc\.getNumberOfPages\(\)/);
});
check('partilha valida documento PDF e oferece fallback', () => {
  const s = read('src/components/PdfShareSheet.tsx');
  assert.match(s, /application\/pdf/);
  assert.match(s, /nav\.share/);
  assert.match(s, /doc\.save\(name\)/);
  assert.match(s, /Pré-visualizar/);
});
check('relatórios dos funcionários são filtrados quando não têm acesso financeiro total', () => {
  const s = read('src/App.tsx');
  assert.match(s, /transactions\.filter\(\(t\) => t\.actorId === actor\.id\)/);
  assert.match(s, /machineHistory=\{isOwner \? data\.history : \[\]\}/);
});
check('proxy Gemini exige sessão e pesquisa Google é opcional', () => {
  const s = read('supabase/functions/cj-gemini/index.ts');
  assert.match(s, /Authorization/);
  assert.match(s, /auth\/v1\/user/);
  assert.match(s, /google_search/);
  assert.match(s, /GEMINI_API_KEY/);
});
check('segredos de Gemini não estão embutidos nos ficheiros da aplicação', () => {
  const scanDirs = ['src', 'supabase/functions', 'scripts'];
  const files = [];
  const walk = (dir) => { for (const ent of readdirSync(dir, { withFileTypes: true })) { const p = join(dir, ent.name); if (ent.isDirectory()) walk(p); else if (/\.(ts|tsx|mjs|js|json|md|toml)$/.test(p)) files.push(p); } };
  for (const dir of scanDirs) walk(dir);
  const combined = files.map((p) => readFileSync(p, 'utf8')).join('\n');
  assert.doesNotMatch(combined, /AIza[0-9A-Za-z_-]{30,}/);
  assert.equal(existsSync('.env'), false);
});

check('pesquisa externa minimiza dados privados da casa', () => {
  const s = read('src/lib/assistant.ts');
  const ui = read('src/components/AssistantView.tsx');
  assert.match(s, /includePrivateData = true/);
  assert.match(s, /includePrivateData \? memoryPrompt/);
  assert.match(s, /Não recebeste dados privados da conta/);
  assert.match(ui, /buildSystemPrompt\(ctx, q, mem, !useGoogleSearch\)/);
  assert.match(ui, /requestHistory = useGoogleSearch \? \[{ role: \"user\" as const, content: q }\] : history/);
});

check('perguntas de pesquisa não são desviadas para a memória local', () => {
  const ui = read('src/components/AssistantView.tsx');
  assert.match(ui, /local\?\.exact && !useGoogleSearch/);
  assert.match(ui, /const normalizedQuestion = norm\(q\)/);
  assert.match(ui, /noticias\?/);
  assert.match(ui, /Não consegui concluir a pesquisa nem confirmar fontes verificáveis/);
});

check('backend força Google Search e recusa pesquisa sem fontes verificáveis', () => {
  const edge = read('supabase/functions/cj-gemini/index.ts');
  assert.match(edge, /const useSearch = input\.search === true \|\| detectedSearch/);
  assert.match(edge, /const selectedHistory = useSearch \? \[{ role: "user", content: latestQuestion }\] : history/);
  assert.match(edge, /if \(useSearch && sources\.length === 0\)/);
  assert.match(edge, /searched: useSearch/);
});

check('documentação não recomenda segredo VITE para licenciamento', () => {
  assert.doesNotMatch(read('.env.example'), /^VITE_LICENSE_SECRET=/m);
  assert.match(read('MELHORIAS-V5.9.md'), /não deve ser considerada uma barreira segura/);
  assert.match(read('LEIA-ME-ADM.md'), /NÃO é segura para proteger cobranças comerciais/);
});

console.log(`CJ Gerenciamento smoke tests: ${checks.length}/${checks.length} passed.`);
for (const name of checks) console.log(`OK  ${name}`);
