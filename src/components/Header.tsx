import React from 'react';
import type { ViewState } from '../types';

interface HeaderProps {
  current: ViewState;
  onNavigate: (view: ViewState) => void;
}

const NAV_ITEMS: { id: ViewState; icon: string; label: string }[] = [
  { id: 'home', icon: '🏠', label: 'Home' },
  { id: 'discover', icon: '🎯', label: 'Discover' },
  { id: 'collections', icon: '🎬', label: 'Collections' },
  { id: 'iptv', icon: '📺', label: 'Live TV' },
  { id: 'settings', icon: '⚙️', label: 'Settings' },
];

export const Header: React.FC<HeaderProps> = ({ current, onNavigate }) => {
  const prevCurrent = React.useRef(current);
  React.useEffect(() => {
    const active = document.activeElement;
    const isFocusInHeader = active && active.closest('.app-header');
    
    if (isFocusInHeader && current !== prevCurrent.current) {
      const activeBtn = document.querySelector<HTMLElement>(`button.nav-tab-item[data-id="${current}"]`);
      activeBtn?.focus();
    }
    prevCurrent.current = current;
  }, [current]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const header = e.currentTarget.closest('.app-header');
    if (!header) return;
    const buttons = Array.from(
      header.querySelectorAll<HTMLElement>('button.nav-tab-item')
    );
    const index = buttons.indexOf(e.currentTarget);
    if (index === -1) return;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIdx = Math.min(index + 1, buttons.length - 1);
      const nextBtn = buttons[nextIdx];
      if (nextBtn) {
        nextBtn.focus();
        nextBtn.click();
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIdx = Math.max(index - 1, 0);
      const prevBtn = buttons[prevIdx];
      if (prevBtn) {
        prevBtn.focus();
        prevBtn.click();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const tabId = e.currentTarget.getAttribute('data-id') || current;
      
      let target: HTMLElement | null = null;
      switch (tabId) {
        case 'iptv':
          target = document.querySelector<HTMLElement>('.iptv-category-item.active') ||
                   document.querySelector<HTMLElement>('.iptv-category-item') ||
                   document.querySelector<HTMLElement>('.iptv-toolbar input') ||
                   document.querySelector<HTMLElement>('.focusable');
          break;
        case 'discover':
          target = document.querySelector<HTMLElement>('.focusable[placeholder*="Search"]') ||
                   document.querySelector<HTMLElement>('.discover-input-box input') ||
                   document.querySelector<HTMLElement>('.focusable');
          break;
        case 'collections':
          target = document.querySelector<HTMLElement>('.collection-card-btn') ||
                   document.querySelector<HTMLElement>('.collections-back-btn');
          break;
        case 'settings':
          target = document.querySelector<HTMLElement>('.focusable');
          break;
        case 'home':
        default:
          target = document.querySelector<HTMLElement>('.hero-btn') ||
                   document.querySelector<HTMLElement>('.card-focusable');
          break;
      }
      
      if (target) {
        target.focus();
      }
    }
  };

  return (
    <header className="app-header">
      <div className="logo-text">
        <span>🎬</span>
        <span>ViewTVPro</span>
      </div>

      <nav className="nav-row">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`nav-tab-item ${current === item.id ? 'active' : ''}`}
            tabIndex={0}
            aria-label={item.label}
            onKeyDown={handleKeyDown}
            data-id={item.id}
          >
            <span className="text-xl flex-shrink-0">{item.icon}</span>
            <span className="text-sm font-semibold truncate">{item.label}</span>
          </button>
        ))}
      </nav>
    </header>
  );
};
