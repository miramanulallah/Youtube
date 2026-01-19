
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HistoryPanel } from './components/HistoryPanel';
import { AIStudio } from './components/AIStudio';
import { CustomControls } from './components/CustomControls';
import { VideoHistoryItem, SidebarView, Playlist } from './types';
import { evaluateIntent, transcribeAudio } from './services/geminiService';
import { 
  Loader2, BrainCircuit, Zap, CheckCircle2, RotateCcw, MoreVertical, Clock, Mic, PlusSquare, X, MonitorPlay
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'yt_workspace_history';
const WATCH_LATER_KEY = 'yt_workspace_watch_later';
const PLAYLISTS_KEY = 'yt_workspace_playlists';

// Favicon fallback
const FALLBACK_FAVICON = "https://8upload.com/preview/f01c8db6aede6f36/favicon-96x96.png";
const FALLBACK_CENTER_LOGO = "https://8upload.com/preview/69403e83898df13d/12086f9a-12fe-4396-81ce-5fc8d7866199.png";
const PROTOCOL_ICON = "https://8upload.com/preview/b4f4f2cc43d0df2b/_CITYPNG.COM_HD_Purple_Neon_Aesthetic_Youtube_YT_Play_Icon_PNG_-_2000x2000.png";

const extractYoutubeId = (url: string): string | null => {
  if (!url) return null;
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

const fetchThumbnail = (id: string) => `https://img.youtube.com/vi/${id}/mqdefault.jpg`;

let playerInstance: any = null;

// Reusable Logo Component with Fallback logic
const WorkspaceLogo = ({ src, fallback, className }: { src: string, fallback: string, className?: string }) => {
  const [currentSrc, setCurrentSrc] = useState(src);
  return (
    <img 
      src={currentSrc} 
      className={className} 
      alt="Logo" 
      onError={() => { if (currentSrc !== fallback) setCurrentSrc(fallback); }}
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
  const [sidebarView, setSidebarView] = useState<SidebarView>(SidebarView.HISTORY);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGateOpen, setIsGateOpen] = useState(false);
  const [videoFinished, setVideoFinished] = useState(false);
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === ' ') { e.preventDefault(); togglePlay(); }
      if (e.key.toLowerCase() === 'f') containerRef.current?.requestFullscreen();
      if (e.key.toLowerCase() === 't') setIsCinemaMode(prev => !prev);
      if (e.key === 'Escape' && isCinemaMode) setIsCinemaMode(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isCinemaMode]);

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
        if (t > 0) {
          setPlayed(c / t);
          setDuration(t);
        }
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
    if (!vd || !vd.title || vd.title === 'YouTube Video' || vd.title === 'Loading Title...') return;
    const vidId = vd.video_id;
    const youtubeTitle = vd.title;

    setCurrentVideo(prev => {
      if (!prev) return null;
      const updated = { 
        ...prev, 
        title: youtubeTitle, 
        author: vd.author, 
        duration: dur, 
        thumbnailUrl: fetchThumbnail(vidId) 
      } as VideoHistoryItem;
      
      setHistory(old => {
        const exists = old.some(h => extractYoutubeId(h.url) === vidId);
        if (!exists) return [updated, ...old];
        return old.map(h => extractYoutubeId(h.url) === vidId ? { ...h, ...updated } : h);
      });
      return updated;
    });
  }, []);

  const onPlayerReady = useCallback((event: any) => {
    setDuration(event.target.getDuration());
    setIsMuted(event.target.isMuted());
    updateMetadata(event.target.getVideoData(), event.target.getDuration());
  }, [updateMetadata]);

  const onPlayerStateChange = useCallback((e: any) => {
    const YT = (window as any).YT;
    if (e.data === YT.PlayerState.ENDED) {
      const currentTime = e.target.getCurrentTime();
      const totalDuration = e.target.getDuration();
      if (Math.abs(totalDuration - currentTime) < 2) {
        setVideoFinished(true); 
        setIsFocusing(false); 
        setIsPlaying(false);
        playerInstance?.stopVideo();
      }
    } else if (e.data === YT.PlayerState.PLAYING) {
      setVideoFinished(false); 
      setIsFocusing(true); 
      setIsPlaying(true);
      updateMetadata(e.target.getVideoData(), e.target.getDuration());
    } else if (e.data === YT.PlayerState.PAUSED) {
      setIsPlaying(false); 
      setIsFocusing(false);
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
    const newItem: VideoHistoryItem = {
      id: crypto.randomUUID(),
      url: `https://www.youtube.com/watch?v=${id}`,
      title: 'Loading Title...', 
      thumbnailUrl: fetchThumbnail(id),
      lastPlayed: Date.now(),
      progress: 0,
      duration: 0,
      completed: false,
      notes: initialIntent ? `Objective: ${initialIntent}\n\n` : '',
      category
    };
    setCurrentVideo(newItem);
    setHistory(old => [newItem, ...old]);
    setIsGateOpen(true);
    setVideoFinished(false);
    setIsCinemaMode(true);
    setControlsVisible(false);
    setTimeout(() => loadPlayer(id), 200);
  };

  const handleIntentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const intent = intentInput.trim();
    if (intent.length < 2) return;
    setIsEvaluating(true);
    const result = await evaluateIntent(urlInput, intent);
    setIsEvaluating(false);
    startSession(extractYoutubeId(urlInput)!, result.category, intent);
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
          setIsTranscribing(true);
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];
            const transcription = await transcribeAudio(base64Audio);
            if (transcription) setIntentInput(prev => prev + (prev ? " " : "") + transcription);
            setIsTranscribing(false);
          };
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecordingIntent(true);
      } catch (err) {
        console.error("Mic access denied", err);
      }
    }
  };

  const handleSaveWatchLater = () => {
    const id = extractYoutubeId(urlInput) || (currentVideo ? extractYoutubeId(currentVideo.url) : null);
    if (!id) return;
    if (!watchLater.some(i => extractYoutubeId(i.url) === id)) {
      setWatchLater(prev => [{
        id: crypto.randomUUID(),
        url: `https://www.youtube.com/watch?v=${id}`,
        title: currentVideo?.title || 'Saved Video',
        thumbnailUrl: fetchThumbnail(id),
        lastPlayed: Date.now(),
        progress: 0,
        duration: 0,
        completed: false,
        notes: '',
        category: 'Watch Later'
      }, ...prev]);
    }
    setShowPlaylistPicker(false);
  };

  const handleSaveToPlaylist = (playlistId: string) => {
    const vidId = extractYoutubeId(urlInput) || (currentVideo ? extractYoutubeId(currentVideo.url) : null);
    if (!vidId) return;
    setPlaylists(prev => prev.map(p => (p.id === playlistId && !p.videoIds.includes(vidId)) ? { ...p, videoIds: [...p.videoIds, vidId] } : p));
    setShowPlaylistPicker(false);
  };

  const activeVideoId = extractYoutubeId(urlInput);
  const isProtocolActive = activeVideoId && !isGateOpen;
  const showHeader = !isProtocolActive && !isCinemaMode && !isGateOpen;

  return (
    <div ref={containerRef} className="h-screen w-screen bg-black text-[#f1f1f1] flex overflow-hidden font-sans select-none">
      {!isCinemaMode && (
        <aside className="w-80 flex flex-col p-5 border-r border-white/5 bg-[#0f0f0f] h-full shrink-0 animate-in slide-in-from-left duration-300 overflow-hidden">
          {/* Sidebar Branding Fix */}
          <div className="mb-8 flex items-center gap-4 px-2 shrink-0">
            <WorkspaceLogo src="/favicon-96x96.png" fallback={FALLBACK_FAVICON} className="w-10 h-10 object-contain rounded-lg" />
            <div className="flex flex-col">
              <h1 className="text-white font-bold text-2xl tracking-tight leading-tight">YouTube</h1>
              <span className="text-primary font-black text-[10px] tracking-[0.25em] -mt-1 uppercase">WORKSPACE</span>
            </div>
          </div>
          
          <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/5 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Session Focus</span>
              <span className="text-xs font-mono text-primary">{Math.floor(focusTime / 60)}:{String(focusTime % 60).padStart(2, '0')}</span>
            </div>
            <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-1000 shadow-[0_0_10px_rgba(225,0,255,0.4)]" style={{ width: `${Math.min((focusTime / 3600) * 100, 100)}%` }} />
            </div>
          </div>

          <div className="flex-1 min-h-0 relative">
            <div className="absolute inset-0">
              <HistoryPanel 
                history={history} watchLater={watchLater} playlists={playlists} currentView={sidebarView} onViewChange={setSidebarView}
                onSelect={i => { setUrlInput(i.url); setIsGateOpen(true); setCurrentVideo(i); setVideoFinished(false); setIsCinemaMode(true); setTimeout(() => loadPlayer(extractYoutubeId(i.url)!), 200); }}
                onDelete={(id, wl) => wl ? setWatchLater(p => p.filter(i=>i.id!==id)) : setHistory(p => p.filter(i=>i.id!==id))}
                onRename={(id, t, wl) => wl ? setWatchLater(p => p.map(h=>h.id===id?{...h,title:t}:h)) : setHistory(p => p.map(h=>h.id===id?{...h,title:t}:h))}
                onCreatePlaylist={(name) => setPlaylists(prev => [...prev, { id: crypto.randomUUID(), name, videoIds: [] }])}
                onDeletePlaylist={(id) => setPlaylists(prev => prev.filter(p => p.id !== id))}
                onExport={() => { const b = new Blob([JSON.stringify({history,watchLater,playlists})],{type:'application/json'}); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href=u; a.download='workspace.json'; a.click(); }}
                onImport={e => { const f = e.target.files?.[0]; if(f){const r=new FileReader(); r.onload=re=>{try{const i=JSON.parse(re.target?.result as string); if(i.history) setHistory(i.history); if(i.watchLater) setWatchLater(i.watchLater); if(i.playlists) setPlaylists(i.playlists);}catch(err){}};r.readAsText(f);}}}
              />
            </div>
          </div>
        </aside>
      )}

      <div className="flex-1 flex flex-col relative min-w-0 bg-black overflow-hidden h-full">
        {showHeader && (
          <header className="z-50 w-full p-4 flex justify-between items-center bg-[#0f0f0f]/95 backdrop-blur-2xl transition-all duration-500 fixed top-0 left-0 right-0 border-b border-white/5 shrink-0">
            {/* Header Branding Left */}
            <div className="flex items-center gap-3 ml-2">
              <WorkspaceLogo src="/favicon-96x96.png" fallback={FALLBACK_FAVICON} className="w-8 h-8 object-contain rounded-md" />
              <div className="hidden sm:flex flex-col">
                <span className="text-[11px] font-bold text-white uppercase tracking-tight leading-none">YouTube</span>
                <span className="text-[8px] font-black text-primary uppercase tracking-[0.2em]">WORKSPACE</span>
              </div>
            </div>

            <div className="flex-1 max-w-3xl flex items-center gap-3 px-4">
              <div className="relative flex-1">
                <input type="text" value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="Enter video link to start intentional session..." className="w-full bg-[#121212] border border-white/10 text-white px-5 py-2.5 rounded-full text-sm outline-none focus:border-primary transition-all" />
                <button onClick={() => { const id = extractYoutubeId(urlInput); if(id) { setIsGateOpen(false); setVideoFinished(false); } }} className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-full flex items-center gap-2 font-bold uppercase tracking-widest text-[10px]">Analyze <Zap size={14} className="text-primary" /></button>
              </div>
            </div>

            {/* Header Branding Right (Optional, can be user profile or another logo) */}
            <div className="flex items-center gap-3 mr-2">
               <WorkspaceLogo src="/favicon-96x96.png" fallback={FALLBACK_FAVICON} className="w-8 h-8 object-contain rounded-md opacity-50" />
            </div>
          </header>
        )}

        {showPlaylistPicker && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-md">
            <div className="w-80 bg-[#121212] border border-white/10 rounded-2xl shadow-2xl p-4 animate-fade-in relative">
              <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-primary">Target List</h3>
                <button onClick={() => setShowPlaylistPicker(false)} className="text-zinc-500 hover:text-white transition-colors"><X size={16} /></button>
              </div>
              <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1">
                <button onClick={handleSaveWatchLater} className="w-full text-left px-3 py-3 text-xs text-zinc-300 hover:bg-white/10 rounded-lg transition-all flex items-center gap-2 mb-2 font-bold uppercase tracking-wider"><Clock size={14} className="text-primary" /> Watch Later</button>
                {playlists.length === 0 ? <p className="text-[10px] text-zinc-600 text-center py-4">No custom lists found.</p> : playlists.map(p => (
                  <button key={p.id} onClick={() => handleSaveToPlaylist(p.id)} className="w-full text-left px-3 py-2.5 text-xs text-zinc-400 hover:bg-white/5 rounded-lg transition-all">{p.name}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        <main 
          onMouseMove={() => { 
            setControlsVisible(true); 
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            if (isPlaying) controlsTimeoutRef.current = setTimeout(() => setControlsVisible(false), 3000) as any;
          }}
          className="flex-1 flex gap-0 transition-all duration-500 pt-0 min-h-0 overflow-hidden"
        >
          <div className="flex-1 relative bg-black overflow-hidden flex items-center justify-center h-full">
            {isProtocolActive && (
              <div className="absolute inset-0 z-[150] flex items-center justify-center bg-[#0f0f0f] p-8 animate-fade-in">
                <div className="max-w-md w-full text-center space-y-6 relative">
                  {isTranscribing && (
                    <div className="absolute -top-16 left-0 right-0 flex justify-center animate-bounce">
                      <div className="bg-primary px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest text-white shadow-2xl flex items-center gap-2">
                        <Loader2 size={12} className="animate-spin" /> Transcribing Goal...
                      </div>
                    </div>
                  )}
                  <div className="relative inline-block">
                    <WorkspaceLogo src={PROTOCOL_ICON} fallback={PROTOCOL_ICON} className={`w-32 h-32 mx-auto transition-all duration-500 ${isRecordingIntent ? 'scale-110 drop-shadow-[0_0_40px_rgba(225,0,255,0.8)]' : 'drop-shadow-[0_0_20px_rgba(225,0,255,0.6)]'}`} />
                    {isRecordingIntent && <div className="absolute inset-0 border-4 border-primary rounded-full animate-ping opacity-20" />}
                  </div>
                  <h2 className="text-2xl font-black uppercase tracking-tight text-white">Intentional Protocol</h2>
                  <div className="relative group">
                    <textarea 
                      value={intentInput} 
                      onChange={e => setIntentInput(e.target.value)} 
                      placeholder="Why are you watching this? State your learning objective..." 
                      className="w-full bg-[#181818] border border-white/10 rounded-2xl p-6 text-sm text-white focus:border-primary outline-none min-h-[140px] resize-none transition-all shadow-inner" 
                    />
                    <button 
                      onClick={handleMicIntent} 
                      className={`absolute bottom-4 right-4 p-3 rounded-full transition-all ${isRecordingIntent ? 'bg-red-500 text-white animate-pulse shadow-lg' : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'}`}
                    >
                      <Mic size={20} />
                    </button>
                    {isRecordingIntent && (
                       <div className="absolute bottom-4 left-6 flex items-end gap-1 pointer-events-none">
                         {[1,2,3,4,5].map(i => (
                           <div key={i} className="w-1 bg-red-400 animate-pulse" style={{ height: `${Math.random() * 20 + 8}px`, animationDelay: `${i * 0.1}s` }} />
                         ))}
                       </div>
                    )}
                  </div>
                  <div className="flex gap-4">
                    <button type="button" onClick={() => { const id = extractYoutubeId(urlInput); if(id) startSession(id, "Direct Session"); }} className="flex-1 py-4 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full font-bold uppercase text-[11px] tracking-widest transition-all active:scale-95 border border-white/5">Skip Analysis</button>
                    <button 
                      onClick={handleIntentSubmit} 
                      disabled={isEvaluating || !intentInput.trim()} 
                      className="flex-[2] py-4 bg-white hover:bg-zinc-200 text-black rounded-full font-bold uppercase text-[11px] tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.1)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isEvaluating ? <Loader2 className="animate-spin" /> : <BrainCircuit size={18} />} Verify Intent
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            <div className={`w-full h-full relative ${activeVideoId && isGateOpen && !videoFinished ? 'block' : 'hidden'}`}>
              <div ref={playerContainerRef} className="w-full h-full" />
            </div>

            {activeVideoId && isGateOpen && !videoFinished && (
              <CustomControls 
                playing={isPlaying} played={played} duration={duration} muted={isMuted} onPlayPause={togglePlay}
                onSeek={e => { 
                  const v = parseFloat(e.target.value); 
                  setPlayed(v); 
                  playerInstance?.seekTo(v * duration, true); 
                }}
                onMute={() => { if (isMuted) { playerInstance?.unMute(); setIsMuted(false); } else { playerInstance?.mute(); setIsMuted(true); } }}
                onRewind={() => {
                  const newTime = Math.max(0, playerInstance.getCurrentTime() - 10);
                  playerInstance?.seekTo(newTime);
                  setPlayed(newTime / (duration || 1));
                }}
                onFastForward={() => {
                  const newTime = Math.min(duration, playerInstance.getCurrentTime() + 10);
                  playerInstance?.seekTo(newTime);
                  setPlayed(newTime / (duration || 1));
                }}
                onToggleFullscreen={() => containerRef.current?.requestFullscreen()}
                onAddToList={() => setShowPlaylistPicker(true)}
                visible={controlsVisible || !isPlaying}
              />
            )}

            {videoFinished && (
              <div className="absolute inset-0 z-[200] flex flex-col items-center justify-center bg-black/98 backdrop-blur-3xl p-12 text-center animate-fade-in">
                <div className="relative mb-10">
                  <CheckCircle2 size={100} className="text-emerald-500 drop-shadow-[0_0_35px_rgba(16,185,129,0.7)]" />
                  <div className="absolute inset-0 border-2 border-emerald-500 rounded-full animate-ping opacity-10" />
                </div>
                <h2 className="text-6xl font-black mb-4 tracking-tighter text-white">Deep Work Success</h2>
                <p className="text-zinc-500 mb-12 text-lg max-w-lg">You maintained intentional focus for this session. Your notes have been preserved.</p>
                <div className="flex gap-6">
                  <button onClick={() => { setVideoFinished(false); playerInstance?.playVideo(); }} className="px-12 py-5 bg-white/5 text-white rounded-full font-bold hover:bg-white/10 transition-all active:scale-95 border border-white/10 uppercase tracking-widest text-[11px]"><RotateCcw size={18} className="inline mr-2" /> Resume Flow</button>
                  <button onClick={() => { setIsGateOpen(false); setUrlInput(''); setIsFocusing(false); setIsCinemaMode(false); }} className="px-12 py-5 bg-primary text-white rounded-full font-bold shadow-[0_0_40px_rgba(225,0,255,0.5)] hover:bg-primaryHover transition-all active:scale-95 uppercase tracking-widest text-[11px]">End Workspace</button>
                </div>
              </div>
            )}

            {!activeVideoId && (
              <div className="text-center p-12 animate-fade-in flex flex-col items-center">
                <WorkspaceLogo src="/favicon-96x96.png" fallback={FALLBACK_CENTER_LOGO} className="w-56 h-56 mx-auto mb-10 animate-glow-pulse object-contain" />
                <h2 className="text-4xl font-black mb-4 tracking-tight text-white">Focus flow. AI guided.</h2>
                <p className="text-zinc-500 text-lg max-w-md mx-auto leading-relaxed">Passive consumption is the end of growth. State your intention and dive into deep learning.</p>
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
