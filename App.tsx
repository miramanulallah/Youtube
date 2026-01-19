
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HistoryPanel } from './components/HistoryPanel';
import { AIStudio } from './components/AIStudio';
import { CustomControls } from './components/CustomControls';
import { VideoHistoryItem, SidebarView, Playlist } from './types';
import { evaluateIntent, transcribeAudio } from './services/geminiService';
import { 
  Timer, Maximize, Monitor, Loader2, BrainCircuit, Zap, CheckCircle2, RotateCcw, FastForward, MoreVertical, Clock, Mic, PlusSquare
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'yt_workspace_history';
const WATCH_LATER_KEY = 'yt_workspace_watch_later';
const PLAYLISTS_KEY = 'yt_workspace_playlists';

const TOP_LOGO = "https://8upload.com/preview/f01c8db6aede6f36/favicon-96x96.png";
const CENTER_LOGO = "https://8upload.com/preview/69403e83898df13d/12086f9a-12fe-4396-81ce-5fc8d7866199.png";
const PROTOCOL_ICON = "https://8upload.com/preview/b4f4f2cc43d0df2b/_CITYPNG.COM_HD_Purple_Neon_Aesthetic_Youtube_YT_Play_Icon_PNG_-_2000x2000.png";

const extractYoutubeId = (url: string): string | null => {
  if (!url) return null;
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

const fetchThumbnail = (id: string) => `https://img.youtube.com/vi/${id}/mqdefault.jpg`;

let playerInstance: any = null;

function App() {
  const [urlInput, setUrlInput] = useState('');
  const [intentInput, setIntentInput] = useState('');
  const [currentVideo, setCurrentVideo] = useState<VideoHistoryItem | null>(null);
  const [history, setHistory] = useState<VideoHistoryItem[]>([]);
  const [watchLater, setWatchLater] = useState<VideoHistoryItem[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [sidebarView, setSidebarView] = useState<SidebarView>(SidebarView.HISTORY);
  const [error, setError] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isGateOpen, setIsGateOpen] = useState(false);
  const [videoFinished, setVideoFinished] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const [isRecordingIntent, setIsRecordingIntent] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [focusTime, setFocusTime] = useState(0);
  const [isFocusing, setIsFocusing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(false);
  const controlsTimeoutRef = useRef<number | null>(null);

  const intentRef = useRef<string>("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === ' ') { e.preventDefault(); togglePlay(); }
      if (e.key.toLowerCase() === 'f') containerRef.current?.requestFullscreen();
      if (e.key.toLowerCase() === 't') setIsCinemaMode(prev => !prev);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying]);

  useEffect(() => {
    const savedH = localStorage.getItem(LOCAL_STORAGE_KEY);
    const savedW = localStorage.getItem(WATCH_LATER_KEY);
    const savedP = localStorage.getItem(PLAYLISTS_KEY);
    if (savedH) try { setHistory(JSON.parse(savedH)); } catch (e) {}
    if (savedW) try { setWatchLater(JSON.parse(savedW)); } catch (e) {}
    if (savedP) try { setPlaylists(JSON.parse(savedP)); } catch (e) {}
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(history));
    localStorage.setItem(WATCH_LATER_KEY, JSON.stringify(watchLater));
    localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
  }, [history, watchLater, playlists]);

  useEffect(() => {
    let interval: any;
    if (isFocusing) interval = setInterval(() => setFocusTime(p => p + 1), 1000);
    return () => clearInterval(interval);
  }, [isFocusing]);

  useEffect(() => {
    let interval: any;
    if (isPlaying && playerInstance?.getCurrentTime) {
      interval = setInterval(() => {
        const c = playerInstance.getCurrentTime();
        const t = playerInstance.getDuration();
        if (t > 0) setPlayed(c / t);
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const togglePlay = () => {
    if (!playerInstance) return;
    if (isPlaying) playerInstance.pauseVideo();
    else playerInstance.playVideo();
  };

  const updateMetadata = useCallback((vd: any, dur: number) => {
    if (!vd || !vd.title) return;
    const vidId = vd.video_id;
    
    const intentPart = intentRef.current ? `[${intentRef.current}] ` : "";
    const finalTitle = intentPart + vd.title;

    setCurrentVideo(prev => {
      const updated = { 
        ...prev!, 
        title: finalTitle, 
        author: vd.author, 
        duration: dur, 
        thumbnailUrl: fetchThumbnail(vidId) 
      } as VideoHistoryItem;
      
      setHistory(old => {
        const exists = old.some(h => extractYoutubeId(h.url) === vidId);
        if (!exists) return [updated, ...old];
        return old.map(h => extractYoutubeId(h.url) === vidId ? { ...h, ...updated } : h);
      });

      setWatchLater(old => old.map(h => extractYoutubeId(h.url) === vidId ? { ...h, title: vd.title, author: vd.author, thumbnailUrl: fetchThumbnail(vidId) } : h));
      
      return updated;
    });
  }, []);

  const onPlayerReady = useCallback((event: any) => {
    const vd = event.target.getVideoData();
    const dur = event.target.getDuration();
    setDuration(dur);
    updateMetadata(vd, dur);
    setIsMuted(event.target.isMuted());
  }, [updateMetadata]);

  const onPlayerStateChange = useCallback((e: any) => {
    const YT = (window as any).YT;
    if (e.data === YT.PlayerState.ENDED) {
      setVideoFinished(true); setIsFocusing(false); setIsPlaying(false);
    } else if (e.data === YT.PlayerState.PLAYING) {
      setVideoFinished(false); setIsFocusing(true); setIsPlaying(true);
      updateMetadata(e.target.getVideoData(), e.target.getDuration());
    } else if (e.data === YT.PlayerState.PAUSED) {
      setIsPlaying(false); setIsFocusing(false);
    }
  }, [updateMetadata]);

  const loadPlayer = useCallback((videoId: string) => {
    if (playerInstance?.loadVideoById) {
      playerInstance.loadVideoById(videoId);
      return;
    }
    const checkYT = setInterval(() => {
      if ((window as any).YT?.Player && playerContainerRef.current) {
        clearInterval(checkYT);
        const div = document.createElement('div');
        div.id = 'yt-player-internal';
        playerContainerRef.current.innerHTML = '';
        playerContainerRef.current.appendChild(div);
        playerInstance = new (window as any).YT.Player('yt-player-internal', {
          height: '100%', width: '100%', videoId,
          playerVars: { 
            autoplay: 1, controls: 0, modestbranding: 1, rel: 0, showinfo: 0, iv_load_policy: 3, disablekb: 1, fs: 0 
          },
          events: { onReady: onPlayerReady, onStateChange: onPlayerStateChange }
        });
      }
    }, 100);
  }, [onPlayerReady, onPlayerStateChange]);

  const startSession = (id: string, category: string, initialIntent: string = "") => {
    intentRef.current = initialIntent ? (initialIntent.length > 20 ? initialIntent.substring(0, 20) + "..." : initialIntent) : "";
    
    const existing = history.find(h => extractYoutubeId(h.url) === id);
    const newItem: VideoHistoryItem = existing || {
      id: crypto.randomUUID(),
      url: `https://www.youtube.com/watch?v=${id}`,
      title: intentRef.current ? `[${intentRef.current}] Session` : 'Focus Session',
      thumbnailUrl: fetchThumbnail(id),
      lastPlayed: Date.now(),
      progress: 0,
      duration: 0,
      completed: false,
      notes: initialIntent ? `Intent: ${initialIntent}\n\n` : '',
      category
    };

    setCurrentVideo(newItem);
    setHistory(old => [newItem, ...old.filter(h => h.id !== newItem.id)]);
    setIsGateOpen(true);
    setVideoFinished(false);
    setControlsVisible(true);
    // Auto-enable cinema mode for better immersion as requested
    setIsCinemaMode(true);
    setTimeout(() => loadPlayer(id), 200);
  };

  const handleIntentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (intentInput.length < 2) { setError("Purpose mandatory."); return; }
    setIsEvaluating(true);
    const result = await evaluateIntent(urlInput, intentInput);
    setIsEvaluating(false);
    startSession(extractYoutubeId(urlInput)!, result.category, intentInput);
  };

  const handleSkip = () => {
    const id = extractYoutubeId(urlInput);
    if (id) startSession(id, "Quick Session");
  };

  const handleMicIntent = async () => {
    if (isRecordingIntent) {
      mediaRecorderRef.current?.stop();
      setIsRecordingIntent(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        audioChunksRef.current = [];
        recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
        recorder.onstop = async () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = async () => {
            const base64 = (reader.result as string).split(',')[1];
            const trans = await transcribeAudio(base64);
            if (trans) setIntentInput(prev => (prev ? prev + " " : "") + trans);
          };
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecordingIntent(true);
      } catch (err) {}
    }
  };

  const handleSaveWatchLater = () => {
    const id = extractYoutubeId(urlInput);
    if (!id) return;
    if (!watchLater.some(i => extractYoutubeId(i.url) === id)) {
      const newItem: VideoHistoryItem = {
        id: crypto.randomUUID(),
        url: `https://www.youtube.com/watch?v=${id}`,
        title: 'Watch Later Video',
        thumbnailUrl: fetchThumbnail(id),
        lastPlayed: Date.now(),
        progress: 0,
        duration: 0,
        completed: false,
        notes: '',
        category: 'Watch Later'
      };
      setWatchLater(prev => [newItem, ...prev]);
    }
    setShowHeaderMenu(false);
  };

  const handleSaveToPlaylist = (playlistId: string) => {
    const vidId = extractYoutubeId(urlInput);
    if (!vidId) return;
    
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId && !p.videoIds.includes(vidId)) {
        return { ...p, videoIds: [...p.videoIds, vidId] };
      }
      return p;
    }));
    
    if (!history.some(h => extractYoutubeId(h.url) === vidId)) {
       const newItem: VideoHistoryItem = {
        id: crypto.randomUUID(),
        url: `https://www.youtube.com/watch?v=${vidId}`,
        title: 'Playlist Video',
        thumbnailUrl: fetchThumbnail(vidId),
        lastPlayed: Date.now(),
        progress: 0,
        duration: 0,
        completed: false,
        notes: '',
        category: 'Playlist'
      };
      setHistory(prev => [newItem, ...prev]);
    }

    setShowPlaylistPicker(false);
    setShowHeaderMenu(false);
  };

  const activeVideoId = extractYoutubeId(urlInput);

  return (
    <div ref={containerRef} className="h-screen w-screen bg-[#0f0f0f] text-[#f1f1f1] flex overflow-hidden font-sans yt-gradient">
      {!isCinemaMode && (
        <aside className="w-80 flex flex-col p-5 border-r border-white/5 bg-[#0f0f0f] h-full relative z-[100] overflow-visible animate-in slide-in-from-left duration-500">
          <div className="mb-8 flex items-center gap-3 px-2">
            <img src={TOP_LOGO} className="w-10 h-10 object-contain" alt="Logo" />
            <div className="min-w-0">
              <h1 className="font-bold text-xl leading-none">YouTube</h1>
              <span className="text-[10px] text-primary uppercase font-bold block mt-1">Workspace</span>
            </div>
          </div>
          
          <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-400 font-medium">Session Focus</span>
              <span className="text-xs font-mono text-primary">{Math.floor(focusTime / 60)}:{String(focusTime % 60).padStart(2, '0')}</span>
            </div>
            <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-1000 shadow-[0_0_10px_rgba(225,0,255,0.4)]" style={{ width: `${Math.min((focusTime / 3600) * 100, 100)}%` }} />
            </div>
          </div>

          <div className="flex-1 overflow-visible">
            <HistoryPanel 
              history={history} watchLater={watchLater} playlists={playlists} currentView={sidebarView} onViewChange={setSidebarView}
              onSelect={i => { setUrlInput(i.url); intentRef.current = ""; setIsGateOpen(true); setCurrentVideo(i); setVideoFinished(false); setIsCinemaMode(true); setTimeout(() => loadPlayer(extractYoutubeId(i.url)!), 200); }}
              onDelete={(id, wl) => wl ? setWatchLater(p => p.filter(i=>i.id!==id)) : setHistory(p => p.filter(i=>i.id!==id))}
              onRename={(id, t, wl) => wl ? setWatchLater(p => p.map(h=>h.id===id?{...h,title:t}:h)) : setHistory(p => p.map(h=>h.id===id?{...h,title:t}:h))}
              onCreatePlaylist={(name) => {
                const newPlaylist: Playlist = { id: crypto.randomUUID(), name, videoIds: [] };
                setPlaylists(prev => [...prev, newPlaylist]);
              }}
              onDeletePlaylist={(id) => setPlaylists(prev => prev.filter(p => p.id !== id))}
              onExport={() => { const b = new Blob([JSON.stringify({history,watchLater,playlists})],{type:'application/json'}); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href=u; a.download='workspace.json'; a.click(); }}
              onImport={e => { const f = e.target.files?.[0]; if(f){const r=new FileReader(); r.onload=re=>{try{const i=JSON.parse(re.target?.result as string); if(i.history) setHistory(i.history); if(i.watchLater) setWatchLater(i.watchLater); if(i.playlists) setPlaylists(i.playlists);}catch(err){}};r.readAsText(f);}}}
            />
          </div>
        </aside>
      )}

      <div className="flex-1 flex flex-col relative min-w-0 overflow-hidden">
        {/* Refined Header - Completely slides out when hidden to prevent "disturbing text" or slivers */}
        <header 
          onMouseEnter={() => setControlsVisible(true)}
          className={`z-50 w-full p-4 flex justify-center border-b border-white/5 bg-[#0f0f0f]/95 backdrop-blur-2xl transition-all duration-500 fixed top-0 left-0 right-0 
            ${(isCinemaMode || isGateOpen) && !controlsVisible ? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100 pointer-events-auto'}`}
        >
          <form onSubmit={e => { e.preventDefault(); const id = extractYoutubeId(urlInput); if(id) { setIsGateOpen(false); setVideoFinished(false); } }} className="w-full max-w-3xl flex items-center gap-4 relative">
            <div className="relative flex-1">
              <input type="text" value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="Paste YouTube link..." className="w-full bg-[#121212] border border-white/10 text-white px-5 py-3 rounded-full text-sm outline-none focus:border-primary transition-all" />
              <button type="submit" className="absolute right-1.5 top-1.5 bottom-1.5 px-5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-full flex items-center gap-2 font-bold uppercase tracking-widest text-[10px] transition-all">Focus <Zap size={14} className="text-primary" /></button>
            </div>
            {activeVideoId && (
              <div className="relative">
                <button type="button" onClick={() => setShowHeaderMenu(!showHeaderMenu)} className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all"><MoreVertical size={18} /></button>
                {showHeaderMenu && (
                  <div className="absolute right-0 top-12 w-48 bg-[#181818] border border-white/10 rounded-lg shadow-2xl py-1 z-50 ring-1 ring-white/10 animate-fade-in">
                    <button type="button" onClick={handleSaveWatchLater} className="w-full text-left px-4 py-3 text-xs font-bold uppercase text-zinc-300 hover:bg-white/5 flex items-center gap-2 transition-colors">
                      <Clock size={14} /> Save for later
                    </button>
                    <button type="button" onClick={() => setShowPlaylistPicker(!showPlaylistPicker)} className="w-full text-left px-4 py-3 text-xs font-bold uppercase text-zinc-300 hover:bg-white/5 flex items-center gap-2 border-t border-white/5 transition-colors">
                      <PlusSquare size={14} className="text-primary" /> Save in Custom
                    </button>
                  </div>
                )}
                {showPlaylistPicker && (
                  <div className="absolute right-52 top-12 w-56 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] py-2 z-[60] ring-1 ring-white/20 animate-fade-in">
                    <div className="px-4 py-2 border-b border-white/5 mb-1 flex justify-between items-center">
                      <span className="text-[10px] font-black text-primary uppercase tracking-widest">Your Playlists</span>
                      <X size={12} className="cursor-pointer text-zinc-500" onClick={() => setShowPlaylistPicker(false)} />
                    </div>
                    {playlists.length === 0 ? (
                      <p className="px-4 py-3 text-[10px] text-zinc-500 italic">No playlists found.</p>
                    ) : (
                      <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {playlists.map(p => (
                          <button key={p.id} onClick={() => handleSaveToPlaylist(p.id)} className="w-full text-left px-4 py-3 text-xs font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition-all flex items-center justify-between group">
                            {p.name}
                            <PlusSquare size={14} className="opacity-0 group-hover:opacity-100 text-primary transition-all" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </form>
        </header>

        <main 
          onMouseMove={() => { 
            setControlsVisible(true); 
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            if (isPlaying) controlsTimeoutRef.current = setTimeout(() => setControlsVisible(false), 3000) as any;
          }}
          className={`flex-1 flex p-6 gap-6 min-h-0 pt-20 transition-all duration-500 ${isCinemaMode ? 'p-0 gap-0 pt-0' : ''}`}
        >
          <div className="flex-1 relative bg-black rounded-2xl overflow-hidden border border-white/5 transition-all shadow-inner">
            {activeVideoId && !isGateOpen && (
              <div className="absolute inset-0 z-[60] flex items-center justify-center bg-[#0f0f0f] p-8 animate-fade-in">
                <div className="max-w-md w-full text-center space-y-6">
                  <img src={PROTOCOL_ICON} className="w-32 h-32 mx-auto filter drop-shadow-[0_0_20px_rgba(225,0,255,0.8)]" alt="Protocol" />
                  <h2 className="text-2xl font-bold uppercase tracking-tight">Intentional Protocol</h2>
                  <div className="relative">
                    <textarea value={intentInput} onChange={e => setIntentInput(e.target.value)} placeholder="Why are you watching this?..." className="w-full bg-[#181818] border border-white/10 rounded-xl p-5 text-sm text-white focus:border-primary outline-none min-h-[120px] resize-none transition-all" />
                    <button onClick={handleMicIntent} className={`absolute bottom-4 right-4 p-2.5 rounded-full transition-all ${isRecordingIntent ? 'bg-red-500 animate-pulse text-white' : 'bg-zinc-800 text-zinc-400'}`}><Mic size={18} /></button>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={handleSkip} className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full font-bold uppercase text-sm transition-all">Skip</button>
                    <button onClick={handleIntentSubmit} disabled={isEvaluating} className="flex-[2] py-4 bg-white hover:bg-zinc-200 text-black rounded-full font-bold uppercase text-sm flex items-center justify-center gap-2 transition-all">{isEvaluating ? <Loader2 className="animate-spin" /> : <BrainCircuit size={18} />} Start Session</button>
                  </div>
                </div>
              </div>
            )}
            
            <div className={`absolute inset-0 transition-opacity duration-700 ${activeVideoId && isGateOpen && !videoFinished ? 'opacity-100 block' : 'opacity-0 hidden'}`}>
              <div ref={playerContainerRef} className="w-full h-full scale-[1.2] origin-center pointer-events-none" />
            </div>

            {activeVideoId && isGateOpen && !videoFinished && (
              <CustomControls 
                playing={isPlaying} played={played} duration={duration} muted={isMuted} onPlayPause={togglePlay}
                onSeek={e => { const v = parseFloat(e.target.value); setPlayed(v); playerInstance?.seekTo(v * duration, true); }}
                onMute={() => { if (isMuted) { playerInstance?.unMute(); setIsMuted(false); } else { playerInstance?.mute(); setIsMuted(true); } }}
                onRewind={() => playerInstance?.seekTo(Math.max(0, playerInstance.getCurrentTime() - 10))}
                onFastForward={() => playerInstance?.seekTo(Math.min(duration, playerInstance.getCurrentTime() + 10))}
                onToggleFullscreen={() => containerRef.current?.requestFullscreen()}
                visible={controlsVisible || !isPlaying}
              />
            )}

            {videoFinished && (
              <div className="absolute inset-0 z-[70] flex flex-col items-center justify-center bg-[#0f0f0f]/95 backdrop-blur-xl p-12 text-center animate-fade-in">
                <CheckCircle2 size={60} className="text-emerald-500 mb-6" />
                <h2 className="text-4xl font-black mb-3">Session Refined</h2>
                <div className="flex gap-4">
                  <button onClick={() => { setVideoFinished(false); playerInstance?.seekTo(0); playerInstance?.playVideo(); }} className="px-8 py-3 bg-white/5 text-white rounded-full font-bold border border-white/5 transition-all"><RotateCcw size={20} className="inline mr-2" /> Replay</button>
                  <button onClick={() => { setIsGateOpen(false); setUrlInput(''); setIsFocusing(false); playerInstance?.stopVideo(); setIsCinemaMode(false); }} className="px-8 py-3 bg-primary text-white rounded-full font-bold shadow-lg transition-all">Exit Workspace</button>
                </div>
              </div>
            )}

            {!activeVideoId && (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-[#0f0f0f] animate-fade-in">
                <img src={CENTER_LOGO} className="w-48 h-48 mb-8 opacity-40 filter saturate-150 drop-shadow-[0_0_20px_rgba(225,0,255,0.5)]" alt="Center Logo" />
                <h2 className="text-3xl font-black mb-3">Ready for Focus</h2>
                <p className="text-zinc-500 text-sm">Intentionality is performance. Paste a link to begin.</p>
              </div>
            )}
          </div>
          {!isCinemaMode && <div className="w-[420px] hidden xl:flex flex-col h-full shrink-0 relative z-30 animate-in slide-in-from-right duration-500"><AIStudio currentTitle={currentVideo?.title || 'Synthesis Mode'} notes={currentVideo?.notes || ''} onNotesChange={t => { setCurrentVideo(p => p ? {...p, notes: t} : null); setHistory(old => old.map(h => h.id === currentVideo?.id ? {...h, notes: t} : h)); }} /></div>}
        </main>
      </div>
    </div>
  );
}

// Minimal X icon replacement
const X = ({ size, className, onClick }: { size: number, className?: string, onClick?: () => void }) => (
  <svg onClick={onClick} className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);

export default App;
