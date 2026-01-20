
import React, { useState, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward, Settings, Monitor, ListOrdered, Plus, Check, X, Send } from 'lucide-react';
import { Chapter, Playlist } from '../types';

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
  playlists: Playlist[];
  queues: Playlist[];
  onAddToExistingPlaylist: (id: string) => void;
  onAddToExistingQueue: (id: string, externalUrl?: string) => void;
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
  onToggleCinema, isCinemaMode, visible, playlists, queues, onAddToExistingPlaylist, onAddToExistingQueue
}) => {
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverChapter, setHoverChapter] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [activePopup, setActivePopup] = useState<'list' | 'queue' | null>(null);
  const [addedConfirm, setAddedConfirm] = useState<string | null>(null);
  const [externalQueueUrl, setExternalQueueUrl] = useState('');
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
    setHoverChapter(curChapter ? curChapter.title : "VIDEO CONTENT");
  };

  const handleAddToItem = (id: string, type: 'list' | 'queue') => {
    if(type === 'list') {
      onAddToExistingPlaylist(id);
    } else {
      onAddToExistingQueue(id, externalQueueUrl);
    }
    setAddedConfirm(id);
    setTimeout(() => {
        setAddedConfirm(null);
        setActivePopup(null);
        setExternalQueueUrl('');
    }, 1000);
  };

  return (
    <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/95 to-transparent p-10 transition-all duration-500 z-[150] ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16 pointer-events-none'}`}>
      
      {/* Centered Modal Overlay for Popups */}
      {activePopup && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-96 bg-[#121212] border border-white/10 rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,1)] p-6 space-y-6">
            <div className="flex justify-between items-center">
              <span className="text-[12px] font-black uppercase tracking-widest text-primary">{activePopup === 'list' ? 'Select Playlist' : 'Add to Queue'}</span>
              <button onClick={() => { setActivePopup(null); setExternalQueueUrl(''); }} className="text-zinc-500 hover:text-white transition-colors p-2"><X size={20} /></button>
            </div>
            
            {activePopup === 'queue' && (
              <div className="space-y-3">
                 <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tight">Paste YouTube Link (Optional)</span>
                 <div className="flex gap-2">
                   <input 
                     autoFocus
                     value={externalQueueUrl} 
                     onChange={e => setExternalQueueUrl(e.target.value)} 
                     placeholder="https://youtube.com/watch?v=..." 
                     className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-[11px] text-zinc-300 focus:border-primary outline-none transition-all" 
                   />
                 </div>
              </div>
            )}

            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
              {(activePopup === 'list' ? playlists : queues).map(p => (
                <button 
                  key={p.id} 
                  onClick={() => handleAddToItem(p.id, activePopup)}
                  className={`w-full text-left p-4 rounded-2xl flex items-center justify-between group transition-all ${addedConfirm === p.id ? 'bg-primary/20 text-primary border border-primary/40' : 'bg-white/5 hover:bg-white/10 text-zinc-300 border border-transparent'}`}
                >
                  <div className="flex flex-col">
                    <span className="text-[12px] font-black uppercase tracking-wider truncate">{p.name}</span>
                    <span className="text-[9px] text-zinc-500">{p.videoIds.length} VIDEOS</span>
                  </div>
                  {addedConfirm === p.id ? <Check size={18} /> : <Plus size={18} className="opacity-0 group-hover:opacity-100" />}
                </button>
              ))}
              {(activePopup === 'list' ? playlists : queues).length === 0 && (
                <div className="text-center py-10">
                   <ListOrdered size={32} className="mx-auto text-zinc-800 mb-3" />
                   <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">No target collections found</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Overlay */}
      {showSettings && (
        <div className="absolute bottom-28 right-10 w-64 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl p-3 z-[160] animate-fade-in">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-3 px-3 pt-2">Playback Engine</div>
          {availableRates.map(rate => (
            <button key={rate} onClick={() => { onSetRate(rate); setShowSettings(false); }} className={`w-full flex justify-between p-3.5 hover:bg-white/5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${playbackRate === rate ? 'text-primary' : 'text-zinc-400 hover:text-white'}`}>
              <span>{rate}x</span>
              <span className="text-[8px] opacity-40">{rate > 1 ? 'BOOST' : rate < 1 ? 'SLOW' : 'STD'}</span>
            </button>
          ))}
        </div>
      )}

      {/* Scrubber Tooltip */}
      {hoverTime !== null && (
        <div className="absolute bottom-[220px] transform -translate-x-1/2 flex flex-col items-center pointer-events-none z-[160] animate-fade-in" style={{ left: `${tooltipPos}px` }}>
          <div className="bg-[#0f0f0f] border border-primary/40 px-8 py-5 rounded-[32px] shadow-[0_20px_80px_rgba(0,0,0,0.9)] text-center border-b-primary min-w-[150px]">
            <span className="text-[10px] font-black text-primary uppercase block mb-1 tracking-[0.2em]">{hoverChapter}</span>
            <span className="text-3xl font-mono font-black text-white">{formatTime(hoverTime)}</span>
          </div>
          <div className="w-6 h-6 bg-[#0f0f0f] border-r border-b border-primary/40 rotate-45 -mt-3 shadow-xl" />
        </div>
      )}

      {/* Progress Track */}
      <div ref={progressBarRef} onMouseMove={handleMouseMove} onMouseLeave={() => setHoverTime(null)} className="relative group mb-12 px-1 flex items-center h-10 cursor-pointer">
        <div className="absolute left-1 right-1 h-3 bg-white/10 rounded-full overflow-hidden border border-white/5">
          {/* Legacy Solid Purple Background Fill */}
          <div className="h-full bg-primary shadow-[0_0_30px_rgba(225,0,255,1)]" style={{ width: `${played * 100}%` }} />
        </div>
        <input 
            type="range" min={0} max={1} step="any" value={played} onChange={onSeek} 
            className="progress-range absolute inset-0 w-full bg-transparent appearance-none cursor-pointer z-20 opacity-0 md:group-hover:opacity-100" 
        />
      </div>

      <div className="flex items-center justify-between text-white overflow-visible">
        <div className="flex items-center gap-6">
          <button onClick={onPlayPause} className="hover:text-primary transition-all p-4 bg-white/5 rounded-full shadow-lg active:scale-90">{playing ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />}</button>
          <div className="flex items-center gap-4">
            <button onClick={onRewind} className="p-4 hover:bg-white/5 rounded-2xl transition-all active:scale-90" title="Back 10s"><SkipBack size={28} fill="currentColor" /></button>
            <button onClick={onFastForward} className="p-4 hover:bg-white/5 rounded-2xl transition-all active:scale-90" title="Forward 10s"><SkipForward size={28} fill="currentColor" /></button>
          </div>
          <button onClick={onMute} className="p-4 hover:bg-white/5 rounded-full transition-all active:scale-90">{muted ? <VolumeX size={28} className="text-red-500" /> : <Volume2 size={28} />}</button>
          <div className="text-2xl font-mono font-black text-zinc-100 ml-4 tracking-tighter">{formatTime(duration * played)} <span className="text-zinc-600 text-base opacity-40">/ {formatTime(duration)}</span></div>
        </div>

        <div className="flex items-center gap-6">
          <button onClick={() => setActivePopup('list')} className="px-10 py-5 bg-[#181818] hover:bg-primary/20 hover:text-primary border border-white/10 rounded-full text-[13px] font-black uppercase tracking-[0.2em] flex items-center gap-3 transition-all active:scale-95 shadow-2xl"><Plus size={22} /> Add List</button>
          <button onClick={() => setActivePopup('queue')} className="px-10 py-5 bg-[#181818] hover:bg-primary/20 hover:text-primary border border-white/10 rounded-full text-[13px] font-black uppercase tracking-[0.2em] flex items-center gap-3 transition-all active:scale-95 shadow-2xl"><ListOrdered size={22} /> Add Queue</button>
          <div className="flex items-center gap-4">
            <button onClick={onToggleCinema} className={`p-5 bg-white/5 hover:bg-white/10 rounded-full transition-all shadow-lg active:scale-90 ${isCinemaMode ? 'text-primary border border-primary/30 bg-primary/5' : ''}`} title="Theater Mode (T)"><Monitor size={28} /></button>
            <button onClick={() => setShowSettings(!showSettings)} className={`p-5 bg-white/5 hover:bg-white/10 rounded-full transition-all shadow-lg active:scale-90 ${showSettings ? 'text-primary rotate-90' : ''}`}><Settings size={28} /></button>
            <button onClick={onToggleFullscreen} className="p-5 bg-white/5 hover:bg-primary/20 hover:text-primary rounded-full border border-transparent hover:border-primary/30 transition-all shadow-lg active:scale-90" title="Fullscreen (F)"><Maximize size={28} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};
