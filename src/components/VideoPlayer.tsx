import React, { useRef, useEffect, useState, useCallback } from 'react';
import Hls from 'hls.js';

interface VideoPlayerProps {
  url: string;
  title: string;
  onClose: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, title, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 4000);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const isHLS = url.includes('.m3u8') || url.includes('m3u8');

    if (isHLS && Hls.isSupported()) {
      const hls = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          setError(`Playback error: ${data.type}`);
        }
      });
    } else if (isHLS && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      video.play().catch(() => {});
    } else {
      video.src = url;
      video.play().catch(() => {});
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [url]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => setCurrentTime(video.currentTime);
    const onDur = () => setDuration(video.duration || 0);
    const onErr = () => setError('Playback failed. This stream may require an external player.');

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('loadedmetadata', onDur);
    video.addEventListener('durationchange', onDur);
    video.addEventListener('error', onErr);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('loadedmetadata', onDur);
      video.removeEventListener('durationchange', onDur);
      video.removeEventListener('error', onErr);
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        const v = videoRef.current;
        if (v) v.paused ? v.play() : v.pause();
        resetHideTimer();
      }
      if (e.key === 'ArrowLeft') {
        const v = videoRef.current;
        if (v) v.currentTime = Math.max(0, v.currentTime - 10);
        resetHideTimer();
      }
      if (e.key === 'ArrowRight') {
        const v = videoRef.current;
        if (v) v.currentTime = Math.min(v.duration || 0, v.currentTime + 10);
        resetHideTimer();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, resetHideTimer]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (v) v.paused ? v.play() : v.pause();
    resetHideTimer();
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    v.currentTime = pct * duration;
    resetHideTimer();
  };

  return (
    <div
      className="video-container"
      onMouseMove={resetHideTimer}
      onClick={resetHideTimer}
    >
      <video ref={videoRef} className="w-full h-full" playsInline />

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="glass-panel-strong p-8 rounded-2xl max-w-md text-center">
            <p className="text-red-400 text-lg mb-2">⚠️ Playback Error</p>
            <p className="text-sm text-white/60 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="focusable px-6 py-2 rounded-lg bg-orange-500 text-white font-semibold"
              tabIndex={0}
            >
              Close Player
            </button>
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      <div className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
        {/* Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/70 to-transparent">
          <button
            onClick={onClose}
            className="focusable w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center text-lg hover:bg-black/80"
            tabIndex={0}
          >
            ←
          </button>
          <p className="text-sm text-white/80 font-medium truncate mx-4 flex-1 text-center">{title}</p>
          <div className="w-10" />
        </div>

        {/* Center Play/Pause */}
        <div className="flex-1 flex items-center justify-center">
          <button
            onClick={togglePlay}
            className="focusable w-20 h-20 rounded-full bg-black/50 text-white text-3xl flex items-center justify-center hover:bg-black/70 transition-all hover:scale-110"
            tabIndex={0}
          >
            {playing ? '⏸' : '▶'}
          </button>
        </div>

        {/* Bottom Controls */}
        <div className="px-6 py-4 bg-gradient-to-t from-black/70 to-transparent">
          {/* Progress Bar */}
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs text-white/60 w-12 text-right">{formatTime(currentTime)}</span>
            <div
              className="flex-1 h-1.5 bg-white/10 rounded-full cursor-pointer relative group"
              onClick={seek}
            >
              <div
                className="h-full bg-orange-500 rounded-full relative"
                style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <span className="text-xs text-white/60 w-12">{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
