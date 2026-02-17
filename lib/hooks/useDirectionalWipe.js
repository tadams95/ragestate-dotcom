import { useCallback } from 'react';
import { useReducedMotion } from 'framer-motion';

/** Detect which edge of an element the cursor entered/exited from */
function getEdge(e, el) {
  const { left, top, width, height } = el.getBoundingClientRect();
  const x = (e.clientX - left - width / 2) / (width / 2);
  const y = (e.clientY - top - height / 2) / (height / 2);
  return Math.abs(x) > Math.abs(y)
    ? (x > 0 ? 'right' : 'left')
    : (y > 0 ? 'bottom' : 'top');
}

const CLIP_HIDDEN = {
  left:   'inset(0 100% 0 0)',
  right:  'inset(0 0 0 100%)',
  top:    'inset(0 0 100% 0)',
  bottom: 'inset(100% 0 0 0)',
};

/**
 * Directional wipe animation — accent border/fill reveals from the edge
 * the cursor entered and wipes away toward the exit edge.
 *
 * @param {{ disabled?: boolean }} [options]
 * @returns {{ onMouseEnter: (e: MouseEvent) => void, onMouseLeave: (e: MouseEvent) => void }}
 */
export function useDirectionalWipe({ disabled = false } = {}) {
  const prefersReducedMotion = useReducedMotion();

  const onMouseEnter = useCallback((e) => {
    if (disabled || prefersReducedMotion) return;
    const el = e.currentTarget;
    const edge = getEdge(e, el);
    el.classList.add('no-transition');
    el.style.setProperty('--wipe-clip', CLIP_HIDDEN[edge]);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.classList.remove('no-transition');
        el.style.setProperty('--wipe-clip', 'inset(0)');
      });
    });
  }, [disabled, prefersReducedMotion]);

  const onMouseLeave = useCallback((e) => {
    if (disabled || prefersReducedMotion) return;
    const el = e.currentTarget;
    const edge = getEdge(e, el);
    el.style.setProperty('--wipe-clip', CLIP_HIDDEN[edge]);
  }, [disabled, prefersReducedMotion]);

  return { onMouseEnter, onMouseLeave };
}
