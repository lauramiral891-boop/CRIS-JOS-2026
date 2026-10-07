import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BadgeCheck, Camera, CheckCircle2, Eye, EyeOff, KeyRound, Lock, Mail, PlusCircle, ShieldCheck, UserCog, X } from "lucide-react";
import { Logo } from "./shared";
import { ErrorBox, Field, PrimaryButton, fieldCls } from "./ui";
import { fileToPhoto } from "../lib/image";
import {
  CODE_TTL_MIN, MIN_PASS, cancelSignup, completeSignup, loginOwner, parseLogin, loginStaff, resendCode, staffKnownLocally, startSignup, updateAccount, verifySignup, type Account,
} from "../lib/accounts";
import { cloudOn, sendCode, verifyCode } from "../lib/cloud";
import { loginStaffCloud, pushAccount, restoreAccount } from "../lib/sync";
import { hashPass } from "../lib/auth";

type View = "home" | "signup" | "verify" | "login" | "staff" | "restore";

interface Props {
  onOwnerEnter: (account: Account) => void;
  onStaffEnter: (accountId: string, staffId: string) => void;
  /** Abre a Sala do ADM (acesso único do proprietário do app). */
  onAdm: () => void;
}

const spaced = (c: string) => `${c.slice(0, 3)} ${c.slice(3)}`;

export default function AccountGate({ onOwnerEnter, onStaffEnter, onAdm }: Props) {
  const [view, setView] = useState<View>("home");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // criar conta
  const [photo, setPhoto] = useState("");
  const [house, setHouse] = useState("");
  const [owner, setOwner] = useState("");
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [step, setStep] = useState(0); // passo do cadastro: 0 casa • 1 proprietário • 2 segurança
  const fileRef = useRef<HTMLInputElement>(null);

  // verificação
  const [pendLogin, setPendLogin] = useState("");
  const [pendShow, setPendShow] = useState("");
  const [shownCode, setShownCode] = useState("");
  const [cardOpen, setCardOpen] = useState(false);
  const [code, setCode] = useState("");
  const [cool, setCool] = useState(0);

  // entrar
  const [lid, setLid] = useState("");
  const [lpw, setLpw] = useState("");

  // nuvem
  const cloud = cloudOn();
  const [busy, setBusy] = useState(false);
  const [rMail, setRMail] = useState("");
  const [rStage, setRStage] = useState(0); // 0 email • 1 código + nova palavra-passe
  const [rCode, setRCode] = useState("");
  const [rPw, setRPw] = useState("");

  // funcionário
  const [invite, setInvite] = useState("");
  const [user, setUser] = useState("");
  const [spw, setSpw] = useState("");

  useEffect(() => {
    try {
      const m = sessionStorage.getItem("cjg-flash");
      if (m) { sessionStorage.removeItem("cjg-flash"); setView("staff"); setErr(m); }
    } catch { /* ignora */ }
  }, []);

  useEffect(() => {
    if (cool <= 0) return;
    const t = setTimeout(() => setCool((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cool]);

  const go = (v: View) => { setStep(0); setView(v); setErr(""); setOk(""); setLpw(""); setSpw(""); };

  const pickPhoto = async (f?: File) => {
    if (!f) return;
    try { setPhoto(await fileToPhoto(f)); setErr(""); } catch (e) { setErr((e as Error).message); }
  };

  /* ---- 1. criar conta (3 passos) ---- */
  const nextStep = () => {
    if (step === 0) {
      if (!photo) return setErr("A foto da Game House é obrigatória.");
      if (!house.trim()) return setErr("Indique o nome da sua Game House.");
    }
    if (step === 1) {
      if (!owner.trim()) return setErr("Indique o seu nome.");
      if (!parseLogin(id).ok) return setErr((parseLogin(id) as { error: string }).error);
      if (cloud && !id.includes("@")) return setErr("Use um email: vamos enviar-lhe um código de confirmação.");
    }
    setErr(""); setStep((x) => x + 1);
  };
  const prevStep = () => { setErr(""); if (step === 0) go("home"); else setStep((x) => x - 1); };

  const submitSignup = async () => {
    if (busy) return;
    if (!photo) { setStep(0); return setErr("A foto da Game House é obrigatória."); }
    if (pw.length < MIN_PASS) return setErr(`A palavra-passe deve ter pelo menos ${MIN_PASS} caracteres.`);
    if (pw !== pw2) return setErr("As palavras-passe não coincidem.");
    const r = startSignup({ raw: id, ownerName: owner, houseName: house, photo, password: pw });
    if (!r.ok) {
      if (/email|número|telefone|conta com/i.test(r.error)) setStep(1);
      else if (/Game House|foto/i.test(r.error)) setStep(0);
      return setErr(r.error);
    }
    if (cloud) {
      setBusy(true);
      const sent = await sendCode(r.login);
      setBusy(false);
      if (!sent.ok) { cancelSignup(r.login); return setErr(sent.error); }
    }
    setStep(0); setPendLogin(r.login); setPendShow(r.display); setShownCode(cloud ? "" : r.code); setCardOpen(true);
    setCode(""); setCool(30); setErr(""); setView("verify");
  };

  /* ---- 2. confirmar código ---- */
  const submitCode = async () => {
    if (busy) return;
    let r;
    if (cloud) {
      if (code.replace(/\D/g, "").length !== 6) return setErr("Introduza os 6 dígitos do código.");
      setBusy(true);
      const v = await verifyCode(pendLogin, code);
      if (!v.ok) { setBusy(false); return setErr(v.error); }
      r = completeSignup(pendLogin);
      if (r.ok) await pushAccount(r.account.id, true);
      setBusy(false);
    } else r = verifySignup(pendLogin, code);
    if (!r.ok) {
      setErr(r.error);
      if (r.dead) { setShownCode(""); setView("signup"); }
      return;
    }
    // conta criada → volta ao ecrã de entrada para entrar com os dados
    setLid(pendShow); setLpw(""); setPw(""); setPw2("");
    setPhoto(""); setHouse(""); setOwner(""); setId(""); setShownCode(""); setCode("");
    setView("login"); setErr("");
    setOk(`Conta criada com sucesso! O seu ID é ${r.account.id}. Agora entre com os seus dados.`);
  };

  const resend = async () => {
    if (cloud) {
      const sent = await sendCode(pendLogin);
      if (!sent.ok) return setErr(sent.error);
      setCode(""); setErr(""); setCool(30);
      return;
    }
    const r = resendCode(pendLogin);
    if (!r.ok) { setErr(r.error); setView("signup"); return; }
    setShownCode(r.code); setCardOpen(true); setCode(""); setErr(""); setCool(30);
  };

  const backFromVerify = () => { cancelSignup(pendLogin); setShownCode(""); go("signup"); };

  /* ---- 3. entrar ---- */
  const submitLogin = () => {
    if (!lid.trim() || !lpw) return setErr("Preencha o email/número e a palavra-passe.");
    const r = loginOwner(lid, lpw);
    if (!r.ok) return setErr(r.error);
    onOwnerEnter(r.account);
  };

  /* ---- recuperar conta da nuvem (outro telemóvel / palavra-passe esquecida) ---- */
  const restoreSend = async () => {
    const p = parseLogin(rMail);
    if (!p.ok || p.kind !== "email") return setErr("Escreva o email da sua conta.");
    setBusy(true);
    const r = await sendCode(p.login);
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    setRMail(p.login); setRStage(1); setRCode(""); setRPw(""); setErr(""); setCool(30);
  };
  const restoreDo = async () => {
    if (rCode.replace(/\D/g, "").length !== 6) return setErr("Introduza os 6 dígitos do código.");
    if (rPw.length < MIN_PASS) return setErr(`A nova palavra-passe deve ter pelo menos ${MIN_PASS} caracteres.`);
    setBusy(true);
    const v = await verifyCode(rMail, rCode);
    if (!v.ok) { setBusy(false); return setErr(v.error); }
    const r = await restoreAccount(rMail);
    if (!r.ok) { setBusy(false); return setErr(r.error); }
    updateAccount(r.account.id, { passHash: hashPass(rPw) });
    await pushAccount(r.account.id, true);
    setBusy(false);
    setLid(rMail); setLpw(""); setRStage(0); setRCode(""); setRPw("");
    setView("login"); setErr("");
    setOk(`Conta recuperada! O seu ID é ${r.account.id}. Entre com a nova palavra-passe.`);
  };

  const submitStaff = async () => {
    if (busy) return;
    if (!invite.trim() || !user.trim() || !spw) return setErr("Preencha os três campos.");
    // 1) funcionário deste telemóvel (conta do proprietário guardada aqui)
    // 2) senão, entra pela nuvem na sala do proprietário, noutro telemóvel
    if (staffKnownLocally(invite, user) || !cloud) {
      const r = loginStaff(invite, user, spw);
      if (!r.ok) return setErr(r.error);
      return onStaffEnter(r.accountId, r.staffId);
    }
    setBusy(true); setErr("");
    const r = await loginStaffCloud(invite, user, spw);
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    onStaffEnter(r.accountId, r.staffId);
  };

  const big = "flex w-full items-center gap-3.5 rounded-2xl border p-4 text-left transition active:scale-[0.98]";
  const eye = (
    <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500" aria-label="Mostrar palavra-passe">
      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
    </button>
  );

  return (
    <div className="fade relative flex min-h-0 flex-1 flex-col">
      {/* Sala do ADM: canto superior, só para o proprietário do app (pede a senha única) */}
      <button
        onClick={onAdm}
        aria-label="Sala do ADM"
        className="absolute right-3 top-3 z-30 flex items-center gap-1.5 rounded-full border border-[#FFC107]/35 bg-[#FFC107]/10 px-3 py-1.5 text-[10.5px] font-extrabold uppercase tracking-wider text-[#FFC107] active:scale-95"
      >
        <ShieldCheck size={13} /> ADM
      </button>
      <div className="thin-scroll flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-28 pt-4">
        {view === "home" ? <div className="mt-2"><Logo big /></div> : <Logo />}

        {view === "home" && (
          <div className="mt-6 flex-1">
            <h1 className="font-display text-[24px] font-extrabold uppercase leading-none">Bem-vindo</h1>
            <p className="mt-1.5 text-[12.5px] text-neutral-400">Como quer entrar?</p>
            <div className="mt-5 space-y-3">
              <button onClick={() => go("signup")} className={`${big} border-[#00FF88]/35 bg-[#00FF88]/[0.07]`}>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#00FF88]/15 text-[#00FF88]"><PlusCircle size={22} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-bold">Criar conta</span>
                  <span className="block text-[12px] text-neutral-400">Registar a minha Game House</span>
                </span>
              </button>
              <button onClick={() => go("login")} className={`${big} border-[#00E5FF]/35 bg-[#00E5FF]/[0.07]`}>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#00E5FF]/15 text-[#00E5FF]"><BadgeCheck size={22} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-bold">Entrar em conta existente</span>
                  <span className="block text-[12px] text-neutral-400">Com o meu email ou número</span>
                </span>
              </button>
              <button onClick={() => go("staff")} className={`${big} border-[#FFC107]/35 bg-[#FFC107]/[0.07]`}>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#FFC107]/15 text-[#FFC107]"><UserCog size={22} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-bold">Entrar como funcionário</span>
                  <span className="block text-[12px] text-neutral-400">Com o código de convite do proprietário</span>
                </span>
              </button>
            </div>
          </div>
        )}

        {view !== "home" && (
          <button onClick={() => (view === "verify" ? backFromVerify() : view === "signup" ? prevStep() : go("home"))} className="mt-5 flex w-fit items-center gap-1.5 text-[12.5px] font-bold text-neutral-400 active:text-white">
            <ArrowLeft size={15} /> Voltar
          </button>
        )}

        {view === "signup" && (
          <div className="mt-4">
            <h1 className="font-display text-[26px] font-extrabold uppercase leading-none">Criar conta</h1>
            <p className="mt-1.5 text-[12.5px] text-neutral-400">Cada conta tem a sua própria sala. Ninguém vê os dados de outra conta.</p>

            {/* progresso */}
            <div className="mb-5 mt-4 flex items-center gap-2">
              {["Game House", "Proprietário", "Segurança"].map((t, i) => (
                <div key={t} className="flex-1">
                  <div className={`h-1.5 rounded-full transition-all ${i <= step ? "bg-[#00E5FF]" : "bg-white/10"}`} />
                  <p className={`mt-1 text-[10.5px] font-bold uppercase tracking-wider ${i === step ? "text-[#00E5FF]" : "text-neutral-600"}`}>{i + 1}. {t}</p>
                </div>
              ))}
            </div>

            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void pickPhoto(e.target.files?.[0]); e.target.value = ""; }} />

            {step === 0 && (
              <div className="space-y-3">
                <div className="flex flex-col items-center">
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className={`relative grid h-32 w-32 place-items-center overflow-hidden rounded-3xl border-2 border-dashed transition active:scale-95 ${photo ? "border-[#00FF88]" : "border-[#00E5FF]/50 bg-[#00E5FF]/[0.06]"}`}>
                    {photo ? <img src={photo} alt="Foto da Game House" className="h-full w-full object-cover" /> : (
                      <span className="flex flex-col items-center gap-1 text-[#00E5FF]"><Camera size={28} /><span className="text-[11px] font-bold">Adicionar foto</span></span>
                    )}
                  </button>
                  <p className="mt-2 text-[11.5px] font-semibold text-neutral-400">Foto da Game House <span className="text-[#FF4D6D]">*obrigatória</span></p>
                  {photo && <button type="button" onClick={() => fileRef.current?.click()} className="mt-0.5 text-[11.5px] font-bold text-[#00E5FF]">Trocar foto</button>}
                </div>
                <Field label="Nome da Game House">
                  <input value={house} onChange={(e) => { setHouse(e.target.value); setErr(""); }} onKeyDown={(e) => e.key === "Enter" && nextStep()} placeholder="Ex: CJ Gamers Talatona" className={fieldCls} />
                </Field>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-3">
                <Field label="Nome do proprietário">
                  <input value={owner} onChange={(e) => { setOwner(e.target.value); setErr(""); }} placeholder="Ex: Carlos Manuel" className={fieldCls} />
                </Field>
                <Field label="Email ou número de telefone" hint="É com isto que vai entrar na conta">
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input value={id} onChange={(e) => { setId(e.target.value); setErr(""); }} onKeyDown={(e) => e.key === "Enter" && nextStep()} placeholder={cloud ? "email@exemplo.com" : "email@exemplo.com ou 923 000 000"} autoCapitalize="none" autoCorrect="off" className={`${fieldCls} pl-10`} />
                  </div>
                </Field>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#1a1a1a] p-3">
                  <img src={photo} alt="" className="h-12 w-12 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-[16px] font-extrabold uppercase leading-none">{house}</p>
                    <p className="mt-1 truncate text-[11.5px] text-neutral-400">{owner} • {id}</p>
                  </div>
                </div>
                <Field label="Palavra-passe" hint={`Mínimo ${MIN_PASS} caracteres`}>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input type={showPw ? "text" : "password"} value={pw} onChange={(e) => { setPw(e.target.value); setErr(""); }} className={`${fieldCls} px-10`} />
                    {eye}
                  </div>
                </Field>
                <Field label="Confirmar palavra-passe">
                  <input type={showPw ? "text" : "password"} value={pw2} onChange={(e) => { setPw2(e.target.value); setErr(""); }} onKeyDown={(e) => e.key === "Enter" && void submitSignup()} className={fieldCls} />
                </Field>
              </div>
            )}

            <div className="mt-3"><ErrorBox msg={err} /></div>
            <div className="mt-3">
              {step < 2 ? (
                <PrimaryButton onClick={nextStep}><span className="flex items-center justify-center gap-2">Continuar <ArrowRight size={16} /></span></PrimaryButton>
              ) : (
                <PrimaryButton disabled={busy} onClick={() => void submitSignup()}>{busy ? "A enviar código…" : cloud ? "Criar conta e receber código por email" : "Criar conta e receber código"}</PrimaryButton>
              )}
            </div>
            <p className="mt-4 text-center text-[12px] text-neutral-500">
              Já tem conta? <button onClick={() => go("login")} className="font-bold text-[#00E5FF]">Entrar</button>
            </p>
          </div>
        )}

        {view === "verify" && (
          <div className="mt-4 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#00E5FF]/12 text-[#00E5FF]"><ShieldCheck size={30} /></div>
            <h1 className="mt-4 font-display text-[24px] font-extrabold uppercase leading-none">Confirme a sua conta</h1>
            <p className="mt-2 text-[12.5px] text-neutral-400">
              {cloud ? "Enviámos um código de 6 dígitos para o email" : "Um código de 6 dígitos foi gerado para"} <b className="text-neutral-200">{pendShow}</b>. Escreva-o abaixo.{cloud && " Veja também a pasta de spam."}
              <br />Válido por {CODE_TTL_MIN} minutos.
            </p>
            <input
              value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setErr(""); }}
              onKeyDown={(e) => e.key === "Enter" && void submitCode()}
              inputMode="numeric" autoFocus placeholder="000000" maxLength={6}
              className={`${fieldCls} mt-5 text-center font-display text-[30px] font-extrabold tracking-[0.4em]`}
            />
            <div className="mt-2"><ErrorBox msg={err} /></div>
            <div className="mt-3"><PrimaryButton tone="cyan" disabled={busy} onClick={() => void submitCode()}>{busy ? "A confirmar…" : "Confirmar código"}</PrimaryButton></div>
            <button onClick={() => void resend()} disabled={cool > 0} className="mt-3 text-[12.5px] font-bold text-[#00E5FF] disabled:text-neutral-600">
              {cool > 0 ? `Pedir novo código em ${cool}s` : "Pedir novo código"}
            </button>
            {!cloud && <p className="mt-4 text-[11px] text-neutral-500">Nesta versão o código aparece aqui na app, na parte de baixo do ecrã. O envio real por email precisa da nuvem ligada.</p>}
          </div>
        )}

        {view === "login" && (
          <div className="mt-4">
            {ok && (
              <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-[#00FF88]/35 bg-[#00FF88]/[0.08] p-3 text-[12.5px] font-semibold text-[#00FF88]">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> <span>{ok}</span>
              </div>
            )}
            <h1 className="font-display text-[26px] font-extrabold uppercase leading-none">Entrar</h1>
            <p className="mb-4 mt-1.5 text-[12.5px] text-neutral-400">Use o email ou número e a palavra-passe da sua conta.</p>
            <div className="space-y-2.5">
              <Field label="Email ou número de telefone">
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input value={lid} onChange={(e) => { setLid(e.target.value); setErr(""); }} autoCapitalize="none" autoCorrect="off" className={`${fieldCls} pl-10`} />
                </div>
              </Field>
              <Field label="Palavra-passe">
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input type={showPw ? "text" : "password"} value={lpw} onChange={(e) => { setLpw(e.target.value); setErr(""); }} onKeyDown={(e) => e.key === "Enter" && submitLogin()} className={`${fieldCls} px-10`} />
                  {eye}
                </div>
              </Field>
              <ErrorBox msg={err} />
              <PrimaryButton tone="cyan" onClick={submitLogin}>Entrar</PrimaryButton>
              {cloud && <button type="button" onClick={() => { go("restore"); setRStage(0); }} className="w-full pt-1 text-center text-[12.5px] font-bold text-[#FFC107]">Outro telemóvel ou esqueci a palavra-passe? Recuperar por email</button>}
            </div>
            <p className="mt-4 text-center text-[12px] text-neutral-500">
              Ainda não tem conta? <button onClick={() => go("signup")} className="font-bold text-[#00FF88]">Criar conta</button>
            </p>
          </div>
        )}

        {view === "restore" && (
          <div className="mt-4">
            <h1 className="font-display text-[26px] font-extrabold uppercase leading-none">Recuperar conta</h1>
            <p className="mb-4 mt-1.5 text-[12.5px] text-neutral-400">
              {rStage === 0 ? "Escreva o email da conta. Enviamos um código para confirmar que é você e traz a sua Game House para este telemóvel." : <>Enviámos um código para <b className="text-neutral-200">{rMail}</b>. Escreva-o e defina uma nova palavra-passe.</>}
            </p>
            <div className="space-y-2.5">
              {rStage === 0 ? (
                <Field label="Email da conta">
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input value={rMail} onChange={(e) => { setRMail(e.target.value); setErr(""); }} onKeyDown={(e) => e.key === "Enter" && void restoreSend()} autoCapitalize="none" autoCorrect="off" className={`${fieldCls} pl-10`} />
                  </div>
                </Field>
              ) : (
                <>
                  <input value={rCode} onChange={(e) => { setRCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setErr(""); }} inputMode="numeric" autoFocus placeholder="000000" maxLength={6} className={`${fieldCls} text-center font-display text-[28px] font-extrabold tracking-[0.4em]`} />
                  <Field label="Nova palavra-passe" hint={`Mínimo ${MIN_PASS} caracteres`}>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                      <input type={showPw ? "text" : "password"} value={rPw} onChange={(e) => { setRPw(e.target.value); setErr(""); }} onKeyDown={(e) => e.key === "Enter" && void restoreDo()} className={`${fieldCls} px-10`} />
                      {eye}
                    </div>
                  </Field>
                </>
              )}
              <ErrorBox msg={err} />
              <PrimaryButton tone="cyan" disabled={busy} onClick={() => void (rStage === 0 ? restoreSend() : restoreDo())}>{busy ? "Aguarde…" : rStage === 0 ? "Enviar código" : "Recuperar conta"}</PrimaryButton>
              {rStage === 1 && <button type="button" disabled={cool > 0} onClick={() => void restoreSend()} className="w-full text-center text-[12.5px] font-bold text-[#00E5FF] disabled:text-neutral-600">{cool > 0 ? `Pedir novo código em ${cool}s` : "Pedir novo código"}</button>}
            </div>
          </div>
        )}

        {view === "staff" && (
          <div className="mt-4">
            <h1 className="font-display text-[26px] font-extrabold uppercase leading-none">Funcionário</h1>
            <p className="mb-4 mt-1.5 text-[12.5px] text-neutral-400">Use os dados que o proprietário lhe deu. Funciona no seu telemóvel e vê o mesmo que o proprietário permitiu.</p>
            <div className="space-y-2.5">
              <Field label="Código de convite">
                <input value={invite} onChange={(e) => { setInvite(e.target.value); setErr(""); }} placeholder="CJ-XXXX-XXXX" autoCapitalize="characters" className={fieldCls} />
              </Field>
              <Field label="Código de utilizador">
                <input value={user} onChange={(e) => { setUser(e.target.value); setErr(""); }} placeholder="F1234" autoCapitalize="characters" className={fieldCls} />
              </Field>
              <Field label="Palavra-passe">
                <div className="relative">
                  <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input type="password" value={spw} onChange={(e) => { setSpw(e.target.value); setErr(""); }} onKeyDown={(e) => e.key === "Enter" && void submitStaff()} className={`${fieldCls} pl-10`} />
                </div>
              </Field>
              <ErrorBox msg={err} />
              <PrimaryButton tone="cyan" disabled={busy} onClick={() => void submitStaff()}>{busy ? "A entrar…" : "Entrar"}</PrimaryButton>
            </div>
            <p className="mt-3 text-center text-[11px] text-neutral-500">Só vê o que o proprietário permitiu. Tudo o que fizer fica registado.</p>
          </div>
        )}
      </div>

      {/* código de verificação: cai na parte de baixo da app */}
      {view === "verify" && shownCode && cardOpen && (
        <div className="rise absolute inset-x-3 bottom-3 z-40 rounded-2xl border border-[#00E5FF]/45 bg-[#161c1e] p-3.5 shadow-[0_10px_40px_rgba(0,229,255,0.25)]">
          <button onClick={() => setCardOpen(false)} className="absolute right-2.5 top-2.5 text-neutral-500" aria-label="Fechar"><X size={16} /></button>
          <p className="text-[10.5px] font-bold uppercase tracking-widest text-[#00E5FF]">CJ Gerenciamento • Código de verificação</p>
          <p className="mt-1 font-display text-[34px] font-extrabold leading-none tracking-[0.18em] text-white">{spaced(shownCode)}</p>
          <p className="mt-1.5 text-[11px] text-neutral-400">Para {pendShow} • válido por {CODE_TTL_MIN} min • não o partilhe com ninguém.</p>
        </div>
      )}
    </div>
  );
}
