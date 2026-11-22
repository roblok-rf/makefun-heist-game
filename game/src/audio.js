// The Meridian Job — synthesized sound effects (WebAudio, no audio files).
// Every sound is a few oscillators and a gain envelope, so the game ships no
// audio assets and plays offline. Audio starts on the first user gesture.

export function createAudio() {
  let context = null;
  let muted = false;
  let alarmTimer = 0;

  function ensure() {
    if (!context) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        context = new AC();
      } catch {
        context = null;
      }
    }
    if (context && context.state === 'suspended') void context.resume();
    return context;
  }

  function tone(freq, seconds, type, volume, when = 0, slideTo = null) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    const start = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, start + seconds);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + seconds + 0.05);
  }

  function noise(seconds, volume, when = 0, lowpass = 1200) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    const start = ctx.currentTime + when;
    const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(start);
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    pickup() {
      tone(880, 0.09, 'sine', 0.16);
      tone(1318, 0.12, 'sine', 0.12, 0.07);
    },
    coinThrow() {
      tone(2400, 0.08, 'triangle', 0.08, 0, 900);
    },
    coinClink() {
      tone(2093, 0.06, 'square', 0.07);
      tone(2637, 0.09, 'square', 0.05, 0.05);
    },
    crackTick() {
      tone(1200, 0.03, 'square', 0.05);
    },
    crackDone() {
      tone(523, 0.12, 'sine', 0.16);
      tone(659, 0.12, 'sine', 0.16, 0.1);
      tone(784, 0.22, 'sine', 0.18, 0.2);
    },
    smoke() {
      noise(0.5, 0.2, 0, 700);
    },
    spotted() {
      tone(220, 0.16, 'sawtooth', 0.14, 0, 440);
    },
    caught() {
      tone(196, 0.3, 'sawtooth', 0.2, 0, 98);
      tone(147, 0.5, 'sawtooth', 0.18, 0.25, 73);
    },
    getaway() {
      const notes = [523, 659, 784, 1047];
      notes.forEach((n, i) => tone(n, 0.18, 'triangle', 0.16, i * 0.12));
    },
    click() {
      tone(660, 0.05, 'sine', 0.1);
    },
    // A soft two-note pulse while the alarm is high; call every frame.
    alarmPulse(dt, alarm) {
      if (muted || alarm < 40) return;
      alarmTimer -= dt;
      if (alarmTimer <= 0) {
        alarmTimer = alarm >= 80 ? 0.45 : 0.9;
        tone(alarm >= 80 ? 740 : 587, 0.12, 'sine', 0.07);
      }
    },
  };
}
