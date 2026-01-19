
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HistoryPanel } from './components/HistoryPanel';
import { AIStudio } from './components/AIStudio';
import { CustomControls } from './components/CustomControls';
import { VideoHistoryItem, SidebarView } from './types';
import { evaluateIntent, transcribeAudio } from './services/geminiService';
import { 
  Timer, Maximize, Monitor, Loader2, BrainCircuit, Zap, CheckCircle2, RotateCcw, FastForward, MoreVertical, Clock, Mic
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'yt_workspace_history';
const WATCH_LATER_KEY = 'yt_workspace_watch_later';

// Logos from user requirements
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
  const [sidebarView, setSidebarView] = useState<SidebarView>(SidebarView.HISTORY);
  const [error, setError] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isGateOpen, setIsGateOpen] = useState(false);
  const [videoFinished, setVideoFinished] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [isRecordingIntent, setIsRecordingIntent] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [focusTime, setFocusTime] = useState(0);
  const [isFocusing, setIsFocusing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Custom Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(false);
  const controlsTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const savedH = localStorage.getItem(LOCAL_STORAGE_KEY);
    const savedW = localStorage.getItem(WATCH_LATER_KEY);
    if (savedH) setHistory(JSON.parse(savedH));
    if (savedW) setWatchLater(JSON.parse(savedW));
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(history));
    localStorage.setItem(WATCH_LATER_KEY, JSON.stringify(watchLater));
  }, [history, watchLater]);

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

  const onPlayerReady = useCallback((event: any) => {
    const vd = event.target.getVideoData();
    const dur = event.target.getDuration();
    setDuration(dur);
    
    if (vd.title && currentVideo) {
      const updated = { 
        ...currentVideo, 
        title: vd.title, 
        author: vd.author, 
        duration: dur, 
        thumbnailUrl: fetchThumbnail(vd.video_id) 
      };
      setCurrentVideo(updated);
      setHistory(old => [updated, ...old.filter(i => i.id !== updated.id)]);
    }
    setIsMuted(event.target.isMuted());
  }, [currentVideo]);

  const onPlayerStateChange = useCallback((e: any) => {
    const YT = (window as any).YT;
    if (e.data === YT.PlayerState.ENDED) {
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
          playerVars: { autoplay: 1, controls: 0, modestbranding: 1, rel: 0, showinfo: 0, iv_load_policy: 3, disablekb: 1, fs: 0 },
          events: { onReady: onPlayerReady, onStateChange: onPlayerStateChange }
        });
      }
    }, 100);
  }, [onPlayerReady, onPlayerStateChange]);

  const startSession = (id: string, category: string, initialIntent: string = "") => {
    const existing = history.find(h => extractYoutubeId(h.url) === id);
    const newItem: VideoHistoryItem = existing || {
      id: crypto.randomUUID(),
      url: `https://www.youtube.com/watch?v=${id}`,
      title: 'Syncing metadata...',
      thumbnailUrl: fetchThumbnail(id),
      lastPlayed: Date.now(),
      progress: 0,
      duration: 0,
      completed: false,
      notes: initialIntent ? `Intent: ${initialIntent}\n\n` : '',
      category
    };
    setCurrentVideo(newItem);
    setIsGateOpen(true);
    setVideoFinished(false);
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
            setIntentInput(prev => (prev ? prev + " " : "") + trans);
          };
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecordingIntent(true);
      } catch (err) {
        console.error("Mic error", err);
      }
    }
  };

  const handleSaveWatchLater = () => {
    const id = extractYoutubeId(urlInput);
    if (!id) return;
    if (!watchLater.some(i => extractYoutubeId(i.url) === id)) {
      setWatchLater(prev => [{
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
      }, ...prev]);
    }
    setShowHeaderMenu(false);
  };

  const activeVideoId = extractYoutubeId(urlInput);

  return (
    <div ref={containerRef} className="h-screen w-screen bg-[#0f0f0f] text-[#f1f1f1] flex overflow-hidden font-sans yt-gradient">
      {!isCinemaMode && (
        <aside className="w-80 flex flex-col p-5 border-r border-white/5 bg-[#0f0f0f] animate-in slide-in-from-left duration-300 h-full">
          <div className="mb-8 flex items-center gap-3 px-2">
            <div className="w-10 h-10 shrink-0">
              <img src={TOP_LOGO} className="w-full h-full object-contain" alt="Workspace Logo" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold tracking-tight text-xl leading-none text-white">YouTube</h1>
              <span className="text-[10px] text-primary uppercase tracking-widest font-bold block mt-1">Workspace</span>
            </div>
          </div>
          
          <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
                <Timer size={14} className="text-primary" /> Session Focus
              </span>
              <span className="text-xs font-mono text-primary">{Math.floor(focusTime / 60)}:{String(focusTime % 60).padStart(2, '0')}</span>
            </div>
            <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-1000 shadow-[0_0_10px_rgba(225,0,255,0.4)]" 
                style={{ width: `${Math.min((focusTime / 3600) * 100, 100)}%` }}
              />
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <HistoryPanel 
              history={history} watchLater={watchLater} currentView={sidebarView} onViewChange={setSidebarView}
              onSelect={i => { setUrlInput(i.url); setIsGateOpen(true); setCurrentVideo(i); setVideoFinished(false); setTimeout(() => loadPlayer(extractYoutubeId(i.url)!), 200); }}
              onDelete={(id, wl) => wl ? setWatchLater(p => p.filter(i=>i.id!==id)) : setHistory(p => p.filter(i=>i.id!==id))}
              onRename={(id, t, wl) => wl ? setWatchLater(p => p.map(h=>h.id===id?{...h,title:t}:h)) : setHistory(p => p.map(h=>h.id===id?{...h,title:t}:h))}
              onExport={() => { const b = new Blob([JSON.stringify({history,watchLater})],{type:'application/json'}); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href=u; a.download='workspace.json'; a.click(); }}
              onImport={e => { const f = e.target.files?.[0]; if(f){const r=new FileReader(); r.onload=re=>{try{const i=JSON.parse(re.target?.result as string); if(i.history) setHistory(i.history); if(i.watchLater) setWatchLater(i.watchLater);}catch(err){}};r.readAsText(f);}}}
            />
          </div>
        </aside>
      )}

      <div className="flex-1 flex flex-col relative min-w-0">
        <header className={`z-20 w-full p-4 flex justify-center border-b border-white/5 bg-[#0f0f0f]/80 transition-all duration-300 ${isCinemaMode ? 'opacity-0 hover:opacity-100' : ''}`}>
          <form onSubmit={e => { e.preventDefault(); const id = extractYoutubeId(urlInput); if(id) { setError(null); setIsGateOpen(false); setVideoFinished(false); } else setError("Invalid link."); }} className="relative w-full max-w-3xl flex items-center gap-4">
            <div className="relative flex-1">
              <input type="text" value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="Paste link..." className="w-full bg-[#121212] border border-white/10 text-white pl-5 pr-24 py-3 rounded-full text-sm shadow-inner focus:border-primary/50 outline-none" />
              <button type="submit" className="absolute right-1.5 top-1.5 bottom-1.5 px-5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-full flex items-center gap-2 group transition-all"><span className="text-xs font-bold uppercase tracking-widest">Focus</span><Zap size={14} className="text-primary group-hover:scale-125 transition-transform" /></button>
            </div>
            {extractYoutubeId(urlInput) && (
              <div className="relative">
                <button type="button" onClick={() => setShowHeaderMenu(!showHeaderMenu)} className="p-3 bg-white/5 text-zinc-400 hover:bg-white/10 rounded-full transition-all"><MoreVertical size={18} /></button>
                {showHeaderMenu && <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-white/10 rounded-lg shadow-2xl py-1 z-50 overflow-hidden"><button type="button" onClick={handleSaveWatchLater} className="w-full text-left px-4 py-3 text-xs font-bold uppercase text-zinc-300 hover:bg-white/5 flex items-center gap-2"><Clock size={14} className="text-primary" /> Save for later</button></div>}
              </div>
            )}
          </form>
        </header>

        <main className={`flex-1 flex p-6 gap-6 min-h-0 overflow-hidden transition-all duration-300 ${isCinemaMode ? 'p-0 gap-0' : ''}`}>
          <div className="flex-1 relative bg-black rounded-2xl overflow-hidden border border-white/5 shadow-2xl transition-all duration-500">
            {extractYoutubeId(urlInput) && !isGateOpen && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0f0f0f] p-8">
                <div className="max-w-md w-full text-center space-y-6 animate-fade-in">
                  <div className="w-32 h-32 mx-auto mb-4 p-4 bg-primary/5 rounded-full flex items-center justify-center overflow-hidden">
                    <img src={PROTOCOL_ICON} className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(225,0,255,0.7)]" alt="Protocol" />
                  </div>
                  <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Intentional Protocol</h2>
                  <div className="relative">
                    <textarea value={intentInput} onChange={e => setIntentInput(e.target.value)} placeholder="Why are you watching this? Stating purpose is required..." className="w-full bg-[#181818] border border-white/10 rounded-xl p-5 text-sm text-white focus:border-primary outline-none min-h-[120px] resize-none transition-all shadow-xl" />
                    <button onClick={handleMicIntent} className={`absolute bottom-4 right-4 p-2.5 rounded-full shadow-lg ${isRecordingIntent ? 'bg-red-500 animate-pulse text-white scale-110' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'} transition-all`} title="Voice Input">
                      <Mic size={18} />
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={handleSkip} className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-full font-bold text-sm uppercase">Skip</button>
                    <button onClick={handleIntentSubmit} disabled={isEvaluating} className="flex-[2] py-4 bg-white hover:bg-zinc-200 text-black rounded-full font-bold text-sm uppercase flex items-center justify-center gap-2 transition-all">{isEvaluating ? <Loader2 className="animate-spin" /> : <BrainCircuit size={18} />} Start Intentional Session</button>
                  </div>
                </div>
              </div>
            )}
            
            <div className={`absolute inset-0 overflow-hidden ${activeVideoId && isGateOpen && !videoFinished ? 'block' : 'hidden'}`}>
              <div ref={playerContainerRef} className="w-full h-full scale-[1.2] origin-center pointer-events-none" />
            </div>

            {activeVideoId && isGateOpen && !videoFinished && (
              <CustomControls 
                playing={isPlaying} played={played} duration={duration} muted={isMuted} onPlayPause={() => isPlaying ? playerInstance.pauseVideo() : playerInstance.playVideo()}
                onSeek={e => { const v = parseFloat(e.target.value); setPlayed(v); playerInstance.seekTo(v*duration, true); }}
                onMute={() => { if(isMuted) { playerInstance.unMute(); setIsMuted(false); } else { playerInstance.mute(); setIsMuted(true); } }}
                onRewind={() => playerInstance.seekTo(Math.max(0, playerInstance.getCurrentTime()-10))}
                onFastForward={() => playerInstance.seekTo(Math.min(duration, playerInstance.getCurrentTime()+10))}
                onToggleFullscreen={() => containerRef.current?.requestFullscreen()}
                visible={controlsVisible || !isPlaying}
              />
            )}

            {videoFinished && (
              <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-[#0f0f0f]/95 backdrop-blur-xl p-12 text-center animate-fade-in">
                <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={60} className="text-emerald-500" />
                </div>
                <h2 className="text-4xl font-black mb-3 text-white">Session Refined</h2>
                <p className="text-zinc-400 max-w-sm mb-8 mx-auto">Distractions filtered. You stayed intentional throughout.</p>
                <div className="flex gap-4">
                  <button onClick={() => { setVideoFinished(false); playerInstance.seekTo(0); playerInstance.playVideo(); }} className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-full font-bold border border-white/5 transition-all"><RotateCcw size={20} className="inline mr-2" /> Replay</button>
                  <button onClick={() => { setIsGateOpen(false); setUrlInput(''); setIsFocusing(false); setVideoFinished(false); playerInstance?.stopVideo(); }} className="px-8 py-3 bg-primary hover:bg-primaryHover text-white rounded-full font-bold shadow-[0_0_20px_rgba(225,0,255,0.4)] transition-all">Exit Workspace</button>
                </div>
              </div>
            )}

            {!activeVideoId && !extractYoutubeId(urlInput) && (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-[#0f0f0f]">
                <div className="w-40 h-40 mb-8 opacity-40 filter saturate-150 drop-shadow-[0_0_20px_rgba(225,0,255,0.5)]">
                  <img src={CENTER_LOGO} className="w-full h-full object-contain" alt="Center Logo" />
                </div>
                <h2 className="text-3xl font-black text-white mb-3">Ready for Focus</h2>
                <p className="text-zinc-500 max-w-sm text-sm">Intentionality is performance. Paste a link to begin.</p>
              </div>
            )}
          </div>
          {!isCinemaMode && <div className="w-[420px] hidden xl:flex flex-col h-full shrink-0"><AIStudio currentTitle={currentVideo?.title || 'Synthesis Mode'} notes={currentVideo?.notes || ''} onNotesChange={t => { setCurrentVideo(p => p ? {...p, notes: t} : null); setHistory(old => old.map(h => h.id === currentVideo?.id ? {...h, notes: t} : h)); }} /></div>}
        </main>
      </div>
    </div>
  );
}

export default App;
