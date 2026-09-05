"use client";

import { useEffect, useRef, useState } from "react";

/** Expo-out, matching the --ease-out curve the CSS uses. */
function easeOut(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/**
 * Counts from the previous value to the next one so a figure that changes
 * reads as having moved rather than having been replaced.
 *
 * Returns the target immediately when the user has asked for reduced motion,
 * and on the first render, so the page never animates up from zero on load.
 */
export function useCountUp(target: number, duration = 700): number {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  const frame = useRef<number | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      from.current = target;
      setValue(target);
      return;
    }

    const reduced =
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced || from.current === target) {
      from.current = target;
      setValue(target);
      return;
    }

    const start = performance.now();
    const origin = from.current;
    const delta = target - origin;

    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setValue(origin + delta * easeOut(t));
      if (t < 1) {
        frame.current = requestAnimationFrame(step);
      } else {
        from.current = target;
      }
    };

    frame.current = requestAnimationFrame(step);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      // Land on wherever the interrupted run reached, so a new target
      // continues from there instead of snapping backwards.
      from.current = target;
    };
  }, [target, duration]);

  return value;
}
