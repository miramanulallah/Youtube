
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
  if (isNaN(seconds)) return "0:00";
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
      className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent px-6 pb-6 pt-16 transition-opacity duration-300 z-50 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      <div className="flex items-center gap-4 mb-3 group">
        <input
          type="range"
          min={0}
          max={0.999999}
          step="any"
          value={played}
          onChange={onSeek}
          className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(225,0,255,0.8)]"
        />
      </div>

      <div className="flex items-center justify-between text-white">
        <div className="flex items-center gap-6">
          <button onClick={onPlayPause} className="hover:text-primary transition-all active:scale-90">
            {playing ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
          </button>
          
          <div className="flex items-center gap-4 text-white/70">
            <button onClick={onRewind} className="hover:text-white transition-colors"><SkipBack size={22} /></button>
            <button onClick={onFastForward} className="hover:text-white transition-colors"><SkipForward size={22} /></button>
          </div>

          <button onClick={onMute} className="hover:text-white transition-colors">
            {muted ? <VolumeX size={22} /> : <Volume2 size={22} />}
          </button>

          <span className="text-sm font-mono text-zinc-400 tracking-wider">
            {formatTime(duration * played)} <span className="opacity-30">/</span> {formatTime(duration)}
          </span>
        </div>

        <button onClick={onToggleFullscreen} className="hover:text-primary transition-colors p-1">
          <Maximize size={22} />
        </button>
      </div>
    </div>
  );
};
