import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { TMDBItem } from '../types';
import { IMG, IMG_ORIGINAL, getCollection, discoverRaw, getPersonMovies } from '../api/tmdb';
import { HYDRA_COLLECTIONS, type HydraCollection } from '../data/collections';
import { ContentCard } from './ContentCard';

interface CollectionsViewProps {
  onSelect: (item: TMDBItem) => void;
}

interface CollectionDetail {
  collection: HydraCollection;
  items: TMDBItem[];
  backdropPath: string | null;
}

/** Poster + backdrop fetched live from TMDB for each collection card */
interface CollectionPreview {
  posterPath: string | null;
  backdropPath: string | null;
}

export const CollectionsView: React.FC<CollectionsViewProps> = ({ onSelect }) => {
  const [activeCollection, setActiveCollection] = useState<CollectionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [previews, setPreviews] = useState<Record<string, CollectionPreview>>({});
  const [catalogType, setCatalogType] = useState<'movie' | 'series'>('movie');
  const gridRef = useRef<HTMLDivElement>(null);
  const backBtnRef = useRef<HTMLButtonElement>(null);

  // ── Prefetch real poster/backdrop for every collection card on mount ──
  useEffect(() => {
    let cancelled = false;

    const fetchPreview = async (col: HydraCollection): Promise<[string, CollectionPreview]> => {
      try {
        switch (col.type) {
          case 'tmdb_collection': {
            if (!col.tmdbCollectionId) return [col.id, { posterPath: null, backdropPath: null }];
            const data = await getCollection(col.tmdbCollectionId);
            return [col.id, {
              posterPath: data.poster_path,
              backdropPath: data.backdrop_path,
            }];
          }
          case 'discover_movie': {
            if (!col.discoverParams) return [col.id, { posterPath: null, backdropPath: null }];
            const data = await discoverRaw('movie', col.discoverParams);
            const first = data.results.find(r => r.poster_path);
            return [col.id, {
              posterPath: first?.poster_path ?? null,
              backdropPath: first?.backdrop_path ?? null,
            }];
          }
          case 'discover_tv': {
            if (!col.discoverParams) return [col.id, { posterPath: null, backdropPath: null }];
            const data = await discoverRaw('tv', col.discoverParams);
            const first = data.results.find(r => r.poster_path);
            return [col.id, {
              posterPath: first?.poster_path ?? null,
              backdropPath: first?.backdrop_path ?? null,
            }];
          }
          case 'stremio_catalog': {
            if (!col.stremioId) return [col.id, { posterPath: null, backdropPath: null }];
            const res = await fetch(`https://7a82163c306e-stremio-netflix-catalog-addon.baby-beamup.club/catalog/movie/${col.stremioId}.json`);
            if (!res.ok) return [col.id, { posterPath: null, backdropPath: null }];
            const data = await res.json();
            const metas = data.metas || [];
            const first = metas.find((r: any) => r.poster || r.background);
            return [col.id, {
              posterPath: first?.poster ?? null,
              backdropPath: first?.background ?? null,
            }];
          }
          case 'person_movies': {
            if (!col.personId) return [col.id, { posterPath: null, backdropPath: null }];
            const data = await getPersonMovies(col.personId);
            const directed = (data.crew || []).filter(
              (c: TMDBItem & { job?: string }) => c.job === 'Director' && c.poster_path
            );
            const fallback = (data.cast || []).filter(c => c.poster_path);
            const top = (directed.length > 0 ? directed : fallback)
              .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))[0];
            return [col.id, {
              posterPath: top?.poster_path ?? null,
              backdropPath: top?.backdrop_path ?? null,
            }];
          }
          default:
            return [col.id, { posterPath: null, backdropPath: null }];
        }
      } catch {
        return [col.id, { posterPath: null, backdropPath: null }];
      }
    };

    // Fetch all previews in parallel (batched in groups of 4 to avoid rate limits)
    (async () => {
      const batchSize = 4;
      for (let i = 0; i < HYDRA_COLLECTIONS.length; i += batchSize) {
        if (cancelled) return;
        const batch = HYDRA_COLLECTIONS.slice(i, i + batchSize);
        const results = await Promise.all(batch.map(fetchPreview));
        if (cancelled) return;
        setPreviews(prev => {
          const next = { ...prev };
          for (const [id, preview] of results) {
            next[id] = preview;
          }
          return next;
        });
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // Fetch a collection's items from TMDB / Stremio Addon
  const fetchCollectionItems = useCallback(async (col: HydraCollection, type: 'movie' | 'series' = 'movie') => {
    setLoading(true);
    try {
      let items: TMDBItem[] = [];
      let backdrop: string | null = null;

      switch (col.type) {
        case 'tmdb_collection': {
          if (!col.tmdbCollectionId) break;
          const data = await getCollection(col.tmdbCollectionId);
          items = (data.parts || []).filter(p => p.poster_path);
          backdrop = data.backdrop_path;
          items = items.map(i => ({ ...i, media_type: i.media_type || 'movie' }));
          break;
        }
        case 'discover_movie': {
          if (!col.discoverParams) break;
          const data = await discoverRaw('movie', col.discoverParams);
          items = data.results.filter(r => r.poster_path);
          items = items.map(i => ({ ...i, media_type: 'movie' }));
          if (items.length > 0) backdrop = items[0].backdrop_path;
          break;
        }
        case 'stremio_catalog': {
          if (!col.stremioId) break;
          const url = `https://7a82163c306e-stremio-netflix-catalog-addon.baby-beamup.club/catalog/${type}/${col.stremioId}.json`;
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Addon HTTP Error: ${res.status}`);
          const data = await res.json();
          const metas = data.metas || [];
          
          items = metas.map((meta: any) => ({
            id: meta.moviedb_id || meta.imdb_id || meta.id,
            title: meta.name,
            name: meta.name,
            overview: meta.description || '',
            poster_path: meta.poster || null,
            backdrop_path: meta.background || null,
            media_type: type === 'series' ? 'tv' : 'movie',
            vote_average: meta.imdbRating ? parseFloat(meta.imdbRating) : 0,
            release_date: meta.year,
            popularity: meta.popularity || 0,
          }));
          
          if (items.length > 0) {
            backdrop = items.find(i => i.backdrop_path)?.backdrop_path || items[0].backdrop_path;
          }
          break;
        }
        case 'discover_tv': {
          if (!col.discoverParams) break;
          const data = await discoverRaw('tv', col.discoverParams);
          items = data.results.filter(r => r.poster_path);
          items = items.map(i => ({ ...i, media_type: 'tv' }));
          if (items.length > 0) backdrop = items[0].backdrop_path;
          break;
        }
        case 'person_movies': {
          if (!col.personId) break;
          const data = await getPersonMovies(col.personId);
          const directed = (data.crew || []).filter(
            (c: TMDBItem & { job?: string }) => c.job === 'Director' && c.poster_path
          );
          const fallback = (data.cast || []).filter(c => c.poster_path);
          items = directed.length > 0 ? directed : fallback;
          items = items.map(i => ({ ...i, media_type: 'movie' }));
          // Remove duplicates
          const seen = new Set<number>();
          items = items.filter(i => {
            if (seen.has(i.id)) return false;
            seen.add(i.id);
            return true;
          });
          // Sort by release date
          items.sort((a, b) => {
            const da = a.release_date || '';
            const db = b.release_date || '';
            return da.localeCompare(db);
          });
          if (items.length > 0) backdrop = items[0].backdrop_path;
          break;
        }
      }

      setActiveCollection({ collection: col, items, backdropPath: backdrop });
    } catch (err) {
      console.error('Failed to load collection:', err);
      setActiveCollection({ collection: col, items: [], backdropPath: null });
    }
    setLoading(false);
  }, []);

  const handleOpenCollection = useCallback((col: HydraCollection) => {
    setCatalogType('movie');
    fetchCollectionItems(col, 'movie');
  }, [fetchCollectionItems]);

  const handleToggleCatalogType = (type: 'movie' | 'series') => {
    if (!activeCollection) return;
    setCatalogType(type);
    fetchCollectionItems(activeCollection.collection, type);
  };

  const handleBack = useCallback(() => {
    setActiveCollection(null);
    setTimeout(() => {
      const firstCard = gridRef.current?.querySelector<HTMLElement>('.collection-card-btn');
      firstCard?.focus();
    }, 100);
  }, []);

  // Focus back button when detail opens
  useEffect(() => {
    if (activeCollection && backBtnRef.current) {
      backBtnRef.current.focus();
    }
  }, [activeCollection]);

  // D-pad: handle Back button on Escape/Backspace
  useEffect(() => {
    if (!activeCollection) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' || (e.key === 'Escape' && activeCollection)) {
        e.preventDefault();
        e.stopPropagation();
        handleBack();
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [activeCollection, handleBack]);

  // ── Detail View ──
  if (activeCollection) {
    return (
      <div className="h-full flex flex-col fade-in collections-detail-view">
        {/* Backdrop */}
        {activeCollection.backdropPath && (
          <div className="collections-backdrop">
            <img
              src={activeCollection.backdropPath.startsWith('http') ? activeCollection.backdropPath : `${IMG_ORIGINAL}${activeCollection.backdropPath}`}
              alt=""
              className="collections-backdrop-img"
            />
            <div className="collections-backdrop-overlay" />
          </div>
        )}

        {/* Header bar */}
        <div className="collections-detail-header">
          <button
            ref={backBtnRef}
            onClick={handleBack}
            className="collections-back-btn focusable"
            tabIndex={0}
          >
            ← Back
          </button>
          <div className="collections-detail-title">
            <span className="text-3xl">{activeCollection.collection.emoji}</span>
            <h2>{activeCollection.collection.title}</h2>
            <span className="collections-detail-count">
              {activeCollection.items.length} titles
            </span>
          </div>

          {activeCollection.collection.type === 'stremio_catalog' && (
            <div className="flex items-center gap-3 ml-auto pr-6">
              <button
                className={`focusable px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  catalogType === 'movie' ? 'bg-orange-500 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
                }`}
                onClick={() => handleToggleCatalogType('movie')}
                tabIndex={0}
              >
                🎬 Movies
              </button>
              <button
                className={`focusable px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  catalogType === 'series' ? 'bg-orange-500 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
                }`}
                onClick={() => handleToggleCatalogType('series')}
                tabIndex={0}
              >
                📺 Series
              </button>
            </div>
          )}
        </div>

        {/* Movie/TV grid */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="collections-loading">
              <div className="collections-spinner" />
              <span>Loading collection...</span>
            </div>
          ) : activeCollection.items.length > 0 ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-5">
              {activeCollection.items.map((item, idx) => (
                <ContentCard
                  key={`${item.id}-${idx}`}
                  item={item}
                  onClick={onSelect}
                  size="large"
                />
              ))}
            </div>
          ) : (
            <div className="collections-empty">
              <span className="text-5xl mb-3">🎬</span>
              <p>No movies found in this collection</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Collections Grid ──
  return (
    <div className="h-full flex flex-col fade-in">
      <div className="flex-shrink-0 px-6 pt-5 pb-3">
        <h2 className="text-xl font-bold flex items-center gap-3">
          <span className="text-2xl">🎬</span>
          Hydra Collections
          <span className="text-sm text-white/30 font-normal">
            {HYDRA_COLLECTIONS.length} curated collections
          </span>
        </h2>
      </div>

      <div ref={gridRef} className="flex-1 overflow-y-auto px-6 py-2">
        <div className="collections-grid">
          {HYDRA_COLLECTIONS.map((col) => (
            <CollectionCard
              key={col.id}
              collection={col}
              preview={previews[col.id]}
              onOpen={handleOpenCollection}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Individual Collection Card ──
interface CollectionCardProps {
  collection: HydraCollection;
  preview?: CollectionPreview;
  onOpen: (col: HydraCollection) => void;
}

const CollectionCard: React.FC<CollectionCardProps> = ({ collection, preview, onOpen }) => {
  const backdropSrc = preview?.backdropPath
    ? (preview.backdropPath.startsWith('http') ? preview.backdropPath : `${IMG}${preview.backdropPath}`)
    : preview?.posterPath
      ? (preview.posterPath.startsWith('http') ? preview.posterPath : `${IMG}${preview.posterPath}`)
      : null;

  return (
    <button
      className="collection-card-btn"
      onClick={() => onOpen(collection)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(collection);
        }
      }}
      tabIndex={0}
      aria-label={collection.title}
    >
      {/* Real TMDB background image */}
      {backdropSrc ? (
        <img
          src={backdropSrc}
          alt=""
          className="collection-card-bg"
          loading="lazy"
        />
      ) : (
        <div className="collection-card-bg-placeholder" />
      )}
      <div className="collection-card-gradient" />

      {/* Poster thumbnail in corner */}
      {preview?.posterPath && (
        <div className="collection-card-poster">
          <img
            src={preview.posterPath.startsWith('http') ? preview.posterPath : `${IMG}${preview.posterPath}`}
            alt=""
            loading="lazy"
          />
        </div>
      )}

      {/* Content */}
      <div className="collection-card-content">
        <span className="collection-card-emoji">{collection.emoji}</span>
        <h3 className="collection-card-title">{collection.title}</h3>
        <span className="collection-card-type">
          {collection.type === 'tmdb_collection' && 'Box Set'}
          {collection.type === 'discover_movie' && 'Movie Collection'}
          {collection.type === 'discover_tv' && 'TV Collection'}
          {collection.type === 'person_movies' && 'Filmography'}
          {collection.type === 'stremio_catalog' && 'Streaming Catalog'}
        </span>
      </div>
    </button>
  );
};
