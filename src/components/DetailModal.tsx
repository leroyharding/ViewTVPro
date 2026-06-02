import React, { useState, useEffect, useRef } from 'react';
import type { TMDBItem, TMDBDetail, TMDBEpisode } from '../types';
import { getDetail, getSeasonEpisodes, getRecommendations, IMG, IMG_ORIGINAL, getTitle, getYear, getMediaType } from '../api/tmdb';
import { ContentRow } from './ContentRow';

interface DetailModalProps {
  item: TMDBItem;
  onClose: () => void;
  onFindStreams: (item: TMDBItem, season?: number, episode?: number) => void;
  onSelectItem: (item: TMDBItem) => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({ item, onClose, onFindStreams, onSelectItem }) => {
  const [detail, setDetail] = useState<TMDBDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState<TMDBEpisode[]>([]);
  const [loadingEps, setLoadingEps] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [recommendations, setRecommendations] = useState<TMDBItem[]>([]);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const trailerCloseBtnRef = useRef<HTMLButtonElement>(null);

  const mediaType = getMediaType(item);

  useEffect(() => {
    closeBtnRef.current?.focus();
  }, []);

  useEffect(() => {
    if (showTrailer) {
      trailerCloseBtnRef.current?.focus();
    } else {
      closeBtnRef.current?.focus();
    }
  }, [showTrailer]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const loadData = async () => {
      try {
        let finalId = item.id;
        let finalMediaType = mediaType;
        const itemId = item.id as unknown as string | number;
        if (typeof itemId === 'string' && itemId.startsWith('tt')) {
          const { findByImdbId } = await import('../api/tmdb');
          const resolved = await findByImdbId(itemId);
          if (resolved) {
            finalId = resolved.id;
            finalMediaType = (resolved.media_type as 'movie' | 'tv') || mediaType;
          }
        }

        const d = await getDetail(finalMediaType, finalId as number);
        if (!cancelled) {
          setDetail(d);
          setLoading(false);
        }

        const recs = await getRecommendations(finalMediaType, finalId as number);
        if (!cancelled) {
          setRecommendations(recs.results.filter(r => r.poster_path).slice(0, 10));
        }
      } catch (err) {
        console.error('DetailModal loading failed:', err);
        if (!cancelled) setLoading(false);
      }
    };

    loadData();
    return () => { cancelled = true; };
  }, [item.id, mediaType]);

  // Load episodes when season changes
  useEffect(() => {
    if (mediaType !== 'tv' || !detail) return;
    let cancelled = false;
    setLoadingEps(true);
    getSeasonEpisodes(detail.id, selectedSeason).then(data => {
      if (!cancelled) {
        setEpisodes(data.episodes || []);
        setLoadingEps(false);
      }
    }).catch(() => { if (!cancelled) setLoadingEps(false); });
    return () => { cancelled = true; };
  }, [selectedSeason, mediaType, detail]);

  const handleFindStreamsClick = (season?: number, episode?: number) => {
    onFindStreams(detail || item, season, episode);
  };

  const trailerKey = detail?.videos?.results?.find(
    v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
  )?.key;

  // Handle back press
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showTrailer) setShowTrailer(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, showTrailer]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="glass-panel-strong w-[90%] max-w-[1100px] h-[85vh] flex flex-col overflow-hidden slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Backdrop Header */}
        <div className="relative h-[260px] flex-shrink-0 overflow-hidden">
          {detail?.backdrop_path ? (
            <img src={`${IMG_ORIGINAL}${detail.backdrop_path}`} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-900/50 to-purple-900/50" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a1e] via-[#0a0a1e]/60 to-transparent" />
          <button
            ref={closeBtnRef}
            onClick={onClose}
            className="focusable absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center text-lg hover:bg-black/80"
            tabIndex={0}
          >
            ✕
          </button>

          {/* Info overlay */}
          <div className="absolute bottom-4 left-4 right-4 flex items-end gap-4">
            {detail?.poster_path && (
              <img
                src={`${IMG}${detail.poster_path}`}
                alt=""
                className="w-[100px] h-[150px] rounded-lg object-cover shadow-2xl flex-shrink-0 border border-white/10"
              />
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold drop-shadow-lg">{getTitle(detail || item)}</h2>
              {detail?.tagline && <p className="text-sm text-white/50 italic mt-0.5">{detail.tagline}</p>}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 font-bold uppercase">
                  {mediaType === 'tv' ? 'TV Series' : 'Movie'}
                </span>
                {(detail || item).vote_average > 0 && (
                  <span className="text-xs text-yellow-400 font-bold">★ {(detail || item).vote_average.toFixed(1)}</span>
                )}
                <span className="text-xs text-white/40">{getYear(detail || item)}</span>
                {detail?.runtime && <span className="text-xs text-white/40">{detail.runtime} min</span>}
                {detail?.number_of_seasons && (
                  <span className="text-xs text-white/40">{detail.number_of_seasons} seasons</span>
                )}
                {detail?.genres?.map(g => (
                  <span key={g.id} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/50">{g.name}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-orange-400 animate-pulse text-lg">Loading details...</div>
            </div>
          ) : (
            <>
              {/* Overview */}
              <p className="text-sm text-white/60 leading-relaxed">{detail?.overview || item.overview}</p>

              {/* Actions */}
              <div className="flex gap-4 flex-wrap">
                {mediaType === 'movie' && (
                  <button
                    onClick={() => handleFindStreamsClick()}
                    className="focusable px-6 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-base"
                    tabIndex={0}
                  >
                    🔍 Find Streams
                  </button>
                )}
                {trailerKey && (
                  <button
                    onClick={() => setShowTrailer(true)}
                    className="focusable px-6 py-3.5 rounded-xl bg-red-600/80 hover:bg-red-600 text-white font-semibold text-base"
                    tabIndex={0}
                  >
                    ▶ Trailer
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="focusable px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-base"
                  tabIndex={0}
                >
                  ← Go Back
                </button>
              </div>

              {/* YouTube Trailer */}
              {showTrailer && trailerKey && (
                <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
                  <iframe
                    src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&enablejsapi=1&fs=1`}
                    className="w-full h-full border-0"
                    allow="autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                    title="Trailer"
                  />
                  <button
                    ref={trailerCloseBtnRef}
                    onClick={() => setShowTrailer(false)}
                    className="focusable absolute top-6 left-6 w-12 h-12 rounded-full bg-black/60 text-white flex items-center justify-center text-xl hover:bg-black/85 border border-white/10"
                    tabIndex={0}
                    aria-label="Close trailer"
                  >
                    ←
                  </button>
                </div>
              )}

              {/* TV Show Seasons & Episodes */}
              {mediaType === 'tv' && detail?.seasons && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-white/80">Seasons</h3>
                  <div className="flex gap-2.5 overflow-x-auto pb-1 mb-3 flex-nowrap">
                    {detail.seasons
                      .filter(s => s.season_number > 0)
                      .map(s => (
                        <button
                          key={s.season_number}
                          onClick={() => setSelectedSeason(s.season_number)}
                          className={`focusable px-4 py-2 rounded-xl text-sm font-medium transition-colors flex-shrink-0 ${
                            selectedSeason === s.season_number
                              ? 'bg-orange-500 text-white'
                              : 'bg-white/5 text-white/60 hover:bg-white/10'
                          }`}
                          tabIndex={0}
                        >
                          Season {s.season_number}
                        </button>
                      ))}
                  </div>

                  {/* Episodes */}
                  {loadingEps ? (
                    <div className="text-sm text-orange-400 animate-pulse">Loading episodes...</div>
                  ) : (
                    <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-2">
                      {episodes.map(ep => (
                        <div
                          key={ep.episode_number}
                          className="focusable flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors bg-white/3 hover:bg-white/5 border border-transparent"
                          tabIndex={0}
                          onClick={() => handleFindStreamsClick(selectedSeason, ep.episode_number)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleFindStreamsClick(selectedSeason, ep.episode_number);
                          }}
                          role="button"
                        >
                          {ep.still_path && (
                            <img
                              src={`${IMG}${ep.still_path}`}
                              alt=""
                              className="w-24 h-14 rounded object-cover flex-shrink-0"
                              loading="lazy"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              E{ep.episode_number} — {ep.name}
                            </p>
                            <p className="text-[11px] text-white/40 line-clamp-1">{ep.overview}</p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleFindStreamsClick(selectedSeason, ep.episode_number); }}
                            className="focusable flex-shrink-0 px-3 py-1.5 rounded bg-orange-500/80 hover:bg-orange-500 text-white text-xs font-medium"
                            tabIndex={0}
                          >
                            🔍
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Similar Content / Recommendations */}
              {recommendations.length > 0 && (
                <div className="border-t border-white/5 pt-4">
                  <ContentRow
                    title="🎯 More Like This"
                    items={recommendations}
                    onSelect={onSelectItem}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

