// Preset management

import { getPresets, savePreset, deletePreset } from '../utils/storage.js';

// Built-in presets
const BUILTIN_PRESETS = [
  {
    name: 'Deep Sleep',
    id: 'builtin_deep_sleep',
    builtin: true,
    state: {
      sounds: { binaural: true, noise: true },
      volumes: { binaural: 0.5, noise: 0.6 },
      params: { binauralFreq: 2, binauralCarrier: 150, noiseColor: 80, flangerOn: false },
      mood: 'calm',
    },
  },
  {
    name: 'Rainy Night',
    id: 'builtin_rainy',
    builtin: true,
    state: {
      sounds: { rain: true, thunder: true },
      volumes: { rain: 0.7, thunder: 0.35 },
      params: {},
      mood: 'calm',
    },
  },
  {
    name: 'Forest Morning',
    id: 'builtin_forest',
    builtin: true,
    state: {
      sounds: { birds: true, wind: true, water: true },
      volumes: { birds: 0.4, wind: 0.35, water: 0.3 },
      params: {},
      mood: 'calm',
    },
  },
  {
    name: 'Cozy Fireside',
    id: 'builtin_fireside',
    builtin: true,
    state: {
      sounds: { fireplace: true, pad: true, rain: true },
      volumes: { fireplace: 0.6, pad: 0.3, rain: 0.35 },
      params: {},
      mood: 'melancholy',
    },
  },
  {
    name: 'Focus',
    id: 'builtin_focus',
    builtin: true,
    state: {
      sounds: { binaural: true, noise: true },
      volumes: { binaural: 0.4, noise: 0.45 },
      params: { binauralFreq: 10, binauralCarrier: 200, noiseColor: 40, flangerOn: false },
      mood: 'calm',
    },
  },
  {
    name: 'Dreamscape',
    id: 'builtin_dreamscape',
    builtin: true,
    state: {
      sounds: { pad: true, piano: true, rain: true },
      volumes: { pad: 0.4, piano: 0.3, rain: 0.25 },
      params: {},
      mood: 'dreamy',
    },
  },
];

export function getAllPresets() {
  return [...BUILTIN_PRESETS, ...getPresets()];
}

export function saveUserPreset(name, state) {
  savePreset(name, state);
}

export function deleteUserPreset(id) {
  deletePreset(id);
}

export { BUILTIN_PRESETS };
