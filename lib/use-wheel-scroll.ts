import * as React from 'react';

/**
 * Ref callback that makes an overflow container scroll on mouse wheel even when
 * it's a portaled dropdown rendered inside a Radix Dialog. The Dialog's
 * react-remove-scroll lock blocks native wheel scrolling on portaled content, so
 * we attach a non-passive wheel listener and scroll the element imperatively.
 *
 * Returns a ref callback (React 19 cleanup-on-unmount supported). Usage:
 *   const scrollRef = useWheelScroll();
 *   <div ref={scrollRef} className="max-h-56 overflow-y-auto">…</div>
 */
export function useWheelScroll() {
  return React.useCallback((node: HTMLElement | null) => {
    if (!node) return;
    const onWheel = (e: WheelEvent) => {
      if (node.scrollHeight <= node.clientHeight) return; // nothing to scroll
      e.preventDefault();
      node.scrollTop += e.deltaY;
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, []);
}
