// Plasma orb - canvas-based energy/nebula effect
// Renders a breathing plasma orb with white-hot center and red fire tendrils

const SIZE = 200;       // Internal canvas resolution
const HALF = SIZE / 2;
const BLOB_COUNT = 12;
const TENDRIL_COUNT = 8;

let canvas, ctx;
let animId = null;
let blobs = [];
let tendrils = [];
let time = 0;

function init(container) {
  canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  canvas.className = 'plasma-canvas';
  container.innerHTML = '';
  container.appendChild(canvas);
  ctx = canvas.getContext('2d');

  // Create orbiting energy blobs
  blobs = [];
  for (let i = 0; i < BLOB_COUNT; i++) {
    blobs.push({
      angle: (Math.PI * 2 * i) / BLOB_COUNT,
      radius: 15 + Math.random() * 25,
      orbitRadius: 10 + Math.random() * 30,
      speed: 0.3 + Math.random() * 0.5,
      size: 20 + Math.random() * 30,
      phase: Math.random() * Math.PI * 2,
    });
  }

  // Create tendril paths
  tendrils = [];
  for (let i = 0; i < TENDRIL_COUNT; i++) {
    tendrils.push({
      angle: (Math.PI * 2 * i) / TENDRIL_COUNT + Math.random() * 0.5,
      length: 30 + Math.random() * 35,
      width: 8 + Math.random() * 15,
      speed: 0.2 + Math.random() * 0.4,
      waveFreq: 2 + Math.random() * 3,
      phase: Math.random() * Math.PI * 2,
    });
  }

  start();
}

function drawBlob(x, y, size, intensity) {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, size);
  const r = Math.min(255, Math.round(200 + intensity * 55));
  const g = Math.min(255, Math.round(30 + intensity * 60));
  const b = Math.min(255, Math.round(20 + intensity * 30));
  grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.5 + intensity * 0.4})`);
  grad.addColorStop(0.4, `rgba(${Math.round(r * 0.7)}, ${Math.round(g * 0.4)}, ${Math.round(b * 0.3)}, ${0.3 + intensity * 0.2})`);
  grad.addColorStop(1, 'rgba(60, 5, 5, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();
}

function drawTendril(t, breathe) {
  const cx = HALF;
  const cy = HALF;
  const baseAngle = t.angle + Math.sin(time * t.speed + t.phase) * 0.6;
  const len = t.length * (0.6 + breathe * 0.6);
  const w = t.width * (0.4 + breathe * 0.7);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(baseAngle);

  const grad = ctx.createLinearGradient(0, 0, len, 0);
  const alpha = 0.2 + breathe * 0.5;
  grad.addColorStop(0, `rgba(220, 60, 30, ${alpha})`);
  grad.addColorStop(0.3, `rgba(180, 25, 15, ${alpha * 0.7})`);
  grad.addColorStop(0.7, `rgba(120, 10, 5, ${alpha * 0.3})`);
  grad.addColorStop(1, 'rgba(60, 5, 0, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, 0);

  // Wavy tendril shape
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    const frac = i / steps;
    const x = frac * len;
    const wave = Math.sin(frac * t.waveFreq + time * t.speed * 2 + t.phase) * w * frac * 0.5;
    const taper = w * (1 - frac * 0.7);
    ctx.lineTo(x, wave + taper);
  }
  for (let i = steps; i >= 1; i--) {
    const frac = i / steps;
    const x = frac * len;
    const wave = Math.sin(frac * t.waveFreq + time * t.speed * 2 + t.phase) * w * frac * 0.5;
    const taper = w * (1 - frac * 0.7);
    ctx.lineTo(x, wave - taper);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, SIZE, SIZE);

  // Breathing cycle: 6 seconds
  const breathCycle = (Math.sin(time * 0.35) + 1) / 2; // 0..1
  const breathe = breathCycle * breathCycle; // ease-in for more dramatic dim

  ctx.globalCompositeOperation = 'lighter';

  // Draw tendrils (behind blobs)
  for (const t of tendrils) {
    drawTendril(t, breathe);
  }

  // Draw orbiting energy blobs
  for (const b of blobs) {
    const angle = b.angle + time * b.speed;
    const pulse = Math.sin(time * 1.5 + b.phase) * 0.3 + 0.7;
    const orbit = b.orbitRadius * (0.4 + breathe * 0.7);
    const x = HALF + Math.cos(angle) * orbit;
    const y = HALF + Math.sin(angle) * orbit;
    const size = b.size * (0.5 + breathe * 0.6) * pulse;
    drawBlob(x, y, size, breathe * pulse);
  }

  // Core glow - red/orange mid layer
  const midSize = 35 + breathe * 20;
  const midGrad = ctx.createRadialGradient(HALF, HALF, 0, HALF, HALF, midSize);
  midGrad.addColorStop(0, `rgba(255, 120, 60, ${0.6 + breathe * 0.4})`);
  midGrad.addColorStop(0.3, `rgba(220, 50, 20, ${0.4 + breathe * 0.3})`);
  midGrad.addColorStop(0.7, `rgba(150, 20, 10, ${0.15 + breathe * 0.15})`);
  midGrad.addColorStop(1, 'rgba(80, 5, 5, 0)');
  ctx.fillStyle = midGrad;
  ctx.beginPath();
  ctx.arc(HALF, HALF, midSize, 0, Math.PI * 2);
  ctx.fill();

  // White-hot center bloom
  const coreSize = 18 + breathe * 12;
  const coreGrad = ctx.createRadialGradient(HALF, HALF, 0, HALF, HALF, coreSize);
  coreGrad.addColorStop(0, `rgba(255, 255, 255, ${0.5 + breathe * 0.5})`);
  coreGrad.addColorStop(0.2, `rgba(255, 220, 180, ${0.4 + breathe * 0.4})`);
  coreGrad.addColorStop(0.5, `rgba(255, 100, 50, ${0.2 + breathe * 0.25})`);
  coreGrad.addColorStop(1, 'rgba(200, 30, 10, 0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(HALF, HALF, coreSize, 0, Math.PI * 2);
  ctx.fill();

  // Outer diffuse glow
  const outerSize = 60 + breathe * 30;
  const outerGrad = ctx.createRadialGradient(HALF, HALF, 20, HALF, HALF, outerSize);
  outerGrad.addColorStop(0, `rgba(180, 30, 15, ${0.1 + breathe * 0.15})`);
  outerGrad.addColorStop(0.5, `rgba(100, 10, 5, ${0.05 + breathe * 0.08})`);
  outerGrad.addColorStop(1, 'rgba(40, 0, 0, 0)');
  ctx.fillStyle = outerGrad;
  ctx.beginPath();
  ctx.arc(HALF, HALF, outerSize, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalCompositeOperation = 'source-over';

  time += 0.016; // ~60fps time step
  animId = requestAnimationFrame(render);
}

function start() {
  if (!animId) {
    render();
  }
}

function stop() {
  if (animId) {
    cancelAnimationFrame(animId);
    animId = null;
  }
}

// Pause when tab hidden to save battery
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stop();
  } else {
    start();
  }
});

export { init, start, stop };
