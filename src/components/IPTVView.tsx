import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { AppSettings, IPTVChannel } from '../types';
import { parseIPTVPlaylist, parseXtreamIPTV, groupChannels } from '../api/iptv';

const FAV_KEY = 'leeviewtvpro_iptv_favorites';

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch { /* ignore */ }
  return new Set();
}

function saveFavorites(favs: Set<string>) {
  localStorage.setItem(FAV_KEY, JSON.stringify([...favs]));
}

interface IPTVViewProps {
  settings: AppSettings;
  onPlay: (url: string, title: string) => void;
}

export const IPTVView: React.FC<IPTVViewProps> = ({ settings, onPlay }) => {
  const [channels, setChannels] = useState<IPTVChannel[]>([]);
  const [groups, setGroups] = useState<Record<string, IPTVChannel[]>>({});
  const [selectedGroup, setSelectedGroup] = useState<string>('All');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortAZ, setSortAZ] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites);

  const loadPlaylist = useCallback(async () => {
    const { iptvType, iptvUrl, xtreamHost, xtreamUser, xtreamPass } = settings;
    const hasConfig = iptvType === 'xtream'
      ? (xtreamHost && xtreamUser && xtreamPass)
      : iptvUrl;

    if (!hasConfig) return;
    setLoading(true);
    setError('');
    try {
      const chs = iptvType === 'xtream'
        ? await parseXtreamIPTV(xtreamHost, xtreamUser, xtreamPass)
        : await parseIPTVPlaylist(iptvUrl);
      setChannels(chs);
      const g = groupChannels(chs);
      setGroups(g);
    } catch (e) {
      setError(`Failed to load channels. Check your ${iptvType === 'xtream' ? 'Xtream Codes' : 'M3U'} settings.`);
      console.error(e);
    }
    setLoading(false);
  }, [settings]);

  useEffect(() => {
    loadPlaylist();
  }, [loadPlaylist]);

  const toggleFavorite = useCallback((ch: IPTVChannel, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      const key = ch.url;
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      saveFavorites(next);
      return next;
    });
  }, []);

  const favoriteChannels = useMemo(() => {
    return channels.filter(ch => favorites.has(ch.url));
  }, [channels, favorites]);

  const groupNames = useMemo(() => Object.keys(groups).sort(), [groups]);

  const filteredChannels = useMemo(() => {
    let list: IPTVChannel[];
    if (selectedGroup === 'All') {
      list = channels;
    } else if (selectedGroup === '⭐ Favorites') {
      list = favoriteChannels;
    } else {
      list = groups[selectedGroup] || [];
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(ch => ch.name.toLowerCase().includes(q));
    }

    if (sortAZ) {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [channels, groups, selectedGroup, search, sortAZ, favoriteChannels]);

  const { iptvType, iptvUrl, xtreamHost, xtreamUser, xtreamPass } = settings;
  const hasConfig = iptvType === 'xtream'
    ? (xtreamHost && xtreamUser && xtreamPass)
    : iptvUrl;

  const handleCategoryKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const sidebar = e.currentTarget.closest('.iptv-sidebar');
    if (!sidebar) return;
    const categoryItems = Array.from(
      sidebar.querySelectorAll<HTMLElement>('.iptv-category-item')
    );
    const index = categoryItems.indexOf(e.currentTarget);
    if (index === -1) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = Math.min(index + 1, categoryItems.length - 1);
      const target = categoryItems[nextIndex];
      if (target) {
        target.focus();
        target.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = Math.max(index - 1, 0);
      const target = categoryItems[prevIndex];
      if (target) {
        target.focus();
        target.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
      }
    } else if (e.key === 'ArrowLeft') {
      // Focus the Live TV tab in the main sidebar
      const mainSidebarItem = document.querySelector<HTMLElement>('.nav-tab-item.active') ||
                              document.querySelector<HTMLElement>('.nav-tab-item');
      if (mainSidebarItem) {
        e.preventDefault();
        mainSidebarItem.focus();
      }
    } else if (e.key === 'ArrowRight') {
      // Focus the search input or the first channel card
      const searchInput = document.querySelector<HTMLElement>('.iptv-toolbar input');
      const firstChannel = document.querySelector<HTMLElement>('.iptv-channel-card');
      if (searchInput) {
        e.preventDefault();
        searchInput.focus();
      } else if (firstChannel) {
        e.preventDefault();
        firstChannel.focus();
      }
    }
  }, []);

  const handleToolbarKeyDown = useCallback((e: React.KeyboardEvent<HTMLElement>) => {
    const toolbar = e.currentTarget.closest('.iptv-toolbar');
    if (!toolbar) return;
    
    // Find all focusable items in the toolbar that are currently in the DOM
    const items = Array.from(
      toolbar.querySelectorAll<HTMLElement>('input, button')
    );
    const index = items.indexOf(e.currentTarget);
    if (index === -1) return;

    if (e.key === 'ArrowRight') {
      if (index < items.length - 1) {
        e.preventDefault();
        items[index + 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft') {
      if (index > 0) {
        e.preventDefault();
        items[index - 1]?.focus();
      } else {
        // From leftmost, go to category list
        const activeCategory = document.querySelector<HTMLElement>('.iptv-category-item.active') ||
                               document.querySelector<HTMLElement>('.iptv-category-item');
        if (activeCategory) {
          e.preventDefault();
          activeCategory.focus();
        }
      }
    } else if (e.key === 'ArrowDown') {
      // Go down to first channel card
      const firstCard = document.querySelector<HTMLElement>('.iptv-channel-card');
      if (firstCard) {
        e.preventDefault();
        firstCard.focus();
      }
    } else if (e.key === 'ArrowUp') {
      // Go up to the Live TV tab in main sidebar
      const mainSidebarItem = document.querySelector<HTMLElement>('.nav-tab-item.active') ||
                              document.querySelector<HTMLElement>('.nav-tab-item');
      if (mainSidebarItem) {
        e.preventDefault();
        mainSidebarItem.focus();
      }
    }
  }, []);

  // ─── No Config State ───
  if (!hasConfig) {
    return (
      <div className="h-full flex items-center justify-center fade-in">
        <div className="text-center max-w-md space-y-6">
          <div className="text-center">
            <div className="text-7xl mb-6">📺</div>
            <h2 className="text-xl font-bold mb-2">No IPTV Configured</h2>
            <p className="text-white/40 text-sm mb-4">
              Configure your M3U playlist or Xtream Codes login credentials in Settings.
            </p>
            <button
              onClick={() => {
                const settingsTab = document.querySelector<HTMLElement>('button[data-id="settings"]');
                settingsTab?.click();
              }}
              className="focusable px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition-all border border-orange-600/40 inline-flex items-center gap-2"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'ArrowUp') {
                  const headerTab = document.querySelector<HTMLElement>('.nav-tab-item.active') ||
                                    document.querySelector<HTMLElement>('.nav-tab-item');
                  if (headerTab) {
                    e.preventDefault();
                    headerTab.focus();
                  }
                }
              }}
            >
              ⚙️ Go to Settings
            </button>
          </div>
          <div className="glass-panel p-4 rounded-xl text-left text-xs text-white/30 space-y-2">
            <p>💡 <strong className="text-white/50">Tip:</strong> You can switch between M3U and Xtream Codes modes in Settings.</p>
            <p>📡 Xtream Codes requires: Server URL, Username, Password</p>
            <p>📋 M3U requires: A direct URL to your .m3u or .m3u8 playlist file</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main Layout ───
  return (
    <div className="h-full flex fade-in">
      {/* ─── Left: Category Sidebar ─── */}
      <div className="iptv-sidebar flex flex-col">
        <div className="p-4 flex-shrink-0">
          <h2 className="text-base font-bold text-white/90 flex items-center gap-2">
            📺 <span>Categories</span>
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* All Channels */}
          <div
            className={`iptv-category-item ${selectedGroup === 'All' ? 'active' : ''}`}
            tabIndex={0}
            role="button"
            onClick={() => setSelectedGroup('All')}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                setSelectedGroup('All');
              } else {
                handleCategoryKeyDown(e);
              }
            }}
          >
            <div className="cat-icon">📡</div>
            <div className="cat-name">All Channels</div>
            <div className="cat-count">{channels.length}</div>
          </div>

          {/* Favorites */}
          {favoriteChannels.length > 0 && (
            <div
              className={`iptv-category-item ${selectedGroup === '⭐ Favorites' ? 'active' : ''}`}
              tabIndex={0}
              role="button"
              onClick={() => setSelectedGroup('⭐ Favorites')}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  setSelectedGroup('⭐ Favorites');
                } else {
                  handleCategoryKeyDown(e);
                }
              }}
            >
              <div className="cat-icon">⭐</div>
              <div className="cat-name">Favorites</div>
              <div className="cat-count">{favoriteChannels.length}</div>
            </div>
          )}

          {/* Group Categories */}
          {groupNames.map(name => (
            <div
              key={name}
              className={`iptv-category-item ${selectedGroup === name ? 'active' : ''}`}
              tabIndex={0}
              role="button"
              onClick={() => setSelectedGroup(name)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  setSelectedGroup(name);
                } else {
                  handleCategoryKeyDown(e);
                }
              }}
            >
              <div className="cat-icon">📁</div>
              <div className="cat-name" title={name}>{name}</div>
              <div className="cat-count">{groups[name]?.length || 0}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Right: Main Content Panel ─── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ─── Toolbar ─── */}
        <div className="iptv-toolbar">
          <div className="search-box">
            <span style={{ fontSize: '16px', opacity: 0.5 }}>🔍</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search channels..."
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                  const start = e.currentTarget.selectionStart;
                  const end = e.currentTarget.selectionEnd;
                  if (e.key === 'ArrowLeft' && start !== 0) return;
                  if (e.key === 'ArrowRight' && end !== e.currentTarget.value.length) return;
                }
                handleToolbarKeyDown(e);
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '14px' }}
                tabIndex={0}
                onKeyDown={handleToolbarKeyDown}
              >
                ✕
              </button>
            )}
          </div>

          <div className="ch-count">
            {filteredChannels.length} / {channels.length} channels
          </div>

          <button
            className={`tb-btn ${sortAZ ? 'active' : ''}`}
            onClick={() => setSortAZ(!sortAZ)}
            tabIndex={0}
            onKeyDown={handleToolbarKeyDown}
            title="Sort alphabetically"
          >
            {sortAZ ? '🔤 A→Z' : '🔤 Sort'}
          </button>

          <button
            className="tb-btn"
            onClick={loadPlaylist}
            tabIndex={0}
            onKeyDown={handleToolbarKeyDown}
            title="Refresh channels"
          >
            🔄 Refresh
          </button>
        </div>

        {/* ─── Channel Grid ─── */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="iptv-grid">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="iptv-skeleton-card" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="text-5xl mb-4">⚠️</div>
              <p className="text-red-400 text-sm mb-2">{error}</p>
              <button
                onClick={loadPlaylist}
                className="tb-btn"
                tabIndex={0}
                style={{ padding: '10px 24px', fontSize: '14px', borderRadius: '12px', background: 'rgba(255,107,0,0.15)', borderColor: 'rgba(255,107,0,0.3)', color: '#ff6b00' }}
              >
                🔄 Retry
              </button>
            </div>
          ) : filteredChannels.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="text-5xl mb-4">📭</div>
              <p className="text-white/40 text-sm">
                {search ? `No channels matching "${search}"` : 'No channels in this category'}
              </p>
            </div>
          ) : (
            <div className="iptv-grid">
              {filteredChannels.map((ch, idx) => (
                <div
                  key={`${ch.url}-${idx}`}
                  className="iptv-channel-card"
                  tabIndex={0}
                  role="button"
                  onClick={() => onPlay(ch.url, ch.name)}
                  onKeyDown={e => { if (e.key === 'Enter') onPlay(ch.url, ch.name); }}
                >
                  <div className="ch-logo">
                    {ch.logo ? (
                      <img src={ch.logo} alt="" loading="lazy" />
                    ) : (
                      <span style={{ fontSize: '24px' }}>📺</span>
                    )}
                  </div>
                  <div className="ch-info">
                    <div className="ch-name" title={ch.name}>{ch.name}</div>
                    <div className="ch-group">{ch.group}</div>
                  </div>
                  <div className="ch-actions">
                    <button
                      className={`ch-fav ${favorites.has(ch.url) ? 'is-fav' : ''}`}
                      onClick={(e) => toggleFavorite(ch, e)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); toggleFavorite(ch, e); } }}
                      tabIndex={0}
                      title={favorites.has(ch.url) ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      {favorites.has(ch.url) ? '★' : '☆'}
                    </button>
                    <span className="ch-play">▶</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
