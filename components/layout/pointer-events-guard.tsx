'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';

/**
 * Radix modal primitives (Dialog, DropdownMenu, Select, Popover, Sheet) set
 * `pointer-events: none` on <body> while open and restore it on close. A close
 * that races with a navigation or another layer toggling can leave that style
 * stuck, which makes the whole page swallow the next click — the classic
 * "I have to click the button twice" bug.
 *
 * This guard clears the residue, but only when no Radix layer is actually open
 * (so it never fights a legitimately-open modal):
 *  - on every route change, and
 *  - on pointerdown (capture phase) — clearing before the click is hit-tested
 *    lets the *same* click land on its target instead of needing a second one.
 */
export function PointerEventsGuard() {
  const pathname = usePathname();

  const clearIfStuck = React.useCallback(() => {
    if (document.body.style.pointerEvents !== 'none') return;
    const layerOpen = document.querySelector(
      '[data-radix-popper-content-wrapper], [role="dialog"][data-state="open"], [role="menu"][data-state="open"]',
    );
    if (!layerOpen) document.body.style.pointerEvents = '';
  }, []);

  React.useEffect(() => {
    // A swallowed click is what usually triggers the navigation in the first
    // place; make sure the destination starts with a clean body.
    document.body.style.pointerEvents = '';
  }, [pathname]);

  React.useEffect(() => {
    const onPointerDown = () => clearIfStuck();
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [clearIfStuck]);

  return null;
}
