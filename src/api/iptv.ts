import type { IPTVChannel } from '../types';

const PROXIES = [
  (url: string) => url,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`,
];

export async function parseIPTVPlaylist(url: string): Promise<IPTVChannel[]> {
  const cleanUrl = url.trim();
  let text = '';
  for (const proxy of PROXIES) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(proxy(cleanUrl), { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        text = await res.text();
        if (text && (text.includes('#EXTM3U') || text.includes('#EXTINF'))) {
          break;
        }
      }
    } catch {
      clearTimeout(timer);
      /* try next */
    }
  }

  if (!text) throw new Error('Could not fetch IPTV playlist');

  const lines = text.split('\n').map(l => l.trim());
  const channels: IPTVChannel[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('#EXTINF')) {
      const info = lines[i];
      const logoMatch = info.match(/tvg-logo="([^"]*)"/);
      const groupMatch = info.match(/group-title="([^"]*)"/);
      const nameMatch = info.match(/,(.+)$/);
      const logo = logoMatch?.[1] || '';
      const group = groupMatch?.[1] || 'Uncategorized';
      const name = nameMatch?.[1]?.trim() || 'Unknown Channel';

      // Find the next HTTP line
      let streamUrl = '';
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].startsWith('http')) {
          streamUrl = lines[j];
          break;
        }
        if (lines[j].startsWith('#EXTINF')) break;
      }

      if (streamUrl) {
        channels.push({ name, url: streamUrl, logo, group });
      }
    }
  }

  return channels;
}

export function groupChannels(channels: IPTVChannel[]): Record<string, IPTVChannel[]> {
  const groups: Record<string, IPTVChannel[]> = {};
  for (const ch of channels) {
    if (!groups[ch.group]) groups[ch.group] = [];
    groups[ch.group].push(ch);
  }
  return groups;
}

async function fetchXtreamJSON(url: string): Promise<any> {
  for (const proxy of PROXIES) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(proxy(url), { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        if (data) return data;
      }
    } catch {
      clearTimeout(timer);
      /* try next */
    }
  }
  throw new Error(`Failed to query Xtream API: ${url}`);
}

export async function parseXtreamIPTV(host: string, user: string, pass: string): Promise<IPTVChannel[]> {
  const cleanHost = host.trim().replace(/\/$/, '');
  const cleanUser = user.trim();
  const cleanPass = pass.trim();
  const authParams = `username=${encodeURIComponent(cleanUser)}&password=${encodeURIComponent(cleanPass)}`;
  
  const categoriesUrl = `${cleanHost}/player_api.php?${authParams}&action=get_live_categories`;
  const streamsUrl = `${cleanHost}/player_api.php?${authParams}&action=get_live_streams`;

  const [categoriesData, streamsData] = await Promise.all([
    fetchXtreamJSON(categoriesUrl).catch(() => [] as any[]),
    fetchXtreamJSON(streamsUrl),
  ]);

  const categoryMap: Record<string, string> = {};
  if (Array.isArray(categoriesData)) {
    for (const cat of categoriesData) {
      if (cat.category_id && cat.category_name) {
        categoryMap[String(cat.category_id)] = cat.category_name;
      }
    }
  }

  const channels: IPTVChannel[] = [];
  if (Array.isArray(streamsData)) {
    for (const s of streamsData) {
      if (!s.stream_id) continue;
      const name = s.name || 'Unknown Channel';
      const logo = s.stream_icon || '';
      const catId = String(s.category_id || '');
      const group = categoryMap[catId] || 'Uncategorized';
      const streamUrl = `${cleanHost}/live/${encodeURIComponent(cleanUser)}/${encodeURIComponent(cleanPass)}/${s.stream_id}.ts`;
      channels.push({ name, url: streamUrl, logo, group });
    }
  }

  return channels;
}

