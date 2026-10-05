let ctx: AudioContext | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

/** Deve ser chamado após um toque do utilizador para o navegador permitir som. */
export function unlockAudio() {
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    /* sem suporte de áudio */
  }
}

function beep(freq: number, start: number, dur: number) {
  if (!ctx) return;
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

interface AlarmOpts {
  sound: boolean;
  vibrate: boolean;
}

function ring({ sound, vibrate }: AlarmOpts) {
  if (sound) {
    unlockAudio();
    [0, 0.28, 0.56].forEach((t, i) => beep(i % 2 ? 880 : 1175, t, 0.2));
    beep(1175, 0.84, 0.35);
  }
  if (vibrate && "vibrate" in navigator) {
    navigator.vibrate([400, 150, 400, 150, 600]);
  }
}

export function stopAlarm() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if ("vibrate" in navigator) navigator.vibrate(0);
}

export function startAlarm(opts: AlarmOpts) {
  stopAlarm();
  ring(opts);
  timer = setInterval(() => ring(opts), 2600);
}
