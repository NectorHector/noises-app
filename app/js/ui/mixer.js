// Mixer - tracks which sounds are active and their state

export function getCurrentState() {
  const state = {
    sounds: {},
    volumes: {},
    params: {},
    mood: 'calm',
  };

  // Collect active sounds
  document.querySelectorAll('.sound-toggle[data-sound]').forEach(btn => {
    const sound = btn.dataset.sound;
    const isOn = btn.getAttribute('aria-pressed') === 'true';
    if (isOn) state.sounds[sound] = true;
  });

  // Collect volumes
  document.querySelectorAll('.volume-slider[data-sound]').forEach(slider => {
    state.volumes[slider.dataset.sound] = parseInt(slider.value) / 100;
  });

  // Collect params
  const binauralFreq = document.getElementById('binaural-freq');
  const binauralCarrier = document.getElementById('binaural-carrier');
  const noiseColor = document.getElementById('noise-color');
  const reverbToggle = document.getElementById('reverb-toggle');
  const reverbAmount = document.getElementById('reverb-amount');

  if (binauralFreq) state.params.binauralFreq = parseFloat(binauralFreq.value);
  if (binauralCarrier) state.params.binauralCarrier = parseFloat(binauralCarrier.value);
  if (noiseColor) state.params.noiseColor = parseInt(noiseColor.value);
  if (reverbToggle) state.params.reverbOn = reverbToggle.getAttribute('aria-pressed') === 'true';
  if (reverbAmount) state.params.reverbAmount = parseInt(reverbAmount.value);

  // Pitch
  const pitchSlider = document.getElementById('pitch-slider');
  if (pitchSlider) state.params.pitch = parseInt(pitchSlider.value);

  // Mood
  const activeMood = document.querySelector('.mood-preset.active');
  if (activeMood) state.mood = activeMood.dataset.mood;

  return state;
}

export function hasActiveSounds() {
  return document.querySelectorAll('.sound-toggle[data-sound][aria-pressed="true"]').length > 0;
}
