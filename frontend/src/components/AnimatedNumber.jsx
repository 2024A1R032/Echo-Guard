import React, { useEffect, useRef, useState } from 'react';

// Counts smoothly from the previous number to the new one. Jumps straight there if the
// person has asked their system to reduce motion.
export default function AnimatedNumber({ value, duration = 450 }) {
  const [display, setDisplay] = useState(value);
  const shown = useRef(value);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || shown.current === value) {
      shown.current = value;
      setDisplay(value);
      return undefined;
    }
    const from = shown.current;
    const start = performance.now();
    let frame;
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      shown.current = Math.round(from + (value - from) * eased);
      setDisplay(shown.current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <>{display}</>;
}
