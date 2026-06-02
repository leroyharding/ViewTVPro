import React, { useRef, useEffect } from 'react';
import type { TMDBItem } from '../types';
import { IMG, getTitle, getYear } from '../api/tmdb';

interface ContentCardProps {
  item: TMDBItem;
  onClick: (item: TMDBItem) => void;
  autoFocus?: boolean;
  size?: 'normal' | 'large';
}

export const ContentCard: React.FC<ContentCardProps> = ({ item, onClick, autoFocus, size = 'normal' }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus();
    }
  }, [autoFocus]);

  const w = size === 'large' ? 'w-[180px]' : 'w-[150px]';
  const h = size === 'large' ? 'h-[270px]' : 'h-[225px]';

  return (
    <div
      ref={ref}
      className={`card-focusable ${w} flex-shrink-0 rounded-xl overflow-hidden cursor-pointer group`}
      tabIndex={0}
      onClick={() => onClick(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(item);
        }
      }}
      role="button"
      aria-label={getTitle(item)}
    >
      <div className={`relative ${h} bg-gray-800`}>
        {item.poster_path ? (
          <img
            src={item.poster_path.startsWith('http') ? item.poster_path : `${IMG}${item.poster_path}`}
            alt={getTitle(item)}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900 text-3xl">
            🎬
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2">
          <div className="flex items-center gap-1">
            {item.vote_average > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-bold">
                ★ {item.vote_average.toFixed(1)}
              </span>
            )}
            {getYear(item) && (
              <span className="text-[10px] text-white/50">{getYear(item)}</span>
            )}
          </div>
        </div>
        <div className="absolute top-2 right-2">
          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-black/60 text-white/70 font-medium uppercase">
            {item.media_type === 'tv' || item.first_air_date ? 'TV' : 'Movie'}
          </span>
        </div>
      </div>
      <div className="p-2 bg-black/40">
        <p className="text-xs font-medium truncate">{getTitle(item)}</p>
      </div>
    </div>
  );
};
