'use client';
import { useLayoutEffect, useRef, type DependencyList, type RefObject } from 'react';
import gsap from 'gsap';

/**
 * Animates bar chart primitives inside the returned ref's subtree on mount / dep change:
 * [data-chart-bar] / [data-chart-hbar] grow in from 0 height/width (real layout tween,
 * not a scale transform, so labels living inside bars reflow instead of distorting).
 * Runs in useLayoutEffect so nothing flashes at full size before collapsing to animate.
 * Respects prefers-reduced-motion.
 */
export function useChartReveal<T extends HTMLElement>(deps: DependencyList): RefObject<T | null> {
  const ref = useRef<T>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dur = (v: number) => (reduced ? 0 : v);

    const ctx = gsap.context(() => {
      root.querySelectorAll<HTMLElement>('[data-chart-bar]').forEach((el, i) => {
        const target = el.style.height || '100%';
        gsap.fromTo(el, { height: 0 }, { height: target, duration: dur(0.7), ease: 'power2.out', delay: dur(i * 0.03) });
      });
      root.querySelectorAll<HTMLElement>('[data-chart-hbar]').forEach((el, i) => {
        const target = el.style.width || '100%';
        gsap.fromTo(el, { width: 0 }, { width: target, duration: dur(0.7), ease: 'power2.out', delay: dur(i * 0.03) });
      });
    }, root);

    return () => ctx.revert();
  }, deps);

  return ref;
}
