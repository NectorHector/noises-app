// App Entry Point - wires audio engine to UI
import { engine } from './audio/engine.js';
import { binaural } from './audio/binaural.js';
import { noise } from './audio/noise.js';
import { foleySounds } from './audio/foley.js';
import { pad, chords, piano, setMood, setPitchOffset } from './audio/musical.js';
import { updateSliderFill, initAllSliders, toggleButton } from './ui/controls.js';
import { startTimer, clearTimer, isTimerActive, formatTime, setMasterVolumeTarget } from './ui/timer.js';
import { getCurrentState, hasActiveSounds } from './ui/mixer.js';
import { getAllPresets, saveUserPreset, deleteUserPreset } from './ui/presets.js';
import { requestWakeLock, releaseWakeLock } from './utils/wake-lock.js';
import { saveLastState, getLastState } from './utils/storage.js';
import { init as initOrb } from './ui/orb.js';

// Sound module registry
const soundModules = {
  binaural,
  noise,
  ...foleySounds,
  pad,
  chords,
  piano,
};

let isPlaying = false;
let audioInitialized = false;

// === Audio Context Init (on first user gesture) ===
async function ensureAudio() {
  if (!audioInitialized) {
    engine.init();
    audioInitialized = true;
  }
  await engine.resume();
}

// === Play / Pause ===
const playBtn = document.getElementById('play-btn');
const playIcon = document.getElementById('play-icon');
const pauseIcon = document.getElementById('pause-icon');

function updatePlayButton() {
  playIcon.classList.toggle('hidden', isPlaying);
  pauseIcon.classList.toggle('hidden', !isPlaying);
  playBtn.classList.toggle('active', isPlaying);
  // Adjust play icon margin when shown
  playBtn.querySelector('svg:not(.hidden)').style.marginLeft = isPlaying ? '0' : '2px';
}

playBtn.addEventListener('click', async () => {
  await ensureAudio();

  if (isPlaying) {
    // Pause all active sounds
    Object.values(soundModules).forEach(mod => {
      if (mod.active) mod.stop();
    });
    isPlaying = false;
    releaseWakeLock();
  } else {
    // Start all toggled-on sounds
    document.querySelectorAll('.sound-toggle[data-sound][aria-pressed="true"]').forEach(btn => {
      const name = btn.dataset.sound;
      const mod = soundModules[name];
      if (mod && !mod.active) mod.start();
    });

    if (hasActiveSounds()) {
      isPlaying = true;
      requestWakeLock();
    }
  }
  updatePlayButton();
  saveLastState(getCurrentState());
});

// === Sound Toggles ===
document.querySelectorAll('.sound-toggle[data-sound]').forEach(btn => {
  btn.addEventListener('click', async () => {
    await ensureAudio();
    const isOn = toggleButton(btn);
    const name = btn.dataset.sound;
    const mod = soundModules[name];
    if (!mod) return;

    if (isOn && isPlaying) {
      mod.start();
    } else if (!isOn) {
      mod.stop();
    }

    // Mark category as active if it has any active sounds
    updateCategoryStates();
    saveLastState(getCurrentState());
  });
});

// === Volume Sliders ===
document.querySelectorAll('.volume-slider[data-sound]').forEach(slider => {
  updateSliderFill(slider);
  slider.addEventListener('input', () => {
    updateSliderFill(slider);
    const name = slider.dataset.sound;
    const mod = soundModules[name];
    if (mod) mod.setVolume(parseInt(slider.value) / 100);
    saveLastState(getCurrentState());
  });
});

// === Master Volume ===
const masterSlider = document.getElementById('master-volume');
updateSliderFill(masterSlider);
masterSlider.addEventListener('input', () => {
  updateSliderFill(masterSlider);
  const vol = parseInt(masterSlider.value) / 100;
  engine.setMasterVolume(vol);
  setMasterVolumeTarget(vol);
  saveLastState(getCurrentState());
});

// === Binaural Parameters ===
const binauralFreqSlider = document.getElementById('binaural-freq');
const binauralFreqValue = document.getElementById('binaural-freq-value');
const binauralCarrierSlider = document.getElementById('binaural-carrier');
const binauralCarrierValue = document.getElementById('binaural-carrier-value');

binauralFreqSlider.addEventListener('input', () => {
  updateSliderFill(binauralFreqSlider);
  const freq = parseFloat(binauralFreqSlider.value);
  binauralFreqValue.textContent = freq + ' Hz';
  binaural.setBeatFrequency(freq);
});
updateSliderFill(binauralFreqSlider);

binauralCarrierSlider.addEventListener('input', () => {
  updateSliderFill(binauralCarrierSlider);
  const freq = parseFloat(binauralCarrierSlider.value);
  binauralCarrierValue.textContent = freq + ' Hz';
  binaural.setCarrierFrequency(freq);
});
updateSliderFill(binauralCarrierSlider);

// Binaural frequency presets (Delta, Theta, Alpha)
document.querySelectorAll('.param-preset[data-freq]').forEach(btn => {
  btn.addEventListener('click', () => {
    const freq = parseFloat(btn.dataset.freq);
    binauralFreqSlider.value = freq;
    updateSliderFill(binauralFreqSlider);
    binauralFreqValue.textContent = freq + ' Hz';
    binaural.setBeatFrequency(freq);
    // Update active state
    document.querySelectorAll('.param-preset[data-freq]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// === Noise Parameters ===
const noiseColorSlider = document.getElementById('noise-color');
const noiseColorValue = document.getElementById('noise-color-value');

function getColorName(val) {
  if (val < 20) return 'White';
  if (val < 40) return 'Light Pink';
  if (val < 60) return 'Pink';
  if (val < 80) return 'Brown';
  return 'Deep Brown';
}

noiseColorSlider.addEventListener('input', () => {
  updateSliderFill(noiseColorSlider);
  const val = parseInt(noiseColorSlider.value);
  noiseColorValue.textContent = getColorName(val);
  noise.setColor(val);
});
updateSliderFill(noiseColorSlider);

// Chorus toggle
const flangerToggle = document.getElementById('flanger-toggle');
const flangerParams = document.getElementById('flanger-params');
flangerToggle.addEventListener('click', () => {
  const isOn = toggleButton(flangerToggle);
  flangerParams.classList.toggle('hidden', !isOn);
  noise.setChorusEnabled(isOn);
});

// Chorus depth
const flangerDepth = document.getElementById('flanger-depth');
const flangerDepthValue = document.getElementById('flanger-depth-value');
flangerDepth.addEventListener('input', () => {
  updateSliderFill(flangerDepth);
  const val = parseInt(flangerDepth.value);
  flangerDepthValue.textContent = val + '%';
  noise.setChorusDepth(val / 100);
});
updateSliderFill(flangerDepth);

// Chorus rate
const flangerRate = document.getElementById('flanger-rate');
const flangerRateValue = document.getElementById('flanger-rate-value');
flangerRate.addEventListener('input', () => {
  updateSliderFill(flangerRate);
  const val = parseInt(flangerRate.value) / 100;
  flangerRateValue.textContent = val.toFixed(2) + ' Hz';
  noise.setChorusRate(val);
});
updateSliderFill(flangerRate);

// === Pitch Control ===
const pitchSlider = document.getElementById('pitch-slider');
const pitchValue = document.getElementById('pitch-value');
if (pitchSlider) {
  updateSliderFill(pitchSlider);
  pitchSlider.addEventListener('input', () => {
    updateSliderFill(pitchSlider);
    const val = parseInt(pitchSlider.value);
    pitchValue.textContent = (val > 0 ? '+' : '') + val;
    setPitchOffset(val);
  });
}

// === Mood Presets ===
document.querySelectorAll('.mood-preset').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mood-preset').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    setMood(btn.dataset.mood);
  });
});

// === Category Accordion ===
document.querySelectorAll('.category-header').forEach(header => {
  header.addEventListener('click', () => {
    const expanded = header.getAttribute('aria-expanded') === 'true';
    // Close all others
    document.querySelectorAll('.category-header').forEach(h => {
      h.setAttribute('aria-expanded', 'false');
    });
    if (!expanded) {
      header.setAttribute('aria-expanded', 'true');
      setTimeout(() => {
        header.closest('.category').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 320);
    }
  });
});

function updateCategoryStates() {
  document.querySelectorAll('.category').forEach(cat => {
    const hasActive = cat.querySelector('.sound-toggle[aria-pressed="true"]');
    cat.classList.toggle('active', !!hasActive);
  });
}

// === Sleep Timer ===
const timerBtn = document.getElementById('timer-btn');
const timerModal = document.getElementById('timer-modal');
const timerDisplay = document.getElementById('timer-display');
const timerCancel = document.getElementById('timer-cancel');

timerBtn.addEventListener('click', () => {
  timerModal.classList.remove('hidden');
  timerCancel.classList.toggle('hidden', !isTimerActive());
  // Highlight active timer option
  document.querySelectorAll('.timer-option[data-minutes]').forEach(o => o.classList.remove('active'));
});

timerModal.querySelector('.modal-backdrop').addEventListener('click', () => {
  timerModal.classList.add('hidden');
});

document.querySelectorAll('.timer-option[data-minutes]').forEach(btn => {
  btn.addEventListener('click', () => {
    const minutes = parseInt(btn.dataset.minutes);
    startTimer(minutes, {
      onTick: (remaining) => {
        timerDisplay.textContent = formatTime(remaining);
        timerDisplay.classList.remove('hidden');
      },
      onEnd: () => {
        // Stop all sounds
        Object.values(soundModules).forEach(mod => { if (mod.active) mod.stop(); });
        isPlaying = false;
        updatePlayButton();
        timerDisplay.classList.add('hidden');
        releaseWakeLock();
      },
    });
    timerModal.classList.add('hidden');
  });
});

timerCancel.addEventListener('click', () => {
  clearTimer();
  timerDisplay.classList.add('hidden');
  // Restore master volume
  const vol = parseInt(masterSlider.value) / 100;
  engine.setMasterVolume(vol);
  timerModal.classList.add('hidden');
});

// === Presets ===
const presetBtn = document.getElementById('preset-btn');
const presetModal = document.getElementById('preset-modal');
const presetList = document.getElementById('preset-list');
const savePresetBtn = document.getElementById('save-preset-btn');
const savePresetModal = document.getElementById('save-preset-modal');
const presetNameInput = document.getElementById('preset-name-input');
const savePresetConfirm = document.getElementById('save-preset-confirm');
const savePresetCancel = document.getElementById('save-preset-cancel');

function renderPresets() {
  const presets = getAllPresets();
  presetList.innerHTML = presets.map(p => `
    <div class="preset-item" data-preset-id="${p.id}">
      <span class="preset-item-name">${p.name}</span>
      ${p.builtin
        ? '<span class="preset-item-builtin">built-in</span>'
        : '<button class="preset-item-delete" data-delete-id="' + p.id + '">&times;</button>'}
    </div>
  `).join('');
}

presetBtn.addEventListener('click', () => {
  renderPresets();
  presetModal.classList.remove('hidden');
});

presetModal.querySelector('.modal-backdrop').addEventListener('click', () => {
  presetModal.classList.add('hidden');
});

presetList.addEventListener('click', async (e) => {
  // Handle delete
  const deleteBtn = e.target.closest('.preset-item-delete');
  if (deleteBtn) {
    e.stopPropagation();
    deleteUserPreset(parseInt(deleteBtn.dataset.deleteId));
    renderPresets();
    return;
  }

  // Handle load preset
  const item = e.target.closest('.preset-item');
  if (!item) return;

  const presets = getAllPresets();
  const preset = presets.find(p => String(p.id) === item.dataset.presetId);
  if (!preset) return;

  await ensureAudio();
  applyPreset(preset.state);
  presetModal.classList.add('hidden');
});

function applyPreset(state) {
  // Stop all sounds first
  Object.values(soundModules).forEach(mod => { if (mod.active) mod.stop(); });

  // Reset all toggles
  document.querySelectorAll('.sound-toggle[data-sound]').forEach(btn => {
    btn.setAttribute('aria-pressed', 'false');
  });

  // Apply volumes
  if (state.volumes) {
    Object.entries(state.volumes).forEach(([name, vol]) => {
      const slider = document.querySelector(`.volume-slider[data-sound="${name}"]`);
      if (slider) {
        slider.value = Math.round(vol * 100);
        updateSliderFill(slider);
      }
      const mod = soundModules[name];
      if (mod) mod.setVolume(vol);
    });
  }

  // Apply params
  if (state.params) {
    if (state.params.binauralFreq !== undefined) {
      binauralFreqSlider.value = state.params.binauralFreq;
      updateSliderFill(binauralFreqSlider);
      binauralFreqValue.textContent = state.params.binauralFreq + ' Hz';
      binaural.setBeatFrequency(state.params.binauralFreq);
    }
    if (state.params.binauralCarrier !== undefined) {
      binauralCarrierSlider.value = state.params.binauralCarrier;
      updateSliderFill(binauralCarrierSlider);
      binauralCarrierValue.textContent = state.params.binauralCarrier + ' Hz';
      binaural.setCarrierFrequency(state.params.binauralCarrier);
    }
    if (state.params.noiseColor !== undefined) {
      noiseColorSlider.value = state.params.noiseColor;
      updateSliderFill(noiseColorSlider);
      noiseColorValue.textContent = getColorName(state.params.noiseColor);
      noise.setColor(state.params.noiseColor);
    }
    if (state.params.flangerOn !== undefined) {
      flangerToggle.setAttribute('aria-pressed', state.params.flangerOn);
      flangerParams.classList.toggle('hidden', !state.params.flangerOn);
      noise.setChorusEnabled(state.params.flangerOn);
    }
    if (state.params.pitch !== undefined && pitchSlider) {
      pitchSlider.value = state.params.pitch;
      updateSliderFill(pitchSlider);
      pitchValue.textContent = (state.params.pitch > 0 ? '+' : '') + state.params.pitch;
      setPitchOffset(state.params.pitch);
    }
  }

  // Apply mood
  if (state.mood) {
    document.querySelectorAll('.mood-preset').forEach(b => b.classList.remove('active'));
    const moodBtn = document.querySelector(`.mood-preset[data-mood="${state.mood}"]`);
    if (moodBtn) moodBtn.classList.add('active');
    setMood(state.mood);
  }

  // Enable and start sounds
  if (state.sounds) {
    Object.keys(state.sounds).forEach(name => {
      if (!state.sounds[name]) return;
      const btn = document.querySelector(`.sound-toggle[data-sound="${name}"]`);
      if (btn) btn.setAttribute('aria-pressed', 'true');
      const mod = soundModules[name];
      if (mod) {
        // Apply volume before starting
        const vol = state.volumes?.[name];
        if (vol !== undefined) mod.setVolume(vol);
        mod.start();
      }
    });
  }

  isPlaying = hasActiveSounds();
  updatePlayButton();
  updateCategoryStates();
  if (isPlaying) requestWakeLock();
  saveLastState(getCurrentState());
}

// Save preset
savePresetBtn.addEventListener('click', () => {
  presetModal.classList.add('hidden');
  presetNameInput.value = '';
  savePresetModal.classList.remove('hidden');
  presetNameInput.focus();
});

savePresetModal.querySelector('.modal-backdrop').addEventListener('click', () => {
  savePresetModal.classList.add('hidden');
});

savePresetConfirm.addEventListener('click', () => {
  const name = presetNameInput.value.trim();
  if (!name) return;
  saveUserPreset(name, getCurrentState());
  savePresetModal.classList.add('hidden');
});

savePresetCancel.addEventListener('click', () => {
  savePresetModal.classList.add('hidden');
});

presetNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') savePresetConfirm.click();
});

// === Background Audio Support ===
// Keep audio playing when screen turns off / app goes to background
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && isPlaying) {
    // Re-acquire wake lock when coming back
    await requestWakeLock();
    // Ensure AudioContext is still running
    if (engine.ctx && engine.ctx.state === 'suspended') {
      await engine.ctx.resume();
    }
  }
});

// Prevent AudioContext suspension on some mobile browsers
// by periodically checking state when playing
let keepAliveInterval = null;
function startKeepAlive() {
  if (keepAliveInterval) return;
  keepAliveInterval = setInterval(async () => {
    if (isPlaying && engine.ctx && engine.ctx.state === 'suspended') {
      try { await engine.ctx.resume(); } catch {}
    }
  }, 5000);
}

function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}

// Start keep-alive when playing, stop when paused
const originalUpdatePlay = updatePlayButton;

// === Restore Last State ===
function restoreState() {
  const state = getLastState();
  if (!state) return;

  // Only restore volumes and params, not active sounds (user should press play)
  if (state.volumes) {
    Object.entries(state.volumes).forEach(([name, vol]) => {
      const slider = document.querySelector(`.volume-slider[data-sound="${name}"]`);
      if (slider) {
        slider.value = Math.round(vol * 100);
        updateSliderFill(slider);
      }
    });
  }
  if (state.params) {
    if (state.params.binauralFreq !== undefined) {
      binauralFreqSlider.value = state.params.binauralFreq;
      updateSliderFill(binauralFreqSlider);
      binauralFreqValue.textContent = state.params.binauralFreq + ' Hz';
    }
    if (state.params.binauralCarrier !== undefined) {
      binauralCarrierSlider.value = state.params.binauralCarrier;
      updateSliderFill(binauralCarrierSlider);
      binauralCarrierValue.textContent = state.params.binauralCarrier + ' Hz';
    }
    if (state.params.noiseColor !== undefined) {
      noiseColorSlider.value = state.params.noiseColor;
      updateSliderFill(noiseColorSlider);
      noiseColorValue.textContent = getColorName(state.params.noiseColor);
    }
    if (state.params.pitch !== undefined && pitchSlider) {
      pitchSlider.value = state.params.pitch;
      updateSliderFill(pitchSlider);
      pitchValue.textContent = (state.params.pitch > 0 ? '+' : '') + state.params.pitch;
    }
  }
  if (state.mood) {
    document.querySelectorAll('.mood-preset').forEach(b => b.classList.remove('active'));
    const moodBtn = document.querySelector(`.mood-preset[data-mood="${state.mood}"]`);
    if (moodBtn) moodBtn.classList.add('active');
  }
}

// Watch play state to manage keep-alive
const playObserver = new MutationObserver(() => {
  if (isPlaying) {
    startKeepAlive();
  } else {
    stopKeepAlive();
  }
});
playObserver.observe(playIcon, { attributes: true, attributeFilter: ['class'] });

// === Register Service Worker ===
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// Init
initAllSliders();
restoreState();
initOrb(document.getElementById('orb-container'));
