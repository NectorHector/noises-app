// localStorage wrapper for presets and settings

const STORAGE_KEY = 'noises_data';

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function save(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* storage full or unavailable */ }
}

export function getPresets() {
  return load().presets || [];
}

export function savePreset(name, state) {
  const data = load();
  if (!data.presets) data.presets = [];
  data.presets.push({ name, state, id: Date.now() });
  save(data);
}

export function deletePreset(id) {
  const data = load();
  data.presets = (data.presets || []).filter(p => p.id !== id);
  save(data);
}

export function getLastState() {
  return load().lastState || null;
}

export function saveLastState(state) {
  const data = load();
  data.lastState = state;
  save(data);
}
