
import React from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward } from 'lucide-react';

interface CustomControlsProps {
  playing: boolean;
  played: number; // 0 to 1
  duration: number; // seconds
  muted: boolean;
  onPlayPause: () => void;
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onMute: () => void;
  onRewind: () => void;
  onFastForward: () => void;
  onToggleFullscreen: () => void;
  visible: boolean;
}

const formatTime = (seconds: number) => {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const date = new Date(seconds * 1000);
  const hh = date.getUTCHours();
  const mm = date.getUTCMinutes();
  const ss = date.getUTCSeconds().toString().padStart(2, '0');
  return hh ? `${hh}:${mm.toString().padStart(2, '0')}:${ss}` : `${mm}:${ss}`;
};

export const CustomControls: React.FC<CustomControlsProps> = ({
  playing,
  played,
  duration,
  muted,
  onPlayPause,
  onSeek,
  onMute,
  onRewind,
  onFastForward,
  onToggleFullscreen,
  visible
}) => {
  return (
    <div 
      className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent px-6 pb-6 pt-20 transition-all duration-300 z-50 pointer-events-auto ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
    >
      <div className="flex items-center gap-4 mb-4 group px-2">
        <input
          type="range"
          min={0}
          max={0.999}
          step="any"
          value={played}
          onChange={onSeek}
          className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer hover:h-2 transition-all [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[0_0_15px_rgba(225,0,255,0.8)]"
        />
      </div>

      <div className="flex items-center justify-between text-white select-none">
        <div className="flex items-center gap-6">
          <button onClick={onPlayPause} className="hover:text-primary transition-all active:scale-90 p-1">
            {playing ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
          </button>
          
          <div className="flex items-center gap-5 text-white/70">
            <button onClick={onRewind} className="hover:text-white transition-colors p-1" title="Rewind 10s"><SkipBack size={22} /></button>
            <button onClick={onFastForward} className="hover:text-white transition-colors p-1" title="Forward 10s"><SkipForward size={22} /></button>
          </div>

          <button onClick={onMute} className="hover:text-white transition-colors p-1">
            {muted ? <VolumeX size={22} /> : <Volume2 size={22} />}
          </button>

          <span className="text-sm font-mono text-zinc-400 tracking-wider">
            {formatTime(duration * played)} <span className="opacity-30">/</span> {formatTime(duration)}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={onToggleFullscreen} className="hover:text-primary transition-colors p-1" title="Full Screen (F)">
            <Maximize size={22} />
          </button>
        </div>
      </div>
    </div>
  );
};
