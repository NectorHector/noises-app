// Sleep Timer with fade-out

import { engine } from '../audio/engine.js';

let timerInterval = null;
let endTime = null;
let onTimerEnd = null;
let onTimerTick = null;

export function startTimer(minutes, { onEnd, onTick } = {}) {
  clearTimer();
  endTime = Date.now() + minutes * 60 * 1000;
  onTimerEnd = onEnd;
  onTimerTick = onTick;

  timerInterval = setInterval(() => {
    const remaining = endTime - Date.now();
    if (remaining <= 0) {
      clearTimer();
      if (onTimerEnd) onTimerEnd();
      return;
    }

    // Start fading 60 seconds before end
    if (remaining <= 60000) {
      const fadeProgress = remaining / 60000;
      engine.setMasterVolume(fadeProgress * getMasterVolumeTarget(), 0.5);
    }

    if (onTimerTick) onTimerTick(remaining);
  }, 1000);

  if (onTimerTick) onTimerTick(endTime - Date.now());
}

export function clearTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  endTime = null;
}

export function isTimerActive() {
  return timerInterval !== null;
}

export function getRemainingMs() {
  return endTime ? Math.max(0, endTime - Date.now()) : 0;
}

export function formatTime(ms) {
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

// Track what the user set the master volume to (before timer fade)
let masterVolumeTarget = 0.75;
export function setMasterVolumeTarget(v) { masterVolumeTarget = v; }
export function getMasterVolumeTarget() { return masterVolumeTarget; }
