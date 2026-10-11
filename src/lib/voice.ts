/* Voz do assistente: lê as respostas em voz alta com a voz do próprio telemóvel (sem internet, sem custo). */
import { getNamespace } from "./storage";
import { Capacitor } from "@capacitor/core";
import { TextToSpeech } from "@capacitor-community/text-to-speech";

const synth = (): SpeechSynthesis | null => (typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null);
const isNative = () => Capacitor.isNativePlatform();
export const voiceSupported = () => isNative() || !!synth();

const prefKey = () => `cjg-voice:${getNamespace()}`;
export const voiceEnabled = (): boolean => {
  try { return localStorage.getItem(prefKey()) !== "off"; } catch { return true; }
};
export const setVoiceEnabled = (on: boolean) => {
  try { localStorage.setItem(prefKey(), on ? "on" : "off"); } catch { /* ignora */ }
  if (!on) stopVoice();
};

/** Escolhe a voz portuguesa mais amigável disponível (pt-PT e vozes femininas primeiro). */
function pickVoice(): SpeechSynthesisVoice | null {
  const s = synth();
  if (!s) return null;
  const pt = s.getVoices().filter((v) => /^pt/i.test(v.lang));
  if (!pt.length) return null;
  const score = (v: SpeechSynthesisVoice) => {
    let n = 0;
    if (/pt[-_]PT/i.test(v.lang)) n += 6;
    else if (/pt[-_]AO/i.test(v.lang)) n += 7;
    else if (/pt[-_]BR/i.test(v.lang)) n += 3;
    if (/joana|raquel|fernanda|francisca|maria|luciana|catarina|female|feminina/i.test(v.name)) n += 3;
    if (/google|natural|neural|online/i.test(v.name)) n += 2;
    if (v.localService) n += 1;
    return n;
  };
  return pt.sort((a, b) => score(b) - score(a))[0];
}

/** Transforma o texto escrito em texto "para ler": sem símbolos, emojis, e com os valores em kwanzas. */
export function speakable(raw: string): string {
  return raw
    .replace(/\p{Extended_Pictographic}|\uFE0F|\u200D/gu, "")
    .replace(/\*\*?|__?|`+|#+\s*/g, "")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/^\s*(\d+)\.\s+/gm, "$1. ")
    .replace(/AOA[ ]*(\d+(?:[.,]\d+)*(?:[ ]+(?:mil|milhões|milhão|M|k)\b)?)/gi, (_, n: string) =>
      `${n.replace(/(\d)\.(?=\d{3}\b)/g, "$1").replace(/,00\b/, "")} kwanzas`)
    .replace(/\s*[|]\s*/g, ", ")
    .replace(/[\n\r]+/g, ". ")
    .replace(/\.\s*\./g, ".")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Parte em frases curtas: alguns telemóveis cortam textos longos a meio. */
function chunks(text: string): string[] {
  const parts = text.match(/[^.!?:;]+[.!?:;]?\s*/g) ?? [text];
  const out: string[] = [];
  let cur = "";
  for (const p of parts) {
    if ((cur + p).length > 170 && cur) { out.push(cur.trim()); cur = p; } else cur += p;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

let token = 0;

export function stopVoice() {
  token++;
  synth()?.cancel();
  if (isNative()) void TextToSpeech.stop().catch(() => {});
}

/** Fala o texto. `onEnd` corre quando termina (ou é interrompido). */
export function speak(raw: string, onEnd?: () => void) {
  const s = synth();
  const text = speakable(raw);
  if (isNative()) {
    if (!text) { onEnd?.(); return; }
    const my0 = ++token;
    TextToSpeech.stop().catch(() => {})
      .then(() => TextToSpeech.speak({ text, lang: "pt-PT", rate: 1.0, pitch: 1.1, volume: 1.0, category: "ambient" }))
      .then(() => { if (my0 === token) onEnd?.(); })
      .catch(() => { if (my0 === token) onEnd?.(); });
    return;
  }
  if (!s || !text) { onEnd?.(); return; }
  s.cancel();
  const my = ++token;
  const voice = pickVoice();
  const list = chunks(text);
  list.forEach((c, i) => {
    const u = new SpeechSynthesisUtterance(c);
    u.lang = voice?.lang ?? "pt-PT";
    if (voice) u.voice = voice;
    u.rate = 1.02;
    u.pitch = 1.12; // um pouco mais alegre
    u.volume = 1;
    if (i === list.length - 1) {
      u.onend = () => { if (my === token) onEnd?.(); };
      u.onerror = () => { if (my === token) onEnd?.(); };
    }
    s.speak(u);
  });
}

/** Chamar num toque do utilizador: no iPhone a voz só é permitida depois de um toque. */
export function unlockVoice() {
  const s = synth();
  if (!s) return;
  const u = new SpeechSynthesisUtterance(" ");
  u.volume = 0;
  s.speak(u);
}
