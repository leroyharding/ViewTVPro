import { useEffect, useCallback } from 'react';

export function useDpadNavigation() {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const active = document.activeElement as HTMLElement;

    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const input = active as HTMLInputElement;
        const start = input.selectionStart;
        const end = input.selectionEnd;
        if (e.key === 'ArrowLeft' && start !== 0) return;
        if (e.key === 'ArrowRight' && end !== input.value.length) return;
      }
    }

    const focusables = Array.from(
      document.querySelectorAll<HTMLElement>('[tabindex]:not([tabindex="-1"]), button, a, input, select, textarea')
    ).filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && !el.hidden;
    });

    if (focusables.length === 0) return;

    // Focus recovery fallback: if focus is lost (on body) or invalid, grab the first element
    if (!active || active === document.body || !focusables.includes(active)) {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        focusables[0]?.focus();
      }
      return;
    }

    const activeRect = active.getBoundingClientRect();
    const activeCX = activeRect.left + activeRect.width / 2;
    const activeCY = activeRect.top + activeRect.height / 2;

    let candidates: { el: HTMLElement; dist: number }[] = [];

    const filterByDirection = (dir: 'up' | 'down' | 'left' | 'right') => {
      for (const el of focusables) {
        if (el === active) continue;
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = cx - activeCX;
        const dy = cy - activeCY;

        let valid = false;
        switch (dir) {
          case 'up': valid = dy < -10; break;
          case 'down': valid = dy > 10; break;
          case 'left': valid = dx < -10; break;
          case 'right': valid = dx > 10; break;
        }

        if (valid) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          // Weight: prefer elements in the same axis
          const axisPenalty = (dir === 'up' || dir === 'down')
            ? Math.abs(dx) * 2
            : Math.abs(dy) * 2;
          candidates.push({ el, dist: dist + axisPenalty });
        }
      }
    };

    switch (e.key) {
      case 'ArrowUp':
        filterByDirection('up');
        break;
      case 'ArrowDown':
        filterByDirection('down');
        break;
      case 'ArrowLeft':
        filterByDirection('left');
        break;
      case 'ArrowRight':
        filterByDirection('right');
        break;
      default:
        return;
    }

    if (candidates.length > 0) {
      e.preventDefault();
      candidates.sort((a, b) => a.dist - b.dist);
      const target = candidates[0].el;
      target.focus({ preventScroll: false });
      target.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
