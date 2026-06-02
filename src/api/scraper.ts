import type { StreamResult } from '../types';

const PROXIES = [
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`,
];

async function fetchWithCORS(url: string, timeout = 10000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) return await res.json();
  } catch {
    clearTimeout(timer);
  }

  // Try proxies
  for (const proxy of PROXIES) {
    const controller2 = new AbortController();
    const timer2 = setTimeout(() => controller2.abort(), timeout);
    try {
      const res = await fetch(proxy(url), { signal: controller2.signal });
      clearTimeout(timer2);
      if (res.ok) return await res.json();
    } catch {
      clearTimeout(timer2);
    }
  }

  throw new Error(`Failed to fetch: ${url}`);
}

function getScraperEndpoints(type: string, queryId: string, rdToken?: string): { name: string; url: string }[] {
  const torrentioConfig = rdToken
    ? `providers=yts,eztv,rarbg,1337x,thepiratebay,torrentgalaxy|realdebrid=${rdToken}`
    : 'providers=yts,eztv,rarbg,1337x,thepiratebay,torrentgalaxy';

  return [
    {
      name: 'Torrentio',
      url: `https://torrentio.strem.fun/${torrentioConfig}/stream/${type}/${queryId}.json`
    },
    {
      name: 'NoTorrent',
      url: `https://addon.notorrent2.workers.dev/stream/${type}/${queryId}.json`
    },
    {
      name: 'StreamViX',
      url: `https://streamvix.hayd.uk/{"tmdbApiKey":"","mediaFlowProxyUrl":"","mediaFlowProxyPassword":"","animeunityEnabled":"on","animesaturnEnabled":"on","animeworldEnabled":"on"}/stream/${type}/${queryId}.json`
    },
    {
      name: 'HdHub',
      url: `https://hdhub.thevolecitor.qzz.io/eyJ0b3Jib3giOiJ1bnNldCIsInF1YWxpdGllcyI6IjIxNjBwLDEwODBwLDcyMHAiLCJzb3J0IjoiZGVzYyJ9/stream/${type}/${queryId}.json`
    }
  ];
}

const HD_AUDIO_PATTERNS = /DTS|TrueHD|Atmos|AC3|AC-3|DDP|EAC3|E-AC-3|5\.1ch|7\.1ch|5\.1|7\.1/i;
const STEREO_PATTERNS = /AAC|MP3|Opus|Vorbis|2\.0|Stereo/i;

function classifyAudio(title: string): { type: 'hd' | 'stereo' | 'unknown'; label: string } {
  if (HD_AUDIO_PATTERNS.test(title)) {
    return { type: 'hd', label: '⚠️ HD Audio (Silent on Web)' };
  }
  if (STEREO_PATTERNS.test(title)) {
    return { type: 'stereo', label: '🔊 Browser Stereo' };
  }
  return { type: 'unknown', label: '🔊 Audio' };
}

function classifyResolution(title: string): string {
  const t = title.toUpperCase();
  if (t.includes('2160') || t.includes('4K') || t.includes('UHD')) return '4K';
  if (t.includes('1080')) return '1080p';
  if (t.includes('720')) return '720p';
  if (t.includes('480')) return '480p';
  return 'Unknown';
}

function classifyStreamType(title: string, source: string): 'rd' | 'hd' | 'free' {
  const t = (title + ' ' + source).toLowerCase();
  if (t.includes('[rd') || t.includes('real-debrid') || t.includes('realdebrid') || t.includes('[rd+]')) return 'rd';
  if (source === 'NoTorrent' || source === 'StreamViX' || source === 'HdHub') return 'hd';
  return 'free';
}

function computeSortWeight(quality: string, streamType: 'rd' | 'hd' | 'free'): number {
  const typeWeights: Record<string, number> = { rd: 300, hd: 200, free: 100 };
  const qualWeights: Record<string, number> = { '4K': 40, '1080p': 30, '720p': 20, '480p': 10, 'Unknown': 5 };
  return (typeWeights[streamType] || 0) + (qualWeights[quality] || 0);
}

interface RawStream {
  name?: string;
  title?: string;
  url?: string;
  externalUrl?: string;
  behaviorHints?: Record<string, unknown>;
}

export async function scrapeStreams(
  imdbId: string,
  type: 'movie' | 'tv',
  season?: number,
  episode?: number,
  rdToken?: string,
  onProgress?: (source: string, count: number) => void
): Promise<StreamResult[]> {
  const queryId = type === 'tv' ? `${imdbId}:${season}:${episode}` : imdbId;
  const endpoints = getScraperEndpoints(type === 'tv' ? 'series' : 'movie', queryId, rdToken);

  const results: StreamResult[] = [];

  const promises = endpoints.map(async (ep) => {
    try {
      const data = await fetchWithCORS(ep.url, 15000) as { streams?: RawStream[] };
      const streams = data?.streams || [];
      let count = 0;
      for (const s of streams) {
        const streamUrl = s.url || s.externalUrl;
        if (!streamUrl) continue;
        const fullTitle = [s.name || '', s.title || ''].join(' ');
        const audio = classifyAudio(fullTitle);
        const quality = classifyResolution(fullTitle);
        const streamType = classifyStreamType(fullTitle, ep.name);
        results.push({
          name: s.name || ep.name,
          title: s.title || 'Stream',
          url: streamUrl,
          source: ep.name,
          quality,
          audioType: audio.type,
          audioLabel: audio.label,
          streamType,
          sortWeight: computeSortWeight(quality, streamType),
          behaviorHints: s.behaviorHints,
        });
        count++;
      }
      onProgress?.(ep.name, count);
    } catch {
      onProgress?.(ep.name, 0);
    }
  });

  await Promise.allSettled(promises);

  results.sort((a, b) => b.sortWeight - a.sortWeight);
  return results;
}
