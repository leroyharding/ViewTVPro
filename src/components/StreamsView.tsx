import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { TMDBItem, StreamResult } from '../types';
import { scrapeStreams } from '../api/scraper';
import { StreamList } from './StreamList';
import { getTitle, getMediaType, IMG } from '../api/tmdb';

interface StreamsViewProps {
  item: TMDBItem;
  season?: number;
  episode?: number;
  onBack: () => void;
  onPlay: (url: string, title: string) => void;
  rdToken?: string;
}

export const StreamsView: React.FC<StreamsViewProps> = ({
  item,
  season,
  episode,
  onBack,
  onPlay,
  rdToken,
}) => {
  const [streams, setStreams] = useState<StreamResult[]>([]);
  const [scraping, setScraping] = useState(true);
  const [scrapeProgress, setScrapeProgress] = useState<Record<string, number>>({});
  const backBtnRef = useRef<HTMLButtonElement>(null);

  const mediaType = getMediaType(item);
  const title = getTitle(item);

  const startScraping = useCallback(async () => {
    const detailObj = item as any;
    const imdbIdResolved = detailObj.imdb_id || detailObj.external_ids?.imdb_id;
    if (!imdbIdResolved) {
      alert('Error: No IMDb ID found for this title.');
      onBack();
      return;
    }

    setScraping(true);
    setStreams([]);
    setScrapeProgress({});

    try {
      const results = await scrapeStreams(
        imdbIdResolved,
        mediaType,
        season,
        episode,
        rdToken || undefined,
        (source, count) => {
          setScrapeProgress(prev => ({ ...prev, [source]: count }));
        }
      );
      setStreams(results);
    } catch (e) {
      console.error(e);
    } finally {
      setScraping(false);
    }
  }, [item, mediaType, season, episode, rdToken, onBack]);

  useEffect(() => {
    startScraping();
  }, [startScraping]);

  useEffect(() => {
    backBtnRef.current?.focus();
  }, []);

  // Handle Escape key to go back
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onBack();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onBack]);

  const targetTitle = season && episode
    ? `${title} — S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`
    : title;

  return (
    <div className="h-full w-full flex flex-col bg-[#0a0a1a] text-white fade-in overflow-hidden">
      {/* Top Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/40 backdrop-blur-md">
        <button
          ref={backBtnRef}
          onClick={onBack}
          className="focusable px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white font-medium text-sm flex items-center gap-2"
          tabIndex={0}
        >
          ← Back
        </button>
        <h2 className="text-base font-semibold truncate max-w-[60%] text-center">
          Searching Streams: {targetTitle}
        </h2>
        {scraping ? (
          <button
            disabled
            className="px-4 py-2 rounded-lg bg-orange-500/10 text-orange-400 text-sm font-semibold animate-pulse"
          >
            ⏳ Scraping...
          </button>
        ) : (
          <button
            onClick={startScraping}
            className="focusable px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm"
            tabIndex={0}
          >
            🔄 Rescrape
          </button>
        )}
      </div>

      {/* Main split view */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Info Panel */}
        <div className="w-[300px] border-r border-white/5 bg-black/20 p-5 flex flex-col gap-5 overflow-y-auto">
          {item.poster_path && (
            <img
              src={`${IMG}${item.poster_path}`}
              alt=""
              className="w-full rounded-xl object-cover shadow-2xl border border-white/10 max-h-[300px]"
            />
          )}

          <div>
            <h3 className="text-sm font-bold text-white/90 truncate">{title}</h3>
            {season && episode && (
              <p className="text-xs text-orange-400 font-semibold mt-1">
                Season {season}, Episode {episode}
              </p>
            )}
            <p className="text-[11px] text-white/40 mt-1 line-clamp-4">{item.overview}</p>
          </div>

          {/* Scrape Progress Panel */}
          <div className="glass-panel p-4 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider">
              {scraping ? '⚡ Scraping Sources' : '✅ Finished Scraping'}
            </h4>
            <div className="space-y-2">
              {['Torrentio', 'NoTorrent', 'StreamViX', 'HdHub'].map(name => {
                const count = scrapeProgress[name];
                const active = count !== undefined;
                return (
                  <div key={name} className="flex items-center justify-between text-xs py-1 border-b border-white/3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        active
                          ? count > 0 ? 'bg-green-400' : 'bg-red-400'
                          : scraping ? 'bg-yellow-400 animate-pulse' : 'bg-white/20'
                      }`} />
                      <span className="text-white/75">{name}</span>
                    </div>
                    {active && (
                      <span className="text-white/40 font-medium">({count} links)</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Streams Listing */}
        <div className="flex-1 overflow-y-auto p-6 bg-black/10">
          {scraping && streams.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              <div className="text-4xl animate-bounce">📡</div>
              <div className="text-orange-400 text-lg font-medium animate-pulse">
                Resolving premium and direct streams...
              </div>
              <p className="text-xs text-white/40 max-w-sm">
                We are searching Stremio addon servers and cache indexes. Real-Debrid links will be sorted to the top.
              </p>
            </div>
          ) : streams.length > 0 ? (
            <div className="fade-in max-w-4xl mx-auto">
              <StreamList
                streams={streams}
                onPlay={(url, title) => onPlay(url, title)}
                title={targetTitle}
              />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              <div className="text-4xl">📭</div>
              <div className="text-white/60 text-lg font-medium">
                No streams found
              </div>
              <p className="text-xs text-white/40 max-w-xs">
                Ensure you have set a valid Real-Debrid token or try again with a different title.
              </p>
              <button
                onClick={startScraping}
                className="focusable px-5 py-2 rounded-lg bg-orange-500 text-white text-xs font-semibold"
                tabIndex={0}
              >
                Retry Search
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
