export function createAmbience(onState) {
  let context;
  let master;
  let enabled = false;
  let disposed = false;
  let timer;
  const sources = [];
  let noise;
  function initialize() {
    context = new AudioContext();
    context.onstatechange = () => onState(context.state);
    master = context.createGain(); master.gain.value = 0; master.connect(context.destination);
    noise = context.createBuffer(1, context.sampleRate * 6, context.sampleRate);
    const samples = noise.getChannelData(0);
    let last = 0;
    for (let i = 0; i < samples.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + white * 0.02) / 1.02;
      samples[i] = last * 3.5 + white * 0.06;
    }
    const rain = context.createBufferSource(); rain.buffer = noise; rain.loop = true;
    const rainFilter = context.createBiquadFilter(); rainFilter.type = 'lowpass'; rainFilter.frequency.value = 1600;
    const rainGain = context.createGain(); rainGain.gain.value = 0.45;
    rain.connect(rainFilter).connect(rainGain).connect(master); rain.start(); sources.push(rain);
    [52, 104].forEach((frequency, index) => {
      const hum = context.createOscillator(); hum.type = 'sine'; hum.frequency.value = frequency;
      const gain = context.createGain(); gain.gain.value = index ? 0.01 : 0.035;
      hum.connect(gain).connect(master); hum.start(); sources.push(hum);
    });
  }
  function passTrain() {
    if (!enabled || document.hidden || context?.state !== 'running') return;
    const train = context.createBufferSource(); train.buffer = noise;
    const filter = context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 450;
    const gain = context.createGain(); gain.gain.value = 0;
    const pan = context.createStereoPanner();
    const now = context.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 2.5);
    gain.gain.linearRampToValueAtTime(0, now + 5.8);
    pan.pan.setValueAtTime(-0.8, now); pan.pan.linearRampToValueAtTime(0.8, now + 6);
    train.connect(filter).connect(gain).connect(pan).connect(master); train.start(now); train.stop(now + 6);
    train.onended = () => { train.disconnect(); filter.disconnect(); gain.disconnect(); pan.disconnect(); };
  }
  function fade(value) {
    if (!master) return;
    const now = context.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(value, now + 0.45);
  }
  async function setEnabled(value) {
    if (disposed) return false;
    enabled = value;
    clearInterval(timer);
    try {
      if (enabled) {
        if (!context) initialize();
        await context.resume();
        if (disposed || !enabled) return false;
        if (context.state !== 'running') throw new Error('Audio is suspended');
        fade(0.32);
        timer = setInterval(passTrain, 26000);
      } else {
        fade(0);
      }
      onState(context?.state || 'uninitialized');
      return enabled;
    } catch {
      enabled = false;
      fade(0);
      onState('unavailable');
      return false;
    }
  }
  async function setVisible(visible) {
    if (!context || disposed) return;
    try {
      if (!visible) await context.suspend();
      else if (enabled) {
        await context.resume();
        if (context.state !== 'running') throw new Error('Audio is suspended');
      }
    } catch {
      enabled = false;
      fade(0);
      onState('unavailable');
    }
  }
  function dispose() {
    if (disposed) return;
    disposed = true; enabled = false; clearInterval(timer);
    sources.forEach(source => { source.stop(); source.disconnect(); });
    if (context) { context.onstatechange = null; context.close().catch(() => {}); }
  }
  return { setEnabled, setVisible, dispose };
}
