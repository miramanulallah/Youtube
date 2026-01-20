
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HistoryPanel } from './components/HistoryPanel';
import { AIStudio } from './components/AIStudio';
import { CustomControls } from './components/CustomControls';
import { VideoHistoryItem, SidebarView, Playlist } from './types';
import { evaluateIntent } from './services/geminiService';
import { 
  Loader2, BrainCircuit, Zap, CheckCircle2, RotateCcw, Plus, Clock, ListOrdered
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'yt_workspace_history';
const WATCH_LATER_KEY = 'yt_workspace_watch_later';
const PLAYLISTS_KEY = 'yt_workspace_playlists';
const QUEUES_KEY = 'yt_workspace_queues';

const FALLBACK_FAVICON = "https://8upload.com/preview/f01c8db6aede6f36/favicon-96x96.png";
const FALLBACK_CENTER_LOGO = "https://8upload.com/preview/69403e83898df13d/12086f9a-12fe-4396-81ce-5fc8d7866199.png";
const PROTOCOL_ICON = "https://8upload.com/preview/b4f4f2cc43d0df2b/_CITYPNG.COM_HD_Purple_Neon_Aesthetic_Youtube_YT_Play_Icon_PNG_-_2000x2000.png";

const extractYoutubeId = (url: string): string | null => {
  if (!url) return null;
  const decodedUrl = decodeURIComponent(url);
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = decodedUrl.match(regex);
  return match ? match[1] : null;
};

const fetchThumbnail = (id: string) => `https://img.youtube.com/vi/${id}/mqdefault.jpg`;

const WorkspaceLogo = ({ src, fallback, className }: { src: string; fallback: string; className?: string }) => {
  const [error, setError] = useState(false);
  return (
    <img 
      src={error ? fallback : src} 
      className={className} 
      onError={() => setError(true)} 
      alt="Workspace Logo"
    />
  );
};

function App() {
  const [urlInput, setUrlInput] = useState('');
  const [intentInput, setIntentInput] = useState('');
  const [currentVideo, setCurrentVideo] = useState<VideoHistoryItem | null>(null);
  const [history, setHistory] = useState<VideoHistoryItem[]>([]);
  const [watchLater, setWatchLater] = useState<VideoHistoryItem[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [queues, setQueues] = useState<Playlist[]>([]);
  const [sidebarView, setSidebarView] = useState<SidebarView>(SidebarView.HISTORY);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isGateOpen, setIsGateOpen] = useState(false);
  const [videoFinished, setVideoFinished] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const isSeekingRef = useRef(false);
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [focusTime, setFocusTime] = useState(0);
  const [isFocusing, setIsFocusing] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [quality, setQuality] = useState('auto');
  const [availableRates, setAvailableRates] = useState<number[]>([1]);
  const [availableQualities, setAvailableQualities] = useState<string[]>(['auto']);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);

  const seekForward = useCallback(() => {
    if (playerRef.current) {
      isSeekingRef.current = true;
      const cur = playerRef.current.getCurrentTime();
      playerRef.current.seekTo(cur + 10, true);
      setTimeout(() => { isSeekingRef.current = false; }, 800);
    }
  }, []);

  const seekBackward = useCallback(() => {
    if (playerRef.current) {
      isSeekingRef.current = true;
      const cur = playerRef.current.getCurrentTime();
      playerRef.current.seekTo(cur - 10, true);
      setTimeout(() => { isSeekingRef.current = false; }, 800);
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (!playerRef.current) return;
    const state = playerRef.current.getPlayerState();
    if (state === 1) playerRef.current.pauseVideo();
    else playerRef.current.playVideo();
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => console.error(err));
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === ' ') { e.preventDefault(); togglePlay(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); seekForward(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); seekBackward(); }
      if (e.key.toLowerCase() === 'f') { e.preventDefault(); toggleFullscreen(); }
      if (e.key.toLowerCase() === 't') { e.preventDefault(); setIsCinemaMode(prev => !prev); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, seekForward, seekBackward, toggleFullscreen]);

  useEffect(() => {
    const savedH = localStorage.getItem(LOCAL_STORAGE_KEY);
    const savedW = localStorage.getItem(WATCH_LATER_KEY);
    const savedP = localStorage.getItem(PLAYLISTS_KEY);
    const savedQ = localStorage.getItem(QUEUES_KEY);
    if (savedH) try { setHistory(JSON.parse(savedH)); } catch (e) {}
    if (savedW) try { setWatchLater(JSON.parse(savedW)); } catch (e) {}
    if (savedP) try { setPlaylists(JSON.parse(savedP)); } catch (e) {}
    if (savedQ) try { setQueues(JSON.parse(savedQ)); } catch (e) {}
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(history));
    localStorage.setItem(WATCH_LATER_KEY, JSON.stringify(watchLater));
    localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
    localStorage.setItem(QUEUES_KEY, JSON.stringify(queues));
  }, [history, watchLater, playlists, queues]);

  useEffect(() => {
    let interval: any;
    if (isFocusing) interval = setInterval(() => setFocusTime(p => p + 1), 1000);
    return () => clearInterval(interval);
  }, [isFocusing]);

  useEffect(() => {
    let interval: any;
    if (isPlaying && playerRef.current?.getCurrentTime) {
      interval = setInterval(() => {
        const c = playerRef.current.getCurrentTime();
        const t = playerRef.current.getDuration();
        if (t > 0 && !isSeekingRef.current) {
          setPlayed(c / t);
          setDuration(t);
        }
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const onPlayerReady = useCallback((event: any) => {
    playerRef.current = event.target;
    setDuration(event.target.getDuration());
    setAvailableRates(event.target.getAvailablePlaybackRates());
    setAvailableQualities(event.target.getAvailableQualityLevels());
    if (currentVideo && currentVideo.progress > 0) {
      event.target.seekTo(currentVideo.progress, true);
    }
  }, [currentVideo]);

  const onPlayerStateChange = useCallback((e: any) => {
    const YT = (window as any).YT;
    // Only finish if not seeking and state is truly ENDED
    if (e.data === YT.PlayerState.ENDED && !isSeekingRef.current) {
      setVideoFinished(true); 
      setIsFocusing(false); 
      setIsPlaying(false);
    } else if (e.data === YT.PlayerState.PLAYING) {
      setVideoFinished(false); 
      setIsFocusing(true); 
      setIsPlaying(true);
    } else if (e.data === YT.PlayerState.PAUSED) {
      setIsPlaying(false); 
      setIsFocusing(false);
    }
  }, []);

  const loadPlayer = useCallback((videoId: string, startAt: number = 0) => {
    const checkYT = setInterval(() => {
      if ((window as any).YT?.Player && playerContainerRef.current) {
        clearInterval(checkYT);
        const div = document.createElement('div');
        div.id = 'yt-player-internal';
        playerContainerRef.current.innerHTML = '';
        playerContainerRef.current.appendChild(div);
        new (window as any).YT.Player('yt-player-internal', {
          height: '100%', width: '100%', videoId,
          playerVars: { autoplay: 1, controls: 0, modestbranding: 1, rel: 0, showinfo: 0, iv_load_policy: 3, disablekb: 1, fs: 0, start: Math.floor(startAt) },
          events: { onReady: onPlayerReady, onStateChange: onPlayerStateChange }
        });
      }
    }, 100);
  }, [onPlayerReady, onPlayerStateChange]);

  const startSession = (id: string, category: string, initialIntent: string = "") => {
    const existing = history.find(h => extractYoutubeId(h.url) === id);
    const newItem: VideoHistoryItem = existing ? { ...existing, progress: existing.progress } : {
      id: crypto.randomUUID(),
      url: `https://www.youtube.com/watch?v=${id}`,
      title: 'Session Started...', 
      thumbnailUrl: fetchThumbnail(id),
      lastPlayed: Date.now(),
      progress: 0,
      duration: 0,
      completed: false,
      notes: initialIntent ? `Objective: ${initialIntent}\n\n` : '',
      category,
      chapters: []
    };
    setCurrentVideo(newItem);
    if (!existing) setHistory(old => [newItem, ...old]);
    setIsGateOpen(true);
    setIsCinemaMode(true);
    setVideoFinished(false);
    setTimeout(() => loadPlayer(id, newItem.progress), 200);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.history) setHistory(data.history);
        if (data.watchLater) setWatchLater(data.watchLater);
        if (data.playlists) setPlaylists(data.playlists);
        if (data.queues) setQueues(data.queues);
        alert("Workspace data imported successfully.");
      } catch (err) {
        alert("Failed to parse workspace file.");
      }
    };
    reader.readAsText(file);
  };

  const activeVideoId = extractYoutubeId(urlInput);
  const isProtocolActive = activeVideoId && !isGateOpen;
  const showHeader = !isCinemaMode && !isProtocolActive && !isGateOpen;

  const handleAddToWatchLater = () => {
    const vidId = extractYoutubeId(urlInput);
    if (!vidId) return;
    const newItem: VideoHistoryItem = {
      id: crypto.randomUUID(),
      url: urlInput,
      title: 'Saved from Protocol',
      thumbnailUrl: fetchThumbnail(vidId),
      lastPlayed: Date.now(),
      progress: 0,
      duration: 0,
      completed: false,
      notes: '',
      category: 'Saved',
      chapters: []
    };
    setWatchLater(prev => [newItem, ...prev]);
    alert("Added to Watch Later.");
  };

  return (
    <div ref={containerRef} className="h-screen w-screen bg-black text-[#f1f1f1] flex overflow-hidden font-sans select-none">
      {!isCinemaMode && (
        <aside className="w-80 flex flex-col p-5 border-r border-white/5 bg-[#0f0f0f] h-full shrink-0 animate-in slide-in-from-left duration-300">
          <div className="mb-8 flex items-center gap-4 px-2 shrink-0">
            <WorkspaceLogo src="/favicon-96x96.png" fallback={FALLBACK_FAVICON} className="w-10 h-10 object-contain rounded-lg" />
            <div className="flex flex-col">
              <h1 className="text-white font-bold text-2xl tracking-tight leading-none">YouTube</h1>
              <span className="text-primary font-black text-[10px] tracking-[0.25em] -mt-0.5 uppercase">WORKSPACE</span>
            </div>
          </div>
          
          <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/5 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Focus Session</span>
              <span className="text-xs font-mono text-primary">{Math.floor(focusTime / 60)}:{String(focusTime % 60).padStart(2, '0')}</span>
            </div>
            <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-1000 shadow-[0_0_10px_rgba(225,0,255,0.4)]" style={{ width: `${Math.min((focusTime / 3600) * 100, 100)}%` }} />
            </div>
          </div>

          <HistoryPanel 
            history={history} watchLater={watchLater} playlists={playlists} queues={queues} currentView={sidebarView} onViewChange={setSidebarView}
            onSelect={i => { 
              const vidId = extractYoutubeId(i.url);
              if (vidId) {
                const exists = history.some(h => extractYoutubeId(h.url) === vidId);
                if (!exists) setHistory(prev => [i, ...prev]);
                setCurrentVideo(i); setUrlInput(i.url); setIsGateOpen(true); setIsCinemaMode(true); setVideoFinished(false);
                setTimeout(() => loadPlayer(vidId, i.progress), 200); 
              }
            }}
            onDelete={(id, wl) => wl ? setWatchLater(p => p.filter(i=>i.id!==id)) : setHistory(p => p.filter(i=>i.id!==id))}
            onRename={(id, t, wl) => wl ? setWatchLater(p => p.map(h=>h.id===id?{...h,title:t}:h)) : setHistory(p => p.map(h=>h.id===id?{...h,title:t}:h))}
            onCreatePlaylist={(name) => setPlaylists(prev => [...prev, { id: crypto.randomUUID(), name, videoIds: [] }])}
            onDeletePlaylist={(id) => setPlaylists(prev => prev.filter(p => p.id !== id))}
            onDeleteQueue={(id) => setQueues(prev => prev.filter(p => p.id !== id))}
            onExport={() => { const b = new Blob([JSON.stringify({history,watchLater,playlists,queues})],{type:'application/json'}); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href=u; a.download='workspace.json'; a.click(); }}
            onImport={handleImport}
          />
        </aside>
      )}

      <div className="flex-1 flex flex-col relative min-w-0 bg-black overflow-hidden h-full">
        {showHeader && (
          <header className="z-[100] w-full p-4 flex justify-between items-center bg-[#0f0f0f]/95 backdrop-blur-2xl fixed top-0 left-0 right-0 border-b border-white/5">
            <div className="flex items-center gap-3 ml-2">
              <WorkspaceLogo src="/favicon-96x96.png" fallback={FALLBACK_FAVICON} className="w-8 h-8 object-contain rounded-md" />
              <div className="hidden sm:flex flex-col">
                <span className="text-[11px] font-bold text-white uppercase tracking-tight leading-none">YouTube</span>
                <span className="text-[8px] font-black text-primary uppercase tracking-[0.2em]">WORKSPACE</span>
              </div>
            </div>
          </header>
        )}

        <main className={`flex-1 flex gap-0 transition-all duration-300 min-h-0 ${showHeader ? 'pt-20' : 'pt-0'}`}>
          <div className="flex-1 relative bg-black overflow-hidden flex items-center justify-center">
            {isProtocolActive && (
              <div className="absolute inset-0 z-[150] flex items-center justify-center bg-[#0f0f0f] p-8 animate-fade-in">
                <div className="max-w-2xl w-full text-center space-y-12">
                  <div className="relative inline-block">
                    <WorkspaceLogo src={PROTOCOL_ICON} fallback={PROTOCOL_ICON} className="w-40 h-40 mx-auto animate-glow-pulse" />
                  </div>
                  <h2 className="text-4xl font-black uppercase tracking-tight text-white">Intentional Protocol</h2>
                  <textarea 
                    value={intentInput} 
                    onChange={e => setIntentInput(e.target.value)} 
                    placeholder="Why are you watching this? State your learning objective..." 
                    className="w-full bg-[#181818] border border-white/10 rounded-2xl p-8 text-lg text-zinc-300 focus:border-primary outline-none min-h-[180px] resize-none transition-all shadow-2xl" 
                  />
                  <div className="space-y-6">
                    <div className="flex gap-6 justify-center max-w-lg mx-auto">
                      <button 
                        type="button" 
                        onClick={() => { const id = extractYoutubeId(urlInput); if(id) startSession(id, "Quick Session"); }} 
                        className="flex-1 py-5 bg-zinc-800 text-zinc-400 hover:text-white rounded-full font-bold uppercase text-[11px] tracking-[0.2em] transition-all border border-white/5 active:scale-95"
                      >
                        Skip Analysis
                      </button>
                      <button 
                        onClick={async (e) => {
                          e.preventDefault(); if (intentInput.length < 2) return; setIsEvaluating(true);
                          const result = await evaluateIntent(urlInput, intentInput); setIsEvaluating(false);
                          startSession(extractYoutubeId(urlInput)!, result.category, intentInput);
                        }} 
                        disabled={isEvaluating || !intentInput.trim()} 
                        className="flex-[1.5] py-5 bg-[#d4d4d8] hover:bg-white text-black rounded-full font-bold uppercase text-[11px] tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.1)] disabled:opacity-50"
                      >
                        {isEvaluating ? <Loader2 className="animate-spin" /> : <BrainCircuit size={20} />} Verify Intent
                      </button>
                    </div>
                    <div className="flex gap-4 justify-center">
                       <button onClick={handleAddToWatchLater} className="flex items-center gap-2 px-8 py-4 bg-[#181818] border border-white/10 rounded-full text-[11px] font-black text-zinc-400 hover:text-white hover:bg-zinc-800 uppercase transition-all active:scale-95 shadow-lg"><Clock size={16} /> Watch Later</button>
                       <button onClick={() => setSidebarView(SidebarView.QUEUE)} className="flex items-center gap-2 px-8 py-4 bg-[#181818] border border-white/10 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all active:scale-95 shadow-lg"><Plus size={20} /></button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className={`w-full h-full relative ${isGateOpen && !videoFinished ? 'block' : 'hidden'}`}>
              <div ref={playerContainerRef} className="w-full h-full" />
              <CustomControls 
                playing={isPlaying} played={played} duration={duration} muted={isMuted} 
                chapters={currentVideo?.chapters || []}
                playbackRate={playbackRate} quality={quality} availableRates={availableRates} availableQualities={availableQualities}
                captionsEnabled={captionsEnabled} onPlayPause={togglePlay}
                onSeek={e => { 
                   const v = parseFloat(e.target.value); 
                   setPlayed(v); 
                   isSeekingRef.current = true;
                   playerRef.current?.seekTo(v * duration, true); 
                   setTimeout(() => { isSeekingRef.current = false; }, 800);
                }}
                onMute={() => { if (isMuted) { playerRef.current?.unMute(); setIsMuted(false); } else { playerRef.current?.mute(); setIsMuted(true); } }}
                onRewind={seekBackward} onFastForward={seekForward} onSkipNext={() => {}} onSkipPrev={() => {}}
                onToggleFullscreen={toggleFullscreen} 
                onAddToList={() => {}} // Popups handled internally in CustomControls now
                onAddToQueue={() => {}} // Popups handled internally in CustomControls now
                onSetRate={r => { playerRef.current?.setPlaybackRate(r); setPlaybackRate(r); }}
                onSetQuality={q => { playerRef.current?.setPlaybackQuality(q); setQuality(q); }}
                onToggleCaptions={() => { setCaptionsEnabled(!captionsEnabled); }}
                onToggleCinema={() => setIsCinemaMode(!isCinemaMode)}
                isCinemaMode={isCinemaMode}
                visible={true}
                playlists={playlists}
                queues={queues}
                onAddToExistingPlaylist={(pid) => {
                  const id = extractYoutubeId(currentVideo?.url || '');
                  if(id) setPlaylists(old => old.map(p => p.id === pid ? {...p, videoIds: [...p.videoIds, id]} : p));
                }}
                onAddToExistingQueue={(qid, externalUrl) => {
                   const id = externalUrl ? extractYoutubeId(externalUrl) : extractYoutubeId(currentVideo?.url || '');
                   if(id) setQueues(old => old.map(q => q.id === qid ? {...q, videoIds: [...q.videoIds, id]} : q));
                }}
              />
            </div>

            {videoFinished && (
              <div className="absolute inset-0 z-[200] flex flex-col items-center justify-center bg-black/98 backdrop-blur-3xl p-12 text-center animate-fade-in">
                <CheckCircle2 size={100} className="text-emerald-500 mb-6 drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]" />
                <h2 className="text-5xl font-black mb-4 tracking-tighter text-white">Session Refined</h2>
                <div className="flex gap-6 mt-12">
                  <button onClick={() => { setVideoFinished(false); playerRef.current?.playVideo(); }} className="px-10 py-5 bg-white/5 text-white rounded-full font-bold hover:bg-white/10 transition-all border border-white/10 uppercase tracking-widest text-[11px]"><RotateCcw size={18} className="inline mr-2" /> Retry</button>
                  <button onClick={() => { setIsGateOpen(false); setIsCinemaMode(false); setUrlInput(''); }} className="px-10 py-5 bg-primary text-white rounded-full font-bold shadow-[0_0_30px_rgba(225,0,255,0.4)] hover:bg-primaryHover transition-all uppercase tracking-widest text-[11px]">Exit Session</button>
                </div>
              </div>
            )}

            {!activeVideoId && !isGateOpen && (
              <div className="text-center p-12 animate-fade-in flex flex-col items-center max-w-4xl w-full">
                <WorkspaceLogo src="/favicon-96x96.png" fallback={FALLBACK_CENTER_LOGO} className="w-56 h-56 mx-auto mb-12 animate-glow-pulse object-contain" />
                <div className="relative w-full max-w-2xl mx-auto mb-10">
                  <input type="text" value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="Paste video link to enter Workspace..." className="w-full bg-[#121212] border border-white/10 text-white px-8 py-5 rounded-full text-lg outline-none focus:border-primary transition-all shadow-2xl" />
                  <button onClick={() => { if(extractYoutubeId(urlInput)) setIsGateOpen(false); }} className="absolute right-2 top-2 bottom-2 px-8 bg-[#181818] hover:bg-zinc-800 text-zinc-200 rounded-full flex items-center gap-3 font-black uppercase tracking-widest text-[12px] border border-white/5 transition-all active:scale-95 shadow-inner">
                    VERIFY <Zap size={18} className="text-primary fill-primary" />
                  </button>
                </div>
                <h2 className="text-5xl font-black mb-4 tracking-tight text-white">Zero Noise. Pure Learning.</h2>
              </div>
            )}
          </div>
          {!isCinemaMode && (
            <div className="w-[440px] hidden xl:flex flex-col h-full shrink-0 border-l border-white/5 animate-in slide-in-from-right duration-500 overflow-hidden">
              <AIStudio 
                currentTitle={currentVideo?.title || ''} 
                notes={currentVideo?.notes || ''} 
                onNotesChange={t => { 
                   setCurrentVideo(p => p ? {...p, notes: t} : null); 
                   setHistory(old => old.map(h => h.id === currentVideo?.id ? {...h, notes: t} : h)); 
                }} 
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
