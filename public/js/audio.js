// Audio starts inside a real user gesture, as required by browser autoplay rules.
const NightSounds = (() => {
  let context,
    ready = false,
    lastAmbient = 0;
  const tunes = {
    hello: [
      [392, 0, 0.12],
      [523, 0.13, 0.12],
      [659, 0.26, 0.2],
    ],
    click: [[550, 0, 0.065]],
    potato: [
      [150, 0, 0.16],
      [110, 0.18, 0.24],
    ],
    popup: [
      [740, 0, 0.12],
      [587, 0.15, 0.12],
      [740, 0.3, 0.18],
    ],
    no: [
      [330, 0, 0.18],
      [247, 0.2, 0.3],
    ],
    sleep: [
      [523, 0, 0.22],
      [440, 0.25, 0.22],
      [349, 0.5, 0.4],
    ],
    test: [
      [440, 0, 0.1],
      [554, 0.12, 0.1],
      [659, 0.24, 0.1],
      [880, 0.36, 0.3],
    ],
    return: [
      [330, 0, 0.12],
      [440, 0.14, 0.17],
    ],
    win: [
      [659, 0, 0.1],
      [880, 0.12, 0.2],
    ],
  };
  function tone(freq, delay, duration, kind = 'sine', volume = 0.16) {
    const time = context.currentTime + delay,
      o = context.createOscillator(),
      g = context.createGain();
    o.type = kind;
    o.frequency.setValueAtTime(freq, time);
    o.frequency.exponentialRampToValueAtTime(freq * 0.92, time + duration);
    g.gain.setValueAtTime(0.001, time);
    g.gain.linearRampToValueAtTime(volume, time + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, time + duration);
    o.connect(g);
    g.connect(context.destination);
    o.start(time);
    o.stop(time + duration + 0.03);
  }
  function play(name = 'click') {
    if (!ready || context.state !== 'running') return;
    for (const [f, d, t] of tunes[name] || tunes.click)
      tone(f, d, t, name === 'no' ? 'triangle' : 'sine');
  }
  function snore() {
    if (!ready || context.state !== 'running') return;
    const t = context.currentTime;
    const o = context.createOscillator(),
      g = context.createGain(),
      filter = context.createBiquadFilter();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(65, t);
    o.frequency.linearRampToValueAtTime(95, t + 0.5);
    o.frequency.linearRampToValueAtTime(50, t + 1.1);
    filter.type = 'lowpass';
    filter.frequency.value = 380;
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.12, t + 0.3);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    o.connect(filter);
    filter.connect(g);
    g.connect(context.destination);
    o.start(t);
    o.stop(t + 1.25);
  }
  async function unlock() {
    try {
      context ??= new (window.AudioContext || window.webkitAudioContext)();
      await context.resume();
      if (!ready) {
        ready = true;
        lastAmbient = Date.now();
        play('hello');
      }
    } catch {}
  }
  document.addEventListener('pointerdown', unlock, { passive: true });
  document.addEventListener('keydown', unlock);
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const ids = {
      potato: 'potato',
      more: 'no',
      sleep: 'sleep',
      return: 'return',
      excuse: 'no',
    };
    play(ids[b.id] || 'click');
  });
  setInterval(() => {
    if (
      !ready ||
      document.hidden ||
      document.querySelector('#bye[open]') ||
      !document.querySelector('#game.hidden')
    )
      return;
    const late = document.body.classList.contains('night');
    if (Date.now() - lastAmbient > (late ? 7000 : 14000)) {
      lastAmbient = Date.now();
      snore();
      if (late) setTimeout(() => play('popup'), 1500);
    }
  }, 1000);
  return { play, snore };
})();
