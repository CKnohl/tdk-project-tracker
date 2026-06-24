// Tiny dependency-free confetti burst for completion celebrations.
// Uses the Web Animations API; respects prefers-reduced-motion; cleans up after.

export function celebrate(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const colors = ['#16a34a', '#22c55e', '#f59e0b', '#3b82f6', '#ef4444', '#a855f7'];
  const count = 90;

  const container = document.createElement('div');
  container.setAttribute('aria-hidden', 'true');
  container.style.cssText =
    'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden';
  document.body.appendChild(container);

  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    const size = 6 + Math.random() * 6;
    p.style.cssText =
      `position:absolute;top:-12px;left:${Math.random() * 100}%;` +
      `width:${size}px;height:${size * 0.6}px;background:${colors[i % colors.length]};` +
      `border-radius:1px;will-change:transform,opacity;`;
    container.appendChild(p);

    const dx = (Math.random() - 0.5) * 320;
    const dy = 320 + Math.random() * 420;
    const rot = Math.random() * 720;
    const duration = 1300 + Math.random() * 1100;

    p.animate(
      [
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)`, opacity: 0 },
      ],
      { duration, easing: 'cubic-bezier(0.2, 0.6, 0.4, 1)', fill: 'forwards' },
    );
  }

  window.setTimeout(() => container.remove(), 2600);
}
