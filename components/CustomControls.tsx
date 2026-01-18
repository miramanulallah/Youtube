import React from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Maximize, SkipBack, SkipForward } from 'lucide-react';

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
  const date = new Date(seconds * 1000);
  const hh = date.getUTCHours();
  const mm = date.getUTCMinutes();
  const ss = document.getElementById('root') ? date.getUTCSeconds().toString().padStart(2, '0') : '00';
  if (hh) {
    return `${hh}:${mm.toString().padStart(2, '0')}:${ss}`;
  }
  return `${mm}:${ss}`;
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
      className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 pb-4 pt-10 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      {/* Progress Bar */}
      <div className="flex items-center gap-2 mb-2 group">
        <input
          type="range"
          min={0}
          max={0.999999}
          step="any"
          value={played}
          onChange={onSeek}
          className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:transition-all group-hover:[&::-webkit-slider-thumb]:scale-125"
        />
      </div>

      <div className="flex items-center justify-between text-white">
        <div className="flex items-center gap-4">
          <button onClick={onPlayPause} className="hover:text-primary transition-colors">
            {playing ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
          </button>
          
          <div className="flex items-center gap-2 text-white/80">
            <button onClick={onRewind} className="hover:text-white"><SkipBack size={20} /></button>
            <button onClick={onFastForward} className="hover:text-white"><SkipForward size={20} /></button>
          </div>

          <div className="flex items-center gap-2 group relative">
             <button onClick={onMute} className="hover:text-white">
                {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
             </button>
          </div>

          <span className="text-xs font-mono text-white/70">
            {formatTime(duration * played)} / {formatTime(duration)}
          </span>
        </div>

        <button onClick={onToggleFullscreen} className="hover:text-primary transition-colors">
          <Maximize size={20} />
        </button>
      </div>
    </div>
  );
};