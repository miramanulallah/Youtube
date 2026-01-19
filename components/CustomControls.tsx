
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
  // Generate markers every 10% for visual structure
  const markers = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];

  return (
    <div 
      className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/60 to-transparent px-8 pb-8 pt-24 transition-all duration-500 z-[100] pointer-events-auto ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'}`}
    >
      <div className="relative group mb-6 px-1 flex items-center h-6">
        {/* Background Track */}
        <div className="absolute left-1 right-1 h-1 bg-white/20 rounded-full overflow-hidden">
          {/* Progress Fill (The Purple Back Side) */}
          <div 
            className="h-full bg-primary shadow-[0_0_15px_rgba(225,0,255,0.6)] transition-all duration-150" 
            style={{ width: `${played * 100}%` }} 
          />
          
          {/* Seek Markers (Interval Ticks) */}
          {markers.map((m, i) => (
            <div 
              key={i} 
              className="absolute top-0 w-[1px] h-full bg-black/40" 
              style={{ left: `${m * 100}%` }} 
            />
          ))}
        </div>

        {/* Transparent Input Range for Interaction */}
        <input
          type="range"
          min={0}
          max={0.999}
          step="any"
          value={played}
          onChange={onSeek}
          className="progress-range absolute inset-0 w-full bg-transparent appearance-none cursor-pointer z-30"
        />
      </div>

      <div className="flex items-center justify-between text-white select-none">
        <div className="flex items-center gap-8">
          <button onClick={onPlayPause} className="hover:text-primary transition-all active:scale-90 p-1.5 bg-white/5 hover:bg-white/10 rounded-full">
            {playing ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />}
          </button>
          
          <div className="flex items-center gap-6 text-white/80">
            <button onClick={onRewind} className="hover:text-primary transition-all p-1 bg-white/5 hover:bg-white/10 rounded-lg" title="Rewind 10s">
              <SkipBack size={24} />
            </button>
            <button onClick={onFastForward} className="hover:text-primary transition-all p-1 bg-white/5 hover:bg-white/10 rounded-lg" title="Forward 10s">
              <SkipForward size={24} />
            </button>
          </div>

          <button onClick={onMute} className="hover:text-white transition-colors p-1.5 bg-white/5 hover:bg-white/10 rounded-full">
            {muted ? <VolumeX size={24} className="text-red-400" /> : <Volume2 size={24} />}
          </button>

          <div className="flex flex-col">
            <span className="text-sm font-mono font-bold tracking-widest text-zinc-100">
              {formatTime(duration * played)}
            </span>
            <span className="text-[10px] font-mono text-zinc-500 uppercase">
               / {formatTime(duration)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-black text-primary uppercase tracking-tighter">Live Session</span>
          </div>
          <button onClick={onToggleFullscreen} className="hover:text-primary transition-all p-2 bg-white/5 hover:bg-white/10 rounded-full" title="Full Screen (F)">
            <Maximize size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};
