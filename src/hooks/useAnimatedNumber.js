import { useEffect, useRef, useState } from "react";

const isNum = (v) => typeof v === "number" && Number.isFinite(v);

// Smoothly counts from the number currently on screen to the new target.
// Non-numbers (null while loading, etc.) pass straight through untouched.
export function useAnimatedNumber(target, duration = 600) {
  const [display, setDisplay] = useState(target);
  const shownRef = useRef(target); // what's on screen right now

  useEffect(() => {
    const from = shownRef.current;
    const skip =
      !isNum(target) ||
      !isNum(from) ||
      from === target ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (skip) {
      shownRef.current = target;
      setDisplay(target);
      return;
    }

    let frame;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // fast start, gentle landing
      const value = t === 1 ? target : from + (target - from) * eased;
      shownRef.current = value;
      setDisplay(value);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  // If the target is a real number but state hasn't caught up yet (the first
  // render after it appears), show the target directly, never null.
  return isNum(target) && isNum(display) ? display : target;
}