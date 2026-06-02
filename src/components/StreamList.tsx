import React, { useState } from 'react';
import type { StreamResult } from '../types';

interface StreamListProps {
  streams: StreamResult[];
  onPlay: (url: string, title: string) => void;
  title: string;
}

export const StreamList: React.FC<StreamListProps> = ({ streams, onPlay, title }) => {
  const [filter, setFilter] = useState<'all' | 'rd' | 'hd' | 'free'>('all');
  const [qualFilter, setQualFilter] = useState<'all' | '4K' | '1080p' | '720p'>('all');

  const filtered = streams.filter(s => {
    if (filter !== 'all' && s.streamType !== filter) return false;
    if (qualFilter !== 'all' && s.quality !== qualFilter) return false;
    return true;
  });

  const typeCounts = {
    all: streams.length,
    rd: streams.filter(s => s.streamType === 'rd').length,
    hd: streams.filter(s => s.streamType === 'hd').length,
    free: streams.filter(s => s.streamType === 'free').length,
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/80">
          🎬 {streams.length} Streams Found
        </h3>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 overflow-x-auto pb-1 flex-nowrap">
        {(['all', 'rd', 'hd', 'free'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`focusable px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              filter === f ? 'bg-orange-500 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}
            tabIndex={0}
          >
            {f === 'all' ? 'All' : f === 'rd' ? '💎 Premium' : f === 'hd' ? '🌐 Direct' : '📡 P2P'}
            {' '}({typeCounts[f]})
          </button>
        ))}
        <div className="h-6 w-[1px] bg-white/10 flex-shrink-0" /> {/* Divider */}
        {(['all', '4K', '1080p', '720p'] as const).map(q => (
          <button
            key={q}
            onClick={() => setQualFilter(q)}
            className={`focusable px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
              qualFilter === q ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'
            }`}
            tabIndex={0}
          >
            {q === 'all' ? 'All Res' : q}
          </button>
        ))}
      </div>

      {/* Stream Items */}
      <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
        {filtered.map((stream, idx) => (
          <div
            key={idx}
            className="focusable flex items-center gap-3 p-3 rounded-xl bg-white/3 hover:bg-white/6 border border-white/5 cursor-pointer transition-colors group"
            tabIndex={0}
            onClick={() => onPlay(stream.url, `${title} - ${stream.title}`)}
            onKeyDown={e => { if (e.key === 'Enter') onPlay(stream.url, `${title} - ${stream.title}`); }}
            role="button"
          >
            {/* Type Badge */}
            <span className={`flex-shrink-0 px-2 py-1 rounded text-[10px] font-bold uppercase ${
              stream.streamType === 'rd' ? 'badge-rd' : stream.streamType === 'hd' ? 'badge-hd' : 'badge-free'
            }`}>
              {stream.streamType === 'rd' ? 'RD' : stream.streamType === 'hd' ? 'WEB' : 'P2P'}
            </span>

            {/* Quality Badge */}
            <span className={`flex-shrink-0 px-2 py-1 rounded text-[10px] font-bold ${
              stream.quality === '4K' ? 'badge-4k' : 'bg-white/10 text-white/70'
            }`}>
              {stream.quality}
            </span>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white/80 truncate">{stream.name}</p>
              <p className="text-[10px] text-white/40 truncate">{stream.title}</p>
            </div>

            {/* Audio Tag */}
            <span className={`flex-shrink-0 text-[10px] px-2 py-1 rounded ${
              stream.audioType === 'hd'
                ? 'bg-red-500/20 text-red-400'
                : stream.audioType === 'stereo'
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-white/5 text-white/40'
            }`}>
              {stream.audioLabel}
            </span>

            {/* Source */}
            <span className="flex-shrink-0 text-[10px] text-white/30">{stream.source}</span>

            {/* Play */}
            <span className="flex-shrink-0 text-orange-400 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
              ▶
            </span>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-white/30 text-center py-4">No streams match current filters.</p>
        )}
      </div>
    </div>
  );
};
