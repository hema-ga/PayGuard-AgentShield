import { useEffect, useRef, useState } from 'react';

function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Performs one subtle radar sweep when it mounts, then stays still. */
export function RadarSweep() {
  if (prefersReducedMotion()) return null;
  return (
    <div className="radar-sweep-layer" aria-hidden="true">
      <div className="sweep" />
    </div>
  );
}

/** Spawns a single expanding ripple at each click inside the wrapped area. */
export function ClickRippleLayer({ children }) {
  const containerRef = useRef(null);
  const [ripples, setRipples] = useState([]);

  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const el = containerRef.current;
    if (!el) return undefined;
    function handleClick(e) {
      const id = Date.now() + Math.random();
      setRipples((prev) => [...prev, { id, x: e.clientX, y: e.clientY }]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 650);
    }
    el.addEventListener('click', handleClick);
    return () => el.removeEventListener('click', handleClick);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {children}
      {ripples.map((r) => (
        <span key={r.id} className="click-ripple" style={{ left: r.x, top: r.y }} aria-hidden="true" />
      ))}
    </div>
  );
}

const STATUS_SPOT_COLOR = {
  clear: 'rgba(22, 163, 74, 0.18)',
  review: 'rgba(217, 119, 6, 0.2)',
  blocked: 'rgba(220, 38, 38, 0.18)',
};

/** A card with a soft cursor-following spotlight, subtly tinted by status. */
export function SpotlightCard({ status, className = '', children, ...rest }) {
  const ref = useRef(null);
  const reduced = prefersReducedMotion();

  function handleMouseMove(e) {
    if (reduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    ref.current.style.setProperty('--spot-x', `${e.clientX - rect.left}px`);
    ref.current.style.setProperty('--spot-y', `${e.clientY - rect.top}px`);
  }

  const spotColor = status ? STATUS_SPOT_COLOR[status] : undefined;

  return (
    <div
      ref={ref}
      className={`card card--spotlight ${className}`}
      style={spotColor ? { '--spot-color': spotColor } : undefined}
      onMouseMove={handleMouseMove}
      {...rest}
    >
      {children}
    </div>
  );
}
