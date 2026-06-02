import React, { useRef } from 'react';
import type { TMDBItem } from '../types';
import { ContentCard } from './ContentCard';

interface ContentRowProps {
  title: string;
  items: TMDBItem[];
  onSelect: (item: TMDBItem) => void;
  loading?: boolean;
}

export const ContentRow: React.FC<ContentRowProps> = ({ title, items, onSelect, loading }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="mb-6 fade-in">
      <h2 className="text-base font-semibold mb-2 px-2 text-white/90 flex items-center gap-2">
        {title}
        {loading && <span className="text-xs text-orange-400 animate-pulse">Loading...</span>}
      </h2>
      <div ref={scrollRef} className="row-scroll px-2">
        {loading && items.length === 0
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="w-[150px] h-[265px] rounded-xl shimmer flex-shrink-0" />
            ))
          : items.map((item, idx) => (
              <ContentCard key={`${item.id}-${idx}`} item={item} onClick={onSelect} />
            ))}
      </div>
    </div>
  );
};
