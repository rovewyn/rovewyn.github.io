function createRainBuffers(context) {
  const duration = 18;
  const sampleRate = context.sampleRate;
  const length = sampleRate * duration;
  const bed = context.createBuffer(2, length, sampleRate);
  const drops = context.createBuffer(2, length, sampleRate);
  const bedChannels = [bed.getChannelData(0), bed.getChannelData(1)];
  const dropChannels = [drops.getChannelData(0), drops.getChannelData(1)];

  // A quiet, broad rain bed with slow changes in intensity, without bass rumble.
  for (let i = 0; i < length; i++) {
    const phase = i / length * Math.PI * 2;
    const intensity = 0.88 + Math.sin(phase) * 0.08 + Math.sin(phase * 3) * 0.04;
    const shared = (Math.random() * 2 - 1) * 0.45;
    for (let channel = 0; channel < 2; channel++) {
      bedChannels[channel][i] = (shared + (Math.random() * 2 - 1) * 0.65) * intensity;
    }
  }

  // Irregular, short splashes give the rain its patter. No pitched drop tones.
  for (let time = 0; time < duration;) {
    time += 0.035 - Math.log(1 - Math.random()) / 11;
    if (time >= duration) break;
    const start = Math.floor(time * sampleRate);
    const release = 0.018 + Math.random() * 0.026;
    const attack = 0.002 + Math.random() * 0.002;
    const count = Math.ceil((attack + release * 7) * sampleRate);
    const amplitude = 0.2 + Math.random() ** 2 * 0.8;
    const pan = Math.PI * (0.15 + Math.random() * 0.7) / 2;
    const levels = [Math.cos(pan), Math.sin(pan)];
    const lowCoefficient = 1 - Math.exp(-2 * Math.PI * (2400 + Math.random() * 2400) / sampleRate);
    const highCoefficient = 1 - Math.exp(-2 * Math.PI * 600 / sampleRate);
    let low = 0;
    let high = 0;
    for (let i = 0; i < count; i++) {
      low += lowCoefficient * (Math.random() * 2 - 1 - low);
      high += highCoefficient * (low - high);
      const elapsed = i / sampleRate;
      const envelope = elapsed < attack ? elapsed / attack : Math.exp(-(elapsed - attack) / release);
      const splash = (low - high) * envelope * amplitude;
      // Wrap each tail into the start so the loop has no cut-off droplets.
      const index = (start + i) % length;
      for (let channel = 0; channel < 2; channel++) {
        dropChannels[channel][index] += splash * levels[channel];
      }
    }
  }
  return { bed, drops };
}

export function createAmbience(onState) {
  let context;
  let master;
  let enabled = false;
  let disposed = false;
  const sources = [];
  const nodes = [];

  function initialize() {
    context = new AudioContext();
    context.onstatechange = () => onState(context.state);
    master = context.createGain();
    master.gain.value = 0;
    master.connect(context.destination);
    nodes.push(master);

    const { bed, drops } = createRainBuffers(context);
    const rain = context.createBufferSource();
    rain.buffer = bed;
    rain.loop = true;
    const highpass = context.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 400;
    highpass.Q.value = 0.5;
    const lowpass = context.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 5000;
    lowpass.Q.value = 0.5;
    const softness = context.createBiquadFilter();
    softness.type = 'highshelf';
    softness.frequency.value = 3200;
    softness.gain.value = -6;
    const rainGain = context.createGain();
    rainGain.gain.value = 0.3;
    rain.connect(highpass).connect(lowpass).connect(softness).connect(rainGain).connect(master);
    rain.start();
    sources.push(rain);
    nodes.push(highpass, lowpass, softness, rainGain);

    const patter = context.createBufferSource();
    patter.buffer = drops;
    patter.loop = true;
    const patterGain = context.createGain();
    patterGain.gain.value = 0.42;
    patter.connect(patterGain).connect(master);
    patter.start();
    sources.push(patter);
    nodes.push(patterGain);
  }
  function fade(value) {
    if (!master) return;
    const now = context.currentTime;
    master.gain.cancelAndHoldAtTime(now);
    master.gain.linearRampToValueAtTime(value, now + 0.7);
  }
  async function setEnabled(value) {
    if (disposed) return false;
    enabled = value;
    try {
      if (enabled) {
        if (!context) initialize();
        await context.resume();
        if (disposed || !enabled) return false;
        if (context.state !== 'running') throw new Error('Audio is suspended');
        fade(0.28);
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
    disposed = true;
    enabled = false;
    sources.forEach(source => { source.stop(); source.disconnect(); });
    nodes.forEach(node => node.disconnect());
    if (context) { context.onstatechange = null; context.close().catch(() => {}); }
  }
  return { setEnabled, setVisible, dispose };
}
