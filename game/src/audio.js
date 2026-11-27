// Ridge Runner — small sounds, made with the Web Audio oscillator so the
// game needs no audio files. Everything is guarded: no AudioContext exists
// until the pilot first presses a key, and M silences it all.

export function createAudio() {
  let ctx = null;
  let muted = false;

  function ensure() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        ctx = null;
      }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, gain) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    osc.connect(g);
    g.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + dur);
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    ring() {
      tone(880, 0.14, 'sine', 0.12);
      setTimeout(() => tone(1318, 0.2, 'sine', 0.1), 90);
    },
    warning() {
      tone(220, 0.18, 'square', 0.05);
    },
    crash() {
      tone(140, 0.5, 'sawtooth', 0.12);
      setTimeout(() => tone(70, 0.7, 'sawtooth', 0.1), 120);
    },
    land() {
      tone(523, 0.16, 'sine', 0.1);
      setTimeout(() => tone(659, 0.16, 'sine', 0.1), 140);
      setTimeout(() => tone(784, 0.3, 'sine', 0.1), 280);
    },
  };
}
