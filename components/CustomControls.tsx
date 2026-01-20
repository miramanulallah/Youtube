
import React, { useState, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward, Settings, Monitor, ListOrdered, Plus } from 'lucide-react';
import { Chapter } from '../types';

interface CustomControlsProps {
  playing: boolean;
  played: number; 
  duration: number; 
  muted: boolean;
  chapters: Chapter[];
  playbackRate: number;
  quality: string;
  availableRates: number[];
  availableQualities: string[];
  captionsEnabled: boolean;
  onPlayPause: () => void;
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onMute: () => void;
  onRewind: () => void;
  onFastForward: () => void;
  onSkipNext: () => void;
  onSkipPrev: () => void;
  onToggleFullscreen: () => void;
  onAddToList: () => void;
  onAddToQueue: () => void;
  onSetRate: (rate: number) => void;
  onSetQuality: (quality: string) => void;
  onToggleCaptions: () => void;
  onToggleCinema: () => void;
  isCinemaMode: boolean;
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
  playing, played, duration, muted, chapters, playbackRate, quality, availableRates, availableQualities,
  captionsEnabled, onPlayPause, onSeek, onMute, onRewind, onFastForward, onSkipNext, onSkipPrev,
  onToggleFullscreen, onAddToList, onAddToQueue, onSetRate, onSetQuality, onToggleCaptions,
  onToggleCinema, isCinemaMode, visible
}) => {
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverChapter, setHoverChapter] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!progressBarRef.current || duration === 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const time = percentage * duration;
    setHoverTime(time);
    setTooltipPos(x);
    
    const curChapter = [...chapters]
      .sort((a, b) => b.time - a.time)
      .find(c => time >= c.time);
    setHoverChapter(curChapter ? curChapter.title : "Video Content");
  };

  return (
    <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/95 to-transparent p-10 transition-all duration-500 z-[150] ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'}`}>
      
      {/* Settings Overlay */}
      {showSettings && (
        <div className="absolute bottom-28 right-10 w-64 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl p-3 z-[160] animate-fade-in">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-3 px-3 pt-2">Playback Engine</div>
          <button onClick={() => { onSetRate(1.5); setShowSettings(false); }} className="w-full flex justify-between p-3.5 hover:bg-white/5 rounded-xl text-[11px] font-black uppercase tracking-widest text-zinc-400 hover:text-primary transition-all">1.5x Boost</button>
          <button onClick={() => { onSetRate(2); setShowSettings(false); }} className="w-full flex justify-between p-3.5 hover:bg-white/5 rounded-xl text-[11px] font-black uppercase tracking-widest text-zinc-400 hover:text-primary transition-all">2.0x Mastery</button>
          <button onClick={() => { onSetRate(1); setShowSettings(false); }} className="w-full flex justify-between p-3.5 hover:bg-white/5 rounded-xl text-[11px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all">1.0x Standard</button>
        </div>
      )}

      {/* Scrubber Tooltip */}
      {hoverTime !== null && (
        <div className="absolute bottom-[140px] transform -translate-x-1/2 flex flex-col items-center pointer-events-none z-[160] animate-fade-in" style={{ left: `${tooltipPos + 40}px` }}>
          <div className="bg-zinc-900 border border-primary/40 px-6 py-3 rounded-2xl shadow-2xl text-center border-b-primary shadow-[0_20px_50px_rgba(0,0,0,0.8)] min-w-[120px]">
            <span className="text-[10px] font-black text-primary uppercase block mb-1 tracking-[0.2em]">{hoverChapter}</span>
            <span className="text-xl font-mono font-black text-white">{formatTime(hoverTime)}</span>
          </div>
          <div className="w-4 h-4 bg-zinc-900 border-r border-b border-primary/40 rotate-45 -mt-2 shadow-xl" />
        </div>
      )}

      {/* Progress Track */}
      <div ref={progressBarRef} onMouseMove={handleMouseMove} onMouseLeave={() => setHoverTime(null)} className="relative group mb-10 px-1 flex items-center h-6 cursor-pointer">
        <div className="absolute left-1 right-1 h-2 bg-white/10 rounded-full overflow-hidden border border-white/5">
          <div className="h-full bg-primary shadow-[0_0_30px_rgba(225,0,255,1)] transition-all duration-75" style={{ width: `${played * 100}%` }} />
        </div>
        <input type="range" min={0} max={1} step="any" value={played} onChange={onSeek} 
          className="progress-range absolute inset-0 w-full bg-transparent appearance-none cursor-pointer z-20 opacity-0 md:group-hover:opacity-100" 
        />
      </div>

      <div className="flex items-center justify-between text-white overflow-visible">
        <div className="flex items-center gap-6">
          <button onClick={onPlayPause} className="hover:text-primary transition-all p-3 bg-white/5 rounded-full shadow-lg active:scale-90">{playing ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}</button>
          <div className="flex items-center gap-4">
            <button onClick={onRewind} className="p-3 hover:bg-white/5 rounded-xl transition-all active:scale-90" title="Back 10s"><SkipBack size={24} fill="currentColor" /></button>
            <button onClick={onFastForward} className="p-3 hover:bg-white/5 rounded-xl transition-all active:scale-90" title="Forward 10s"><SkipForward size={24} fill="currentColor" /></button>
          </div>
          <button onClick={onMute} className="p-3 hover:bg-white/5 rounded-full transition-all active:scale-90">{muted ? <VolumeX size={24} className="text-red-500" /> : <Volume2 size={24} />}</button>
          <div className="text-base font-mono font-black text-zinc-100 ml-2 tracking-widest">{formatTime(duration * played)} <span className="text-zinc-500 text-sm">/ {formatTime(duration)}</span></div>
        </div>

        <div className="flex items-center gap-6">
          <button onClick={onAddToList} className="px-6 py-4 bg-white/5 hover:bg-primary/20 hover:text-primary border border-white/10 rounded-full text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-3 transition-all active:scale-95"><Plus size={18} /> Add List</button>
          <button onClick={onAddToQueue} className="px-6 py-4 bg-white/5 hover:bg-primary/20 hover:text-primary border border-white/10 rounded-full text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-3 transition-all active:scale-95"><ListOrdered size={18} /> Add Queue</button>
          <div className="flex items-center gap-4">
            <button onClick={onToggleCinema} className={`p-4 bg-white/5 hover:bg-white/10 rounded-full transition-all shadow-lg active:scale-90 ${isCinemaMode ? 'text-primary border border-primary/30 bg-primary/5' : ''}`} title="Theater Mode (T)"><Monitor size={24} /></button>
            <button onClick={() => setShowSettings(!showSettings)} className={`p-4 bg-white/5 hover:bg-white/10 rounded-full transition-all shadow-lg active:scale-90 ${showSettings ? 'text-primary rotate-90' : ''}`}><Settings size={24} /></button>
            <button onClick={onToggleFullscreen} className="p-4 bg-white/5 hover:bg-primary/20 hover:text-primary rounded-full border border-transparent hover:border-primary/30 transition-all shadow-lg active:scale-90" title="Fullscreen (F)"><Maximize size={24} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};
