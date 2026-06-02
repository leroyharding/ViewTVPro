import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { TMDBItem, ViewState } from './types';
import { getTrending, discoverContent } from './api/tmdb';
import { useSettings } from './hooks/useSettings';
import { useDpadNavigation } from './hooks/useDpad';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { ContentRow } from './components/ContentRow';
import { DetailModal } from './components/DetailModal';
import { VideoPlayer } from './components/VideoPlayer';
import { DiscoverView } from './components/DiscoverView';
import { SettingsView } from './components/SettingsView';
import { IPTVView } from './components/IPTVView';
import { StreamsView } from './components/StreamsView';
import { CollectionsView } from './components/CollectionsView';

interface PlayerState {
  url: string;
  title: string;
}

interface CategoryRow {
  title: string;
  items: TMDBItem[];
  loading: boolean;
}

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('home');
  const [trendingMovies, setTrendingMovies] = useState<TMDBItem[]>([]);
  const [trendingTV, setTrendingTV] = useState<TMDBItem[]>([]);
  const [loadingMovies, setLoadingMovies] = useState(true);
  const [loadingTV, setLoadingTV] = useState(true);
  const [selectedItem, setSelectedItem] = useState<TMDBItem | null>(null);
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [categoryRows, setCategoryRows] = useState<CategoryRow[]>([]);
  const [prevView, setPrevView] = useState<ViewState>('home');
  const [scrapeTarget, setScrapeTarget] = useState<{
    item: TMDBItem;
    season?: number;
    episode?: number;
  } | null>(null);
  const [history, setHistory] = useState<ViewState[]>([]);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const { settings, updateSettings } = useSettings();
  const mainRef = useRef<HTMLDivElement>(null);

  useDpadNavigation();

  // Fade out splash screen when component mounts
  useEffect(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) {
      splash.classList.add('fade-out');
      const timer = setTimeout(() => {
        splash.remove();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Load trending content
  useEffect(() => {
    getTrending('movie').then(data => {
      setTrendingMovies(data.results.filter(r => r.poster_path));
      setLoadingMovies(false);
    }).catch(() => setLoadingMovies(false));

    getTrending('tv').then(data => {
      setTrendingTV(data.results.filter(r => r.poster_path));
      setLoadingTV(false);
    }).catch(() => setLoadingTV(false));

    // Load genre-specific rows
    const genreRows: { title: string; type: 'movie' | 'tv'; genre: number }[] = [
      { title: '💥 Action Movies', type: 'movie', genre: 28 },
      { title: '😂 Comedy Movies', type: 'movie', genre: 35 },
      { title: '🧟 Horror Movies', type: 'movie', genre: 27 },
      { title: '🚀 Sci-Fi & Fantasy TV', type: 'tv', genre: 10765 },
      { title: '🎭 Drama TV Shows', type: 'tv', genre: 18 },
      { title: '🎬 Documentary', type: 'movie', genre: 99 },
    ];

    setCategoryRows(genreRows.map(g => ({ title: g.title, items: [], loading: true })));

    genreRows.forEach((g, idx) => {
      discoverContent(g.type, { genre: g.genre, page: 1 }).then(data => {
        setCategoryRows(prev => {
          const next = [...prev];
          next[idx] = {
            title: g.title,
            items: data.results.filter(r => r.poster_path).slice(0, 20),
            loading: false,
          };
          return next;
        });
      }).catch(() => {
        setCategoryRows(prev => {
          const next = [...prev];
          next[idx] = { ...next[idx], loading: false };
          return next;
        });
      });
    });
  }, []);

  const lastFocusedRef = useRef<HTMLElement | null>(null);

  const handleSelectItem = useCallback((item: TMDBItem) => {
    lastFocusedRef.current = document.activeElement as HTMLElement;
    setSelectedItem(item);
  }, []);

  const handlePlay = useCallback((url: string, title: string) => {
    lastFocusedRef.current = document.activeElement as HTMLElement;
    setPlayer({ url, title });
  }, []);

  const handleClosePlayer = useCallback(() => {
    setPlayer(null);
    setTimeout(() => {
      if (lastFocusedRef.current && document.body.contains(lastFocusedRef.current)) {
        lastFocusedRef.current.focus();
      }
    }, 100);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedItem(null);
    setTimeout(() => {
      if (lastFocusedRef.current && document.body.contains(lastFocusedRef.current)) {
        lastFocusedRef.current.focus();
      }
    }, 100);
  }, []);

  const handleNavigate = useCallback((v: ViewState) => {
    setHistory(prev => {
      if (v === 'home') return [];
      if (prev[prev.length - 1] === view) return prev;
      return [...prev, view];
    });
    setView(v);
    setSelectedItem(null);
    setScrapeTarget(null);
  }, [view]);

  const handleFindStreams = useCallback((item: TMDBItem, season?: number, episode?: number) => {
    if (!lastFocusedRef.current || lastFocusedRef.current === document.body) {
      lastFocusedRef.current = document.activeElement as HTMLElement;
    }
    setPrevView(view);
    setScrapeTarget({ item, season, episode });
    setView('streams');
  }, [view]);

  const handleBackFromStreams = useCallback(() => {
    setView(prevView);
    setScrapeTarget(null);
    setTimeout(() => {
      if (lastFocusedRef.current && document.body.contains(lastFocusedRef.current)) {
        lastFocusedRef.current.focus();
      }
    }, 100);
  }, [prevView]);

  // Back button handler for Android bridge
  useEffect(() => {
    (window as unknown as Record<string, unknown>).handleAndroidBackPress = () => {
      if (showExitDialog) {
        setShowExitDialog(false);
        return true;
      }
      if (player) {
        handleClosePlayer();
        return true;
      }
      if (view === 'streams') {
        handleBackFromStreams();
        return true;
      }
      if (selectedItem) {
        handleCloseDetail();
        return true;
      }
      if (view === 'home') {
        lastFocusedRef.current = document.activeElement as HTMLElement;
        setShowExitDialog(true);
        return true;
      }
      if (history.length > 0) {
        const prev = history[history.length - 1];
        setHistory(prevHist => prevHist.slice(0, -1));
        setView(prev);
        return true;
      }
      setView('home');
      return true;
    };
  }, [player, selectedItem, view, prevView, handleClosePlayer, handleBackFromStreams, handleCloseDetail, history, showExitDialog]);

  // Escape key handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showExitDialog) {
          setShowExitDialog(false);
        } else if (player) {
          handleClosePlayer();
        } else if (selectedItem) {
          if (view === 'streams') {
            handleBackFromStreams();
          } else {
            handleCloseDetail();
          }
        } else if (view === 'home') {
          lastFocusedRef.current = document.activeElement as HTMLElement;
          setShowExitDialog(true);
        } else if (history.length > 0) {
          const prev = history[history.length - 1];
          setHistory(prevHist => prevHist.slice(0, -1));
          setView(prev);
        } else {
          setView('home');
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [player, selectedItem, view, prevView, handleClosePlayer, handleBackFromStreams, handleCloseDetail, history, showExitDialog]);

  // Auto-focus management for exit confirmation dialog
  useEffect(() => {
    if (showExitDialog) {
      setTimeout(() => {
        const cancelBtn = document.getElementById('btn-exit-cancel');
        if (cancelBtn) cancelBtn.focus();
      }, 50);
    } else {
      setTimeout(() => {
        if (lastFocusedRef.current && document.body.contains(lastFocusedRef.current)) {
          lastFocusedRef.current.focus();
        }
      }, 100);
    }
  }, [showExitDialog]);

  const rdKey = settings.rdManualKey || settings.rdToken || '';

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0a0a1a]">
      {/* Top Header */}
      {view !== 'streams' && (
        <Header
          current={view}
          onNavigate={handleNavigate}
        />
      )}

      {/* Main Content */}
      <div ref={mainRef} className="flex-1 overflow-hidden flex flex-col">
        {view === 'home' && (
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2">
            {/* Hero Banner */}
            <HeroBanner
              items={[...trendingMovies.slice(0, 3), ...trendingTV.slice(0, 3)]}
              onSelect={handleSelectItem}
            />

            {/* Content Rows */}
            <ContentRow
              title="🔥 Trending Movies"
              items={trendingMovies}
              onSelect={handleSelectItem}
              loading={loadingMovies}
            />
            <ContentRow
              title="📺 Trending TV Shows"
              items={trendingTV}
              onSelect={handleSelectItem}
              loading={loadingTV}
            />

            {/* Genre Category Rows */}
            {categoryRows.map((row, idx) => (
              <ContentRow
                key={idx}
                title={row.title}
                items={row.items}
                onSelect={handleSelectItem}
                loading={row.loading}
              />
            ))}
          </div>
        )}

        {view === 'discover' && (
          <DiscoverView onSelect={handleSelectItem} />
        )}

        {view === 'iptv' && (
          <IPTVView
            settings={settings}
            onPlay={handlePlay}
          />
        )}

        {view === 'collections' && (
          <CollectionsView onSelect={handleSelectItem} />
        )}

        {view === 'settings' && (
          <SettingsView
            settings={settings}
            onUpdate={updateSettings}
          />
        )}

        {view === 'streams' && scrapeTarget && (
          <StreamsView
            item={scrapeTarget.item}
            season={scrapeTarget.season}
            episode={scrapeTarget.episode}
            onBack={handleBackFromStreams}
            onPlay={handlePlay}
            rdToken={rdKey}
          />
        )}
      </div>

      {/* Detail Modal */}
      {selectedItem && view !== 'streams' && (
        <DetailModal
          item={selectedItem}
          onClose={handleCloseDetail}
          onFindStreams={handleFindStreams}
          onSelectItem={handleSelectItem}
        />
      )}

      {/* Video Player */}
      {player && (
        <VideoPlayer
          url={player.url}
          title={player.title}
          onClose={handleClosePlayer}
        />
      )}

      {/* Exit Confirmation Dialog */}
      {showExitDialog && (
        <div className="fixed inset-0 bg-[#0a0a1a]/90 backdrop-blur-md z-[10000] flex items-center justify-center p-4">
          <div className="bg-[#12122c]/95 border border-orange-500/30 p-8 rounded-2xl max-w-md w-full text-center shadow-[0_0_50px_rgba(255,126,0,0.2)] animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-4">Exit ViewTV Pro</h2>
            <p className="text-gray-300 mb-8 text-sm">Are you sure you want to exit the application?</p>
            <div className="flex gap-4 justify-center">
              <button
                id="btn-exit-confirm"
                tabIndex={0}
                onClick={() => {
                  const bridge = (window as any).AndroidBridge;
                  if (bridge && typeof bridge.exitApp === 'function') {
                    bridge.exitApp();
                  } else {
                    window.close();
                  }
                }}
                className="px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-[#12122c] cursor-pointer"
              >
                Exit
              </button>
              <button
                id="btn-exit-cancel"
                tabIndex={0}
                onClick={() => setShowExitDialog(false)}
                className="px-6 py-3 bg-[#1e1e3f] hover:bg-[#2a2a57] text-white font-semibold rounded-xl border border-gray-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-[#12122c] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
