from pathlib import Path
import shutil
import sys

p = Path("src/components/AdminRoom.tsx")
q = Path("src/lib/sync.ts")
s = p.read_text()
t = q.read_text()

old = 'import { admDirty, lastPublishError, pushGlobalUp } from "../lib/sync";'
new = 'import { admDirty, lastPublishError, pushGlobalUp, syncGlobalDown } from "../lib/sync";'
anchor = '  useEffect(() => { reload(houseId); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [houseId]);'

if s.count(old) != 1:
print("PARADO: import original não encontrado exatamente uma vez.")
sys.exit(1)
if s.count(anchor) != 1:
print("PARADO: ponto de inserção não encontrado exatamente uma vez.")
sys.exit(1)
if t.count('export async function syncGlobalDown()') != 1:
print("PARADO: função syncGlobalDown não encontrada.")
sys.exit(1)

effect = '''
// Atualização automática dos dados globais do ADM.
useEffect(() => {
if (!unlocked || !cloudOn()) return;
let active = true;
const pull = async () => {
await syncGlobalDown();
if (active && !admDirty()) setG(loadGlobalAdm());
};
void pull();
const iv = window.setInterval(() => { void pull(); }, 5000);
return () => {
active = false;
window.clearInterval(iv);
};
}, [unlocked]);

'''

shutil.copy2(p, str(p) + ".bak-adm-cloud")
s = s.replace(old, new, 1)
s = s.replace(anchor, anchor + "\n" + effect, 1)
p.write_text(s)
print("SUCESSO: atualização automática ADM adicionada.")
print("Cópia de segurança criada.")
