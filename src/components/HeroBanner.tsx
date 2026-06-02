import React, { useState, useEffect, useCallback } from 'react';
import type { TMDBItem } from '../types';
import { IMG_ORIGINAL, getTitle, getYear } from '../api/tmdb';

interface HeroBannerProps {
  items: TMDBItem[];
  onSelect: (item: TMDBItem) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ items, onSelect }) => {
  const [idx, setIdx] = useState(0);

  const featured = items.slice(0, 6);
  const current = featured[idx];

  const next = useCallback(() => {
    setIdx(i => (i + 1) % featured.length);
  }, [featured.length]);

  useEffect(() => {
    if (featured.length === 0) return;
    const timer = setInterval(next, 8000);
    return () => clearInterval(timer);
  }, [next, featured.length]);

  if (!current) return null;

  return (
    <div className="relative h-[320px] mb-4 rounded-2xl overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0">
        {current.backdrop_path ? (
          <img
            src={`${IMG_ORIGINAL}${current.backdrop_path}`}
            alt=""
            className="w-full h-full object-cover transition-opacity duration-700"
            key={current.id}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900/40 to-blue-900/40" />
        )}
      </div>

      {/* Gradients */}
      <div className="absolute inset-0 hero-gradient" />
      <div className="absolute bottom-0 left-0 right-0 h-32 hero-gradient-bottom" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-8">
        <div className="max-w-lg fade-in" key={current.id}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-400 font-bold uppercase">
              {current.media_type === 'tv' ? 'TV Series' : 'Movie'}
            </span>
            {current.vote_average > 0 && (
              <span className="text-xs text-yellow-400 font-bold">★ {current.vote_average.toFixed(1)}</span>
            )}
            <span className="text-xs text-white/40">{getYear(current)}</span>
          </div>
          <h1 className="text-3xl font-bold mb-2 leading-tight drop-shadow-lg">{getTitle(current)}</h1>
          <p className="text-sm text-white/60 line-clamp-2 mb-4">{current.overview}</p>
          <div className="flex gap-3">
            <button
              onClick={() => onSelect(current)}
              className="focusable px-6 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition-colors"
              tabIndex={0}
            >
              ▶ View Details
            </button>
            <button
              onClick={next}
              className="focusable px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-sm transition-colors"
              tabIndex={0}
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Dots */}
      <div className="absolute bottom-4 right-8 flex gap-1.5">
        {featured.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`w-2 h-2 rounded-full transition-all ${
              i === idx ? 'bg-orange-500 w-5' : 'bg-white/30'
            }`}
            tabIndex={-1}
          />
        ))}
      </div>
    </div>
  );
};
