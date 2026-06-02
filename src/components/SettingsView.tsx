import React, { useState } from 'react';
import type { AppSettings } from '../types';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdate: (partial: Partial<AppSettings>) => void;
}
interface RDProxyResponse {
  status: number;
  data: any;
}

const fetchRDWithCORS = async (
  url: string,
  init?: RequestInit,
  timeout = 10000
): Promise<RDProxyResponse> => {
  const proxies = [
    (u: string) => u,
    (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    (u: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
    (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  ];

  for (const proxy of proxies) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(proxy(url), { ...init, signal: controller.signal });
      clearTimeout(timer);
      if (res.status === 200 || res.status === 400 || res.status === 401 || res.status === 403) {
        const data = await res.json();
        return { status: res.status, data };
      }
    } catch {
      clearTimeout(timer);
    }
  }
  throw new Error(`Failed to contact Real-Debrid API: ${url}`);
};

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onUpdate }) => {
  const [rdPairing, setRdPairing] = useState<{
    userCode?: string;
    verificationUrl?: string;
    deviceCode?: string;
    polling?: boolean;
  }>({});

  const startRDPairing = async () => {
    try {
      const codeRes = await fetchRDWithCORS('https://api.real-debrid.com/oauth/v2/device/code?client_id=CEZWNFZ6BSSMK', {
        method: 'POST',
      });
      if (codeRes.status !== 200) {
        throw new Error(codeRes.data?.error || 'Failed to get device code');
      }
      const data = codeRes.data;
      setRdPairing({
        userCode: data.user_code,
        verificationUrl: data.verification_url,
        deviceCode: data.device_code,
        polling: true,
      });

      // Poll for completion
      const poll = setInterval(async () => {
        try {
          const credRes = await fetchRDWithCORS(
            `https://api.real-debrid.com/oauth/v2/device/credentials?client_id=CEZWNFZ6BSSMK&code=${data.device_code}`,
            undefined,
            4000
          );
          if (credRes.status === 200) {
            const creds = credRes.data;
            // Exchange for token
            const params = new URLSearchParams();
            params.append('client_id', creds.client_id);
            params.append('client_secret', creds.client_secret);
            params.append('code', data.device_code);
            params.append('grant_type', 'http://oauth.net/grant_type/device/1.0');

            const tokenRes = await fetchRDWithCORS('https://api.real-debrid.com/oauth/v2/token', {
              method: 'POST',
              body: params,
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
            });
            if (tokenRes.status === 200 && tokenRes.data.access_token) {
              onUpdate({ rdToken: tokenRes.data.access_token });
              setRdPairing({});
              clearInterval(poll);
            }
          }
        } catch { /* keep polling */ }
      }, 5000);

      // Stop polling after 5 minutes
      setTimeout(() => {
        clearInterval(poll);
        setRdPairing(prev => ({ ...prev, polling: false }));
      }, 300000);
    } catch (e) {
      alert('Failed to start Real-Debrid pairing: ' + e);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6 fade-in">
      <h2 className="text-lg font-bold">⚙️ Settings</h2>

      {/* Real-Debrid Section */}
      <div className="glass-panel p-5 rounded-xl space-y-4">
        <h3 className="text-sm font-semibold text-orange-400 flex items-center gap-2">
          💎 Real-Debrid Premium
        </h3>

        <div className="space-y-3">
          {/* Manual API Key */}
          <div>
            <label className="text-xs text-white/50 block mb-1">
              API Key (from <a href="https://real-debrid.com/apitoken" target="_blank" rel="noopener" className="text-orange-400 underline">real-debrid.com/apitoken</a>)
            </label>
            <input
              type="text"
              value={settings.rdManualKey}
              onChange={e => onUpdate({ rdManualKey: e.target.value })}
              placeholder="Paste your API key here..."
              className="focusable w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
              tabIndex={0}
            />
          </div>

          {/* OAuth Pairing */}
          <div className="border-t border-white/5 pt-3">
            <p className="text-xs text-white/40 mb-2">Or pair via OAuth:</p>
            {rdPairing.userCode ? (
              <div className="glass-panel p-4 rounded-lg text-center space-y-2">
                <p className="text-sm text-white/60">Go to:</p>
                <a
                  href={rdPairing.verificationUrl}
                  target="_blank"
                  rel="noopener"
                  className="text-orange-400 underline text-sm"
                >
                  {rdPairing.verificationUrl}
                </a>
                <p className="text-2xl font-mono font-bold text-orange-400">{rdPairing.userCode}</p>
                {rdPairing.polling && (
                  <p className="text-xs text-green-400 animate-pulse">Waiting for authorization...</p>
                )}
              </div>
            ) : (
              <button
                onClick={startRDPairing}
                className="focusable px-4 py-2 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-white text-xs font-medium"
                tabIndex={0}
              >
                Start OAuth Pairing
              </button>
            )}
          </div>

          {/* Token Status */}
          {(settings.rdToken || settings.rdManualKey) && (
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-green-400">Real-Debrid configured</span>
              <button
                onClick={() => onUpdate({ rdToken: '', rdManualKey: '' })}
                className="ml-auto text-red-400 text-xs hover:underline"
                tabIndex={0}
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* IPTV Section */}
      <div className="glass-panel p-5 rounded-xl space-y-4">
        <h3 className="text-sm font-semibold text-orange-400">📺 IPTV / Live TV</h3>
        
        {/* Toggle Mode */}
        <div className="flex gap-2 p-1 rounded-lg bg-white/5 max-w-xs border border-white/5">
          {(['m3u', 'xtream'] as const).map(t => (
            <button
              key={t}
              onClick={() => onUpdate({ iptvType: t })}
              className={`focusable flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                settings.iptvType === t ? 'bg-orange-500 text-white' : 'text-white/60 hover:text-white'
              }`}
              tabIndex={0}
            >
              {t === 'm3u' ? 'M3U Playlist' : 'Xtream Codes'}
            </button>
          ))}
        </div>

        {settings.iptvType === 'm3u' ? (
          <div>
            <label className="text-xs text-white/50 block mb-1">M3U Playlist URL</label>
            <input
              type="text"
              value={settings.iptvUrl}
              onChange={e => onUpdate({ iptvUrl: e.target.value })}
              placeholder="https://example.com/playlist.m3u"
              className="focusable w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
              tabIndex={0}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-white/50 block mb-1">Server / Host URL</label>
              <input
                type="text"
                value={settings.xtreamHost}
                onChange={e => onUpdate({ xtreamHost: e.target.value })}
                placeholder="http://example.com:8080"
                className="focusable w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
                tabIndex={0}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/50 block mb-1">Username</label>
                <input
                  type="text"
                  value={settings.xtreamUser}
                  onChange={e => onUpdate({ xtreamUser: e.target.value })}
                  placeholder="Username"
                  className="focusable w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
                  tabIndex={0}
                />
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">Password</label>
                <input
                  type="password"
                  value={settings.xtreamPass}
                  onChange={e => onUpdate({ xtreamPass: e.target.value })}
                  placeholder="••••••••"
                  className="focusable w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
                  tabIndex={0}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Player Preference */}
      <div className="glass-panel p-5 rounded-xl space-y-3">
        <h3 className="text-sm font-semibold text-orange-400">▶ Player Preference</h3>
        <div className="flex gap-3 overflow-x-auto pb-2 flex-nowrap">
          {[
            { id: 'web' as const, label: '🌐 Web Player', desc: 'Built-in HTML5' },
            { id: 'vlc' as const, label: '🟠 VLC', desc: 'External app' },
            { id: 'mx' as const, label: '📱 MX Player', desc: 'External app' },
            { id: 'just' as const, label: '▶ Just Player', desc: 'External app' },
            { id: 'default' as const, label: '📲 System', desc: 'Default player' },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => onUpdate({ preferredPlayer: p.id })}
              className={`focusable p-4 rounded-xl text-left transition-colors flex-shrink-0 min-w-[150px] ${
                settings.preferredPlayer === p.id
                  ? 'bg-orange-500/20 border border-orange-500/40'
                  : 'bg-white/3 border border-white/5 hover:bg-white/5'
              }`}
              tabIndex={0}
            >
              <p className="text-sm font-bold text-white/90">{p.label}</p>
              <p className="text-xs text-white/40 mt-1">{p.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* About */}
      <div className="glass-panel p-5 rounded-xl space-y-2">
        <h3 className="text-sm font-semibold text-orange-400">ℹ️ About</h3>
        <p className="text-xs text-white/60">
          ViewTVPro v2.0.1 (Android TV Sideload Edition)
        </p>
        <p className="text-xs text-white/40">
          A hybrid streaming media hub with multi-source parallel scraping,
          Real-Debrid premium integration, IPTV live TV, and D-pad optimized navigation.
        </p>
        <p className="text-xs text-white/30">
          Metadata powered by TMDB. Streams resolved via Stremio-compatible addons.
        </p>
        <p className="text-[10px] text-white/20 mt-4 border-t border-white/5 pt-2">
          © 2026 ViewTV Pro. All rights reserved. Sideloaded Edition.
        </p>
      </div>
    </div>
  );
};
