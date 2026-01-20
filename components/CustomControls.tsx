
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward, Plus, ListPlus, Clock, ListOrdered } from 'lucide-react';
import { Chapter } from '../types';

interface CustomControlsProps {
  playing: boolean;
  played: number; // 0 to 1
  duration: number; // seconds
  muted: boolean;
  chapters: Chapter[];
  onPlayPause: () => void;
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onMute: () => void;
  onRewind: () => void;
  onFastForward: () => void;
  onToggleFullscreen: () => void;
  onAddToList: () => void;
  onAddToQueue: () => void;
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
  chapters,
  onPlayPause,
  onSeek,
  onMute,
  onRewind,
  onFastForward,
  onToggleFullscreen,
  onAddToList,
  onAddToQueue,
  visible
}) => {
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverChapter, setHoverChapter] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState(0);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!progressBarRef.current || duration === 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const time = percentage * duration;
    
    setHoverTime(time);
    setTooltipPos(x);

    // Dynamic chapter segment detection: find the last chapter that started BEFORE current hover time
    if (chapters && chapters.length > 0) {
      const currentChapter = [...chapters]
        .sort((a, b) => a.time - b.time)
        .reverse()
        .find(c => time >= c.time);
      setHoverChapter(currentChapter ? currentChapter.title : "Introduction");
    } else {
      setHoverChapter("Video Content");
    }
  };

  const handleMouseLeave = () => {
    setHoverTime(null);
    setHoverChapter(null);
  };

  return (
    <div 
      className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent px-8 pb-8 pt-24 transition-all duration-500 z-[100] pointer-events-auto ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'}`}
    >
      {/* Elevated Tooltip to prevent hiding the timeline */}
      {hoverTime !== null && (
        <div 
          className="absolute bottom-[140px] transform -translate-x-1/2 flex flex-col items-center pointer-events-none z-[110] animate-in fade-in zoom-in duration-150"
          style={{ left: `${tooltipPos + 32}px` }}
        >
          <div className="bg-zinc-900 border border-white/20 px-4 py-2 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col items-center gap-1 border-b-primary/50">
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] leading-none mb-0.5">{hoverChapter}</span>
            <span className="text-[14px] font-mono font-bold text-white leading-none">{formatTime(hoverTime)}</span>
          </div>
          <div className="w-3 h-3 bg-zinc-900 border-r border-b border-white/20 transform rotate-45 -mt-1.5" />
        </div>
      )}

      <div 
        ref={progressBarRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative group mb-6 px-1 flex items-center h-6 cursor-pointer"
      >
        <div className="absolute left-1 right-1 h-1.5 flex items-center overflow-hidden bg-white/10 rounded-full">
          {/* Progress fill */}
          <div 
            className="h-full bg-primary shadow-[0_0_20px_rgba(225,0,255,1)] transition-all duration-150 relative z-10" 
            style={{ width: `${played * 100}%` }} 
          />
          
          {/* Visual Chapter Ticks */}
          {chapters && chapters.length > 0 && chapters.map((chap, i) => (
             <div 
               key={i} 
               className="absolute top-0 bottom-0 w-[3px] bg-black/60 z-20 border-x border-white/5" 
               style={{ left: `${(chap.time / duration) * 100}%` }} 
             />
          ))}
        </div>

        <input
          type="range"
          min={0}
          max={0.999}
          step="any"
          value={played}
          onChange={onSeek}
          className="progress-range absolute inset-0 w-full bg-transparent appearance-none cursor-pointer z-30 opacity-0 md:opacity-100"
        />
      </div>

      <div className="flex items-center justify-between text-white select-none">
        <div className="flex items-center gap-6">
          <button onClick={onPlayPause} className="hover:text-primary transition-all active:scale-90 p-2 bg-white/5 hover:bg-white/10 rounded-full">
            {playing ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
          </button>
          
          <div className="flex items-center gap-4 text-white/80">
            <button onClick={onRewind} className="hover:text-primary transition-all p-1.5 bg-white/5 hover:bg-white/10 rounded-lg">
              <SkipBack size={20} />
            </button>
            <button onClick={onFastForward} className="hover:text-primary transition-all p-1.5 bg-white/5 hover:bg-white/10 rounded-lg">
              <SkipForward size={20} />
            </button>
          </div>

          <button onClick={onMute} className="hover:text-white transition-colors p-2 bg-white/5 hover:bg-white/10 rounded-full">
            {muted ? <VolumeX size={20} className="text-red-400" /> : <Volume2 size={20} />}
          </button>

          <div className="flex flex-col">
            <span className="text-sm font-mono font-bold tracking-widest text-zinc-100 leading-tight">
              {formatTime(duration * played)}
            </span>
            <span className="text-[9px] font-mono text-zinc-500 uppercase">
               / {formatTime(duration)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={onAddToQueue} 
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-primary/20 hover:text-primary border border-white/10 rounded-full transition-all text-[10px] font-bold uppercase tracking-widest"
          >
            <ListOrdered size={14} /> Add to Queue
          </button>
          <button 
            onClick={onAddToList} 
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-primary/20 hover:text-primary border border-white/10 rounded-full transition-all text-[10px] font-bold uppercase tracking-widest"
          >
            <Plus size={14} /> Add to List
          </button>

          <button onClick={onToggleFullscreen} className="hover:text-primary transition-all p-2 bg-white/5 hover:bg-white/10 rounded-full">
            <Maximize size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
