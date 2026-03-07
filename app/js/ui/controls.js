// UI Controls - slider fill updates, toggle handling

export function updateSliderFill(slider) {
  const min = parseFloat(slider.min) || 0;
  const max = parseFloat(slider.max) || 100;
  const val = parseFloat(slider.value);
  const pct = ((val - min) / (max - min)) * 100;
  slider.style.setProperty('--fill', pct + '%');
}

export function initAllSliders() {
  document.querySelectorAll('.slider').forEach(updateSliderFill);
}

export function setupSliderEvents(selector, onChange) {
  document.querySelectorAll(selector).forEach(slider => {
    updateSliderFill(slider);
    const handler = () => {
      updateSliderFill(slider);
      onChange(slider);
    };
    slider.addEventListener('input', handler);
  });
}

export function toggleButton(btn) {
  const pressed = btn.getAttribute('aria-pressed') === 'true';
  btn.setAttribute('aria-pressed', !pressed);
  // Subtle haptic feedback
  if (navigator.vibrate) navigator.vibrate(10);
  return !pressed;
}
