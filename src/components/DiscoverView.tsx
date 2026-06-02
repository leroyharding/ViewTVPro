import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { TMDBItem } from '../types';
import { GENRES_MOVIE, GENRES_TV } from '../types';
import { discoverContent, searchMulti } from '../api/tmdb';
import { ContentCard } from './ContentCard';

interface DiscoverViewProps {
  onSelect: (item: TMDBItem) => void;
}

const YEARS = Array.from({ length: 30 }, (_, i) => 2026 - i);

export const DiscoverView: React.FC<DiscoverViewProps> = ({ onSelect }) => {
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>('movie');
  const [genre, setGenre] = useState<number>(0);
  const [year, setYear] = useState<number>(0);
  const [results, setResults] = useState<TMDBItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  // Search local state
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TMDBItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const genres = mediaType === 'movie' ? GENRES_MOVIE : GENRES_TV;

  const fetchContent = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const data = await discoverContent(mediaType, {
        genre: genre || undefined,
        year: year || undefined,
        page: p,
      });
      if (p === 1) {
        setResults(data.results.filter(r => r.poster_path));
      } else {
        setResults(prev => [...prev, ...data.results.filter(r => r.poster_path)]);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [mediaType, genre, year]);

  useEffect(() => {
    if (!query) {
      setPage(1);
      fetchContent(1);
    }
  }, [fetchContent, query]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      const headerTab = document.querySelector<HTMLElement>('.nav-tab-item.active') ||
                        document.querySelector<HTMLElement>('.nav-tab-item');
      if (headerTab) {
        e.preventDefault();
        headerTab.focus();
      }
    }
  };

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSearchResults([]);
      setSearched(false);
      return;
    }
    setSearchLoading(true);
    setSearched(true);
    try {
      const data = await searchMulti(q);
      setSearchResults(data.results.filter(r => r.media_type !== 'person' && r.poster_path));
    } catch {
      setSearchResults([]);
    }
    setSearchLoading(false);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 500);
  };

  const handleClearSearch = () => {
    setQuery('');
    setSearchResults([]);
    setSearched(false);
    inputRef.current?.focus();
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchContent(next);
  };

  return (
    <div className="h-full flex flex-col fade-in">
      {/* Search & Filters */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2 space-y-3">
        <h2 className="text-lg font-bold">🎯 Discover & Search</h2>

        {/* Search Bar */}
        <div className="glass-panel flex items-center gap-3 px-4 py-3 rounded-xl border border-white/5 focus-within:border-orange-500 transition-colors">
          <span className="text-xl">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleSearchChange}
            placeholder="Search movies, TV shows..."
            className="flex-1 bg-transparent outline-none text-white placeholder-white/30 text-base focusable"
            tabIndex={0}
            onKeyDown={handleInputKeyDown}
          />
          {query && (
            <button
              onClick={handleClearSearch}
              className="text-white/40 hover:text-white/70 text-base focusable"
              tabIndex={0}
            >
              ✕
            </button>
          )}
        </div>

        {/* Filters (Shown when search is empty) */}
        {!query && (
          <div className="flex gap-4 flex-wrap items-center">
            {/* Media Type Toggle */}
            <div className="flex rounded-lg overflow-hidden border border-white/10">
              {(['movie', 'tv'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setMediaType(t)}
                  className={`focusable px-5 py-2.5 text-sm font-medium transition-colors ${
                    mediaType === t ? 'bg-orange-500 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
                  }`}
                  tabIndex={0}
                >
                  {t === 'movie' ? '🎬 Movies' : '📺 TV Shows'}
                </button>
              ))}
            </div>

            {/* Genre Select */}
            <select
              value={genre}
              onChange={e => setGenre(Number(e.target.value))}
              className="focusable bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white/80 outline-none"
              tabIndex={0}
            >
              <option value={0}>All Genres</option>
              {Object.entries(genres).map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>

            {/* Year Select */}
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="focusable bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white/80 outline-none"
              tabIndex={0}
            >
              <option value={0}>All Years</option>
              {YEARS.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {query ? (
          searchLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="text-orange-400 animate-pulse">Searching...</div>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
              {searchResults.map((item, idx) => (
                <ContentCard key={`${item.id}-${idx}`} item={item} onClick={onSelect} />
              ))}
            </div>
          ) : searched ? (
            <div className="flex flex-col items-center justify-center h-48 text-white/30">
              <span className="text-4xl mb-2">🎭</span>
              <p>No results found</p>
            </div>
          ) : null
        ) : (
          results.length > 0 ? (
            <>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 mb-4">
                {results.map((item, idx) => (
                  <ContentCard key={`${item.id}-${idx}`} item={item} onClick={onSelect} />
                ))}
              </div>
              <div className="flex justify-center pb-4">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="focusable px-6 py-2.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 text-sm font-medium disabled:opacity-50"
                  tabIndex={0}
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            </>
          ) : loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="text-orange-400 animate-pulse">Discovering content...</div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-white/30">
              <span className="text-4xl mb-2">🎯</span>
              <p>No content found with current filters</p>
            </div>
          )
        )}
      </div>
    </div>
  );
};
