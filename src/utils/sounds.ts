export function playLoginSuccess() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const t = ctx.currentTime;

    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.08), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const ns = ctx.createBufferSource(); ns.buffer = buf;
    const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 800; nf.Q.value = 4;
    const ng = ctx.createGain(); ng.gain.setValueAtTime(0.7, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    ns.connect(nf).connect(ng).connect(ctx.destination); ns.start(t);

    const sw = ctx.createOscillator(), sg = ctx.createGain(); sw.type = 'sawtooth';
    sw.frequency.setValueAtTime(80, t + 0.05); sw.frequency.exponentialRampToValueAtTime(400, t + 0.22);
    sg.gain.setValueAtTime(0, t + 0.05); sg.gain.linearRampToValueAtTime(0.35, t + 0.08);
    sg.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    sw.connect(sg).connect(ctx.destination); sw.start(t + 0.05); sw.stop(t + 0.26);

    [[880, 0.22], [1320, 0.3], [1760, 0.38]].forEach(([f, delay]) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0, t + delay); g.gain.linearRampToValueAtTime(0.32, t + delay + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.55);
      o.connect(g).connect(ctx.destination); o.start(t + delay); o.stop(t + delay + 0.57);
    });

  } catch(e) {}
}

export function playGeneratePlanSuccess() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const t = ctx.currentTime;

    [[440, 0], [550, 0.1], [660, 0.2], [880, 0.3]].forEach(([freq, delay]) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      o.type = 'sine'; o.frequency.setValueAtTime((freq as number) * 1.5, t + (delay as number));
      o.frequency.exponentialRampToValueAtTime(freq as number, t + (delay as number) + 0.03);
      f.type = 'highpass'; f.frequency.value = 150;
      g.gain.setValueAtTime(0, t + (delay as number)); g.gain.linearRampToValueAtTime(0.42, t + (delay as number) + 0.004);
      g.gain.exponentialRampToValueAtTime(0.001, t + (delay as number) + 0.22);
      o.connect(f).connect(g).connect(ctx.destination); o.start(t + (delay as number)); o.stop(t + (delay as number) + 0.24);
    });

    [440, 550, 660, 880].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0, t + 0.42); g.gain.linearRampToValueAtTime(0.15 - i * 0.03, t + 0.46);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
      o.connect(g).connect(ctx.destination); o.start(t + 0.42); o.stop(t + 1.15);
    });

  } catch(e) {}
}

export function playWorkoutComplete() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const t = ctx.currentTime;

    const kick = ctx.createOscillator(), kg = ctx.createGain(); kick.type = 'sine';
    kick.frequency.setValueAtTime(150, t); kick.frequency.exponentialRampToValueAtTime(55, t + 0.12);
    kg.gain.setValueAtTime(0.8, t); kg.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    kick.connect(kg).connect(ctx.destination); kick.start(t); kick.stop(t + 0.18);

    [523, 659, 784, 1047, 1319].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0, t + 0.08 + i * 0.1); g.gain.linearRampToValueAtTime(0.43 - i * 0.06, t + 0.09 + i * 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.08 + i * 0.1 + 0.92 - i * 0.08);
      o.connect(g).connect(ctx.destination); o.start(t + 0.08 + i * 0.1); o.stop(t + 0.08 + i * 0.1 + 0.95);
    });

    [523, 659, 784].forEach(f => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0, t + 0.6); g.gain.linearRampToValueAtTime(0.22, t + 0.65);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
      o.connect(g).connect(ctx.destination); o.start(t + 0.6); o.stop(t + 1.65);
    });

  } catch(e) {}
}
