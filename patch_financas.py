import shutil

P = "src/screens/Finance.tsx"
s = open(P).read()
assert "allTransactions" not in s, "ja aplicado"
shutil.copy(P, P + ".bak-filtro")


def sub(old, new):
    global s
    assert s.count(old) == 1, "nao encontrado: " + old[:60]
    s = s.replace(old, new)


# 1) a prop passa a chamar-se allTransactions
sub("  transactions, balance, now, onAdd, onOpenReports, onOpenSales,",
    "  transactions: allTransactions, balance, now, onAdd, onOpenReports, onOpenSales,")

# 2) filtro: a variavel transactions passa a ser a lista filtrada
sub('const [err, setErr] = useState("");', '''const [err, setErr] = useState("");
  const [scope, setScope] = useState<"all" | "games" | "sales">("all");
  const GAMES = ["sessao", "extensao", "recarga"];
  const SALES = ["venda", "servico"];
  const transactions =
    scope === "games" ? allTransactions.filter((t) => GAMES.includes(t.category))
    : scope === "sales" ? allTransactions.filter((t) => SALES.includes(t.category))
    : allTransactions;''')

# 3) botoes por baixo do titulo
botoes = '''Visão Financeira</h1>
      <div className="flex justify-center gap-1.5">
        {([["all", "Tudo"], ["games", "Jogos"], ["sales", "Vendas"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setScope(id)} className={cn("rounded-full border px-3 py-1 text-[11px] font-bold transition active:scale-95", scope === id ? "border-[#00FF88] bg-[#00FF88]/15 text-[#00FF88]" : "border-white/10 bg-[#1e1e1e] text-neutral-400")}>{label}</button>
        ))}
      </div>'''
sub("Visão Financeira</h1>", botoes)

open(P, "w").write(s)
print("ok")
