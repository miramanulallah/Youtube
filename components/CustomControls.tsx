
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward, Plus, ListPlus, Clock, ListOrdered, Settings, Check, ChevronRight, Subtitles } from 'lucide-react';
import { Chapter } from '../types';

interface CustomControlsProps {
  playing: boolean;
  played: number; // 0 to 1
  duration: number; // seconds
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

const qualityLabel = (q: string) => {
  const map: Record<string, string> = {
    'hd2160': '4K',
    'hd1440': '2K',
    'hd1080': '1080p',
    'hd720': '720p',
    'large': '480p',
    'medium': '360p',
    'small': '240p',
    'tiny': '144p',
    'auto': 'Auto'
  };
  return map[q] || q;
};

export const CustomControls: React.FC<CustomControlsProps> = ({
  playing,
  played,
  duration,
  muted,
  chapters,
  playbackRate,
  quality,
  availableRates,
  availableQualities,
  captionsEnabled,
  onPlayPause,
  onSeek,
  onMute,
  onRewind,
  onFastForward,
  onSkipNext,
  onSkipPrev,
  onToggleFullscreen,
  onAddToList,
  onAddToQueue,
  onSetRate,
  onSetQuality,
  onToggleCaptions,
  visible
}) => {
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsView, setSettingsView] = useState<'main' | 'speed' | 'quality'>('main');
  const progressBarRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!progressBarRef.current || duration === 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const time = percentage * duration;
    setHoverTime(time);
    setTooltipPos(x);
  };

  const handleMouseLeave = () => {
    setHoverTime(null);
  };

  const toggleSettings = () => {
    setShowSettings(!showSettings);
    setSettingsView('main');
  };

  return (
    <div 
      className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/95 to-transparent px-8 pb-8 pt-24 transition-all duration-500 z-[100] pointer-events-auto ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'}`}
    >
      {showSettings && visible && (
        <div className="absolute bottom-[100px] right-8 w-64 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-fade-in z-[110]">
          {settingsView === 'main' && (
            <div className="p-2 space-y-1">
              <button 
                onClick={() => setSettingsView('quality')}
                className="w-full flex items-center justify-between p-3 hover:bg-white/5 rounded-xl transition-colors text-xs font-bold uppercase tracking-widest"
              >
                <div className="flex items-center gap-3 text-zinc-400"><Settings size={14} /> Quality</div>
                <div className="flex items-center gap-2 text-primary">{qualityLabel(quality)} <ChevronRight size={14} /></div>
              </button>
              <button 
                onClick={() => setSettingsView('speed')}
                className="w-full flex items-center justify-between p-3 hover:bg-white/5 rounded-xl transition-colors text-xs font-bold uppercase tracking-widest"
              >
                <div className="flex items-center gap-3 text-zinc-400"><Clock size={14} /> Speed</div>
                <div className="flex items-center gap-2 text-primary">{playbackRate}x <ChevronRight size={14} /></div>
              </button>
              <button 
                onClick={onToggleCaptions}
                className="w-full flex items-center justify-between p-3 hover:bg-white/5 rounded-xl transition-colors text-xs font-bold uppercase tracking-widest"
              >
                <div className="flex items-center gap-3 text-zinc-400"><Subtitles size={14} /> Captions</div>
                <div className={`w-8 h-4 rounded-full relative transition-colors ${captionsEnabled ? 'bg-primary' : 'bg-zinc-700'}`}>
                  <div className={`absolute top-1 w-2 h-2 bg-white rounded-full transition-all ${captionsEnabled ? 'left-5' : 'left-1'}`} />
                </div>
              </button>
            </div>
          )}
          {settingsView === 'speed' && (
            <div className="p-2">
              <button onClick={() => setSettingsView('main')} className="w-full p-2 text-[10px] font-black uppercase text-zinc-500 hover:text-white border-b border-white/5 mb-2">Back</button>
              <div className="max-h-48 overflow-y-auto custom-scrollbar">
                {availableRates.map(rate => (
                  <button key={rate} onClick={() => { onSetRate(rate); setSettingsView('main'); }} className="w-full flex items-center justify-between p-3 hover:bg-white/5 rounded-xl text-xs font-bold">
                    <span>{rate}x</span>
                    {playbackRate === rate && <Check size={14} className="text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          )}
          {settingsView === 'quality' && (
            <div className="p-2">
              <button onClick={() => setSettingsView('main')} className="w-full p-2 text-[10px] font-black uppercase text-zinc-500 hover:text-white border-b border-white/5 mb-2">Back</button>
              <div className="max-h-48 overflow-y-auto custom-scrollbar">
                {availableQualities.map(q => (
                  <button key={q} onClick={() => { onSetQuality(q); setSettingsView('main'); }} className="w-full flex items-center justify-between p-3 hover:bg-white/5 rounded-xl text-xs font-bold">
                    <span>{qualityLabel(q)}</span>
                    {quality === q && <Check size={14} className="text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {hoverTime !== null && (
        <div 
          className="absolute bottom-[160px] transform -translate-x-1/2 flex flex-col items-center pointer-events-none z-[110] animate-in fade-in zoom-in duration-150"
          style={{ left: `${tooltipPos + 32}px` }}
        >
          <div className="bg-zinc-900 border border-white/20 px-5 py-3 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.9)] flex flex-col items-center gap-1 border-b-primary">
            <span className="text-lg font-mono font-black text-white leading-none">{formatTime(hoverTime)}</span>
          </div>
          <div className="w-4 h-4 bg-zinc-900 border-r border-b border-white/20 transform rotate-45 -mt-2 shadow-xl" />
        </div>
      )}

      <div 
        ref={progressBarRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative group mb-8 px-1 flex items-center h-8 cursor-pointer"
      >
        <div className="absolute left-1 right-1 h-2 flex items-center overflow-hidden bg-white/10 rounded-full border border-white/5">
          <div 
            className="h-full bg-primary shadow-[0_0_25px_rgba(225,0,255,0.9)] transition-all duration-75 relative z-10" 
            style={{ width: `${played * 100}%` }} 
          />
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
          <button onClick={onPlayPause} className="hover:text-primary transition-all active:scale-90 p-3 bg-white/5 hover:bg-white/10 rounded-full shadow-lg">
            {playing ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />}
          </button>
          
          <div className="flex items-center gap-5 text-white/90">
            <button onClick={onSkipPrev} className="hover:text-primary transition-all p-2.5 bg-white/5 hover:bg-white/10 rounded-xl" title="Previous Video">
              <SkipBack size={26} fill="currentColor" />
            </button>
            <button onClick={onSkipNext} className="hover:text-primary transition-all p-2.5 bg-white/5 hover:bg-white/10 rounded-xl" title="Next Video">
              <SkipForward size={26} fill="currentColor" />
            </button>
          </div>

          <button onClick={onMute} className="hover:text-white transition-colors p-2.5 bg-white/5 hover:bg-white/10 rounded-full">
            {muted ? <VolumeX size={22} className="text-red-400" /> : <Volume2 size={22} />}
          </button>

          <div className="flex flex-col ml-2">
            <span className="text-base font-mono font-black tracking-widest text-zinc-100 leading-tight">
              {formatTime(duration * played)}
            </span>
            <span className="text-[10px] font-mono text-zinc-500 uppercase font-bold">
               / {formatTime(duration)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <button onClick={onAddToQueue} className="flex items-center gap-2.5 px-6 py-3 bg-white/5 hover:bg-primary/20 hover:text-primary border border-white/10 rounded-full transition-all text-[11px] font-black uppercase tracking-[0.15em] shadow-xl">
            <ListOrdered size={16} /> Add to Queue
          </button>
          <button onClick={onAddToList} className="flex items-center gap-2.5 px-6 py-3 bg-white/5 hover:bg-primary/20 hover:text-primary border border-white/10 rounded-full transition-all text-[11px] font-black uppercase tracking-[0.15em] shadow-xl">
            <Plus size={16} /> Add to List
          </button>

          <div className="flex items-center gap-3">
            <button onClick={toggleSettings} className={`p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all shadow-lg ${showSettings ? 'text-primary ring-2 ring-primary/40 bg-primary/5' : ''}`}>
              <Settings size={24} className={showSettings ? 'rotate-90 transition-transform' : 'transition-transform'} />
            </button>
            <button onClick={onToggleFullscreen} className="hover:text-primary transition-all p-3 bg-white/5 hover:bg-white/10 rounded-full shadow-lg">
              <Maximize size={24} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
