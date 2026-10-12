import os
import re
import shutil

P = "src/components/AdminRoom.tsx"
assert os.path.exists("src/components/PhotoAdjust.tsx"), "falta copiar o PhotoAdjust.tsx para src/components"

s = open(P).read()
assert "PhotoAdjust" not in s, "ja aplicado"
shutil.copy(P, P + ".bak-ajuste-foto")


def sub(old, new):
    global s
    assert s.count(old) == 1, "nao encontrado: " + old[:60]
    s = s.replace(old, new)


# 1) assinatura e tipo do PhotoPicker
sub("{ label, multiple, maxSide, quality, onPick, onError }: {",
    "{ label, multiple, maxSide, quality, aspect, onPick, onError }: {")
sub("label: string; multiple?: boolean;", "label: string; aspect?: number; multiple?: boolean;")

# 2) estado do editor
sub("const ref = useRef<HTMLInputElement>(null);\n  const [busy, setBusy] = useState(false);",
    "const ref = useRef<HTMLInputElement>(null);\n  const [busy, setBusy] = useState(false);\n  const [adj, setAdj] = useState<string | null>(null);")

# 3) uma foto com moldura -> abre o editor
sub("onPick(out);", "if (aspect && !multiple && out[0]) setAdj(out[0]); else onPick(out);")

# 4) mostra o editor
pat = r'(\{busy \? "A preparar…" : label\}\s*</button>)'
novo = (r'\1\n      {adj && aspect && <PhotoAdjust src={adj} aspect={aspect} maxSide={maxSide} quality={quality}'
        r' onCancel={() => setAdj(null)} onDone={(d) => { setAdj(null); onPick([d]); }} />}')
s, n = re.subn(pat, novo, s)
assert n == 1, "botao do PhotoPicker nao encontrado"

# 5) capa do jogo usa moldura 16:10
sub('"Escolher capa do jogo"} maxSide={640}', '"Escolher capa do jogo"} aspect={16 / 10} maxSide={640}')

# 6) import
s = 'import PhotoAdjust from "./PhotoAdjust";\n' + s
open(P, "w").write(s)
print("ok")
