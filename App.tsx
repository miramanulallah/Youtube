
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HistoryPanel } from './components/HistoryPanel';
import { AIStudio } from './components/AIStudio';
import { CustomControls } from './components/CustomControls';
import { VideoHistoryItem, SidebarView, Playlist, Chapter } from './types';
import { evaluateIntent, transcribeAudio } from './services/geminiService';
import { 
  Loader2, BrainCircuit, Zap, CheckCircle2, RotateCcw, MoreVertical, Clock, Mic, PlusSquare, X, MonitorPlay, Plus, ListOrdered, Link
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
  const [queueUrlInput, setQueueUrlInput] = useState('');
  const [intentInput, setIntentInput] = useState('');
  const [currentVideo, setCurrentVideo] = useState<VideoHistoryItem | null>(null);
  const [history, setHistory] = useState<VideoHistoryItem[]>([]);
  const [watchLater, setWatchLater] = useState<VideoHistoryItem[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [queues, setQueues] = useState<Playlist[]>([]);
  const [activeQueueId, setActiveQueueId] = useState<string | null>(null);
  const [sidebarView, setSidebarView] = useState<SidebarView>(SidebarView.HISTORY);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGateOpen, setIsGateOpen] = useState(false);
  const [videoFinished, setVideoFinished] = useState(false);
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'playlist' | 'queue'>('playlist');
  const [isRecordingIntent, setIsRecordingIntent] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [focusTime, setFocusTime] = useState(0);
  const [isFocusing, setIsFocusing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [quality, setQuality] = useState('auto');
  const [availableRates, setAvailableRates] = useState<number[]>([1]);
  const [availableQualities, setAvailableQualities] = useState<string[]>(['auto']);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(false);
  const controlsTimeoutRef = useRef<number | null>(null);

  const seekForward = useCallback(() => {
    if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
      const currentTime = playerRef.current.getCurrentTime();
      const dur = playerRef.current.getDuration();
      playerRef.current.seekTo(Math.min(dur, currentTime + 10), true);
    }
  }, []);

  const seekBackward = useCallback(() => {
    if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
      const currentTime = playerRef.current.getCurrentTime();
      playerRef.current.seekTo(Math.max(0, currentTime - 10), true);
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (!playerRef.current) return;
    if (isPlaying) playerRef.current.pauseVideo();
    else playerRef.current.playVideo();
  }, [isPlaying]);

  const extractChaptersFromText = (text: string): Chapter[] => {
    const chapters: Chapter[] = [];
    const regex = /(?:^|\n)(?:(\d+):)?(\d+):(\d+)\s+(.+)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const hours = match[1] ? parseInt(match[1]) : 0;
      const minutes = parseInt(match[2]);
      const seconds = parseInt(match[3]);
      const title = match[4].trim();
      const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
      chapters.push({ title, time: totalSeconds });
    }
    return chapters.sort((a, b) => a.time - b.time);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === ' ') { e.preventDefault(); togglePlay(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); seekForward(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); seekBackward(); }
      if (e.key.toLowerCase() === 'f') containerRef.current?.requestFullscreen();
      if (e.key.toLowerCase() === 't') setIsCinemaMode(prev => !prev);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isCinemaMode, seekForward, seekBackward, togglePlay]);

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
        if (t > 0) {
          setPlayed(c / t);
          setDuration(t);
          setPlaybackRate(playerRef.current.getPlaybackRate());
          setQuality(playerRef.current.getPlaybackQuality());
          
          setCurrentVideo(prev => {
            if (prev && Math.abs(prev.progress - c) > 1.5) {
              const updated = { ...prev, progress: c, duration: t };
              setHistory(old => old.map(h => h.id === prev.id ? updated : h));
              return updated;
            }
            return prev;
          });
        }
      }, 250); 
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleSkip = useCallback((direction: 'next' | 'prev') => {
    if (!activeQueueId || !currentVideo) return;
    const queue = queues.find(q => q.id === activeQueueId);
    if (!queue) return;
    const currentId = extractYoutubeId(currentVideo.url);
    const currentIndex = queue.videoIds.indexOf(currentId!);
    if (currentIndex === -1) return;

    let targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (targetIndex >= 0 && targetIndex < queue.videoIds.length) {
      const targetId = queue.videoIds[targetIndex];
      const combined = [...history, ...watchLater];
      const targetVideo = combined.find(v => extractYoutubeId(v.url) === targetId);
      if (targetVideo) {
        onSelectVideo(targetVideo);
      } else {
        setUrlInput(`https://www.youtube.com/watch?v=${targetId}`);
        setIsGateOpen(false);
      }
    }
  }, [activeQueueId, currentVideo, queues, history, watchLater]);

  const updateMetadata = useCallback((vd: any, dur: number) => {
    if (!vd || !vd.title || vd.title === 'YouTube Video' || vd.title === '') return;
    const vidId = vd.video_id;
    const youtubeTitle = vd.title;
    const author = vd.author;

    setHistory(old => {
      const index = old.findIndex(h => extractYoutubeId(h.url) === vidId);
      if (index === -1) return old;
      const newHistory = [...old];
      const updatedItem = { ...newHistory[index], title: youtubeTitle, author, duration: dur, thumbnailUrl: fetchThumbnail(vidId) };
      newHistory[index] = updatedItem;
      setCurrentVideo(prev => (prev && extractYoutubeId(prev.url) === vidId) ? updatedItem : prev);
      return newHistory;
    });
  }, []);

  const onPlayerReady = useCallback((event: any) => {
    playerRef.current = event.target;
    const dur = event.target.getDuration();
    setDuration(dur);
    setIsMuted(event.target.isMuted());
    setAvailableRates(event.target.getAvailablePlaybackRates());
    setAvailableQualities(event.target.getAvailableQualityLevels());
    setPlaybackRate(event.target.getPlaybackRate());
    setQuality(event.target.getPlaybackQuality());
    
    if (currentVideo && currentVideo.progress > 0) {
      event.target.seekTo(currentVideo.progress, true);
    }
    updateMetadata(event.target.getVideoData(), dur);
  }, [updateMetadata, currentVideo]);

  const onPlayerStateChange = useCallback((e: any) => {
    const YT = (window as any).YT;
    if (e.data === YT.PlayerState.ENDED) {
      const currentTime = e.target.getCurrentTime();
      const totalDuration = e.target.getDuration();
      if (totalDuration > 0 && Math.abs(totalDuration - currentTime) < 3) {
        setVideoFinished(true); 
        setIsFocusing(false); 
        setIsPlaying(false);
        playerRef.current?.stopVideo();
        handleSkip('next');
      }
    } else if (e.data === YT.PlayerState.PLAYING) {
      setVideoFinished(false); 
      setIsFocusing(true); 
      setIsPlaying(true);
      setAvailableQualities(e.target.getAvailableQualityLevels());
      updateMetadata(e.target.getVideoData(), e.target.getDuration());
    } else if (e.data === YT.PlayerState.PAUSED) {
      setIsPlaying(false); 
      setIsFocusing(false);
    }
  }, [updateMetadata, handleSkip]);

  const loadPlayer = useCallback((videoId: string, startAt: number = 0) => {
    if (playerRef.current?.loadVideoById) {
      playerRef.current.loadVideoById({ videoId, startSeconds: Math.floor(startAt) });
      return;
    }
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
    if (existing) {
      setCurrentVideo(existing);
      setHistory(old => [existing, ...old.filter(h => h.id !== existing.id)]);
      setIsGateOpen(true);
      setVideoFinished(false);
      setIsCinemaMode(true);
      setControlsVisible(false);
      setTimeout(() => loadPlayer(id, existing.progress), 200);
      return;
    }
    const newItem: VideoHistoryItem = {
      id: crypto.randomUUID(),
      url: `https://www.youtube.com/watch?v=${id}`,
      title: 'Loading...', 
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
    setHistory(old => [newItem, ...old]);
    setIsGateOpen(true);
    setVideoFinished(false);
    setIsCinemaMode(true);
    setControlsVisible(false);
    setTimeout(() => loadPlayer(id, 0), 200);
  };

  const onSelectVideo = (i: VideoHistoryItem) => {
    setUrlInput(i.url); 
    setCurrentVideo(i); 
    setIsGateOpen(true); 
    setVideoFinished(false); 
    setIsCinemaMode(true); 
    setTimeout(() => loadPlayer(extractYoutubeId(i.url)!, i.progress), 200); 
  };

  const handleCreateAndAddToQueue = (providedId?: string) => {
    const vidId = providedId || extractYoutubeId(urlInput) || (currentVideo ? extractYoutubeId(currentVideo.url) : null);
    if (!vidId) return;
    const name = providedId ? 'Queue Session' : (currentVideo?.title && currentVideo.title !== 'Loading...' ? currentVideo.title : 'New Queue');
    const newQueue: Playlist = { id: crypto.randomUUID(), name, videoIds: [vidId] };
    setQueues(prev => [...prev, newQueue]);
    setActiveQueueId(newQueue.id);
    setQueueUrlInput('');
  };

  const handleAddLinkToQueue = (e: React.FormEvent) => {
    e.preventDefault();
    const vidId = extractYoutubeId(queueUrlInput);
    if (!vidId) return;
    if (activeQueueId) {
      setQueues(prev => prev.map(q => q.id === activeQueueId ? { ...q, videoIds: [...q.videoIds, vidId] } : q));
      setQueueUrlInput('');
    } else {
      handleCreateAndAddToQueue(vidId);
    }
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
        progress: currentVideo?.progress || 0,
        duration: currentVideo?.duration || 0,
        completed: false,
        notes: '',
        category: 'Watch Later',
        chapters: []
      }, ...prev]);
    }
    setShowPlaylistPicker(false);
  };

  const handleSaveToPlaylist = (playlistId: string) => {
    const vidId = extractYoutubeId(urlInput) || (currentVideo ? extractYoutubeId(currentVideo.url) : null);
    if (!vidId) return;
    if (pickerMode === 'queue') {
      setQueues(prev => prev.map(q => (q.id === playlistId && !q.videoIds.includes(vidId)) ? { ...q, videoIds: [...q.videoIds, vidId] } : q));
    } else {
      setPlaylists(prev => prev.map(p => (p.id === playlistId && !p.videoIds.includes(vidId)) ? { ...p, videoIds: [...p.videoIds, vidId] } : p));
    }
    setShowPlaylistPicker(false);
  };

  const activeVideoId = extractYoutubeId(urlInput);
  const isProtocolActive = activeVideoId && !isGateOpen;
  const showHeader = !isCinemaMode && !isProtocolActive && !isGateOpen;

  return (
    <div ref={containerRef} className="h-screen w-screen bg-black text-[#f1f1f1] flex overflow-hidden font-sans select-none">
      {!isCinemaMode && (
        <aside className="w-80 flex flex-col p-5 border-r border-white/5 bg-[#0f0f0f] h-full shrink-0 animate-in slide-in-from-left duration-300 overflow-hidden">
          <div className="mb-8 flex items-center gap-4 px-2 shrink-0">
            <WorkspaceLogo src="/favicon-96x96.png" fallback={FALLBACK_FAVICON} className="w-10 h-10 object-contain rounded-lg" />
            <div className="flex flex-col">
              <h1 className="text-white font-bold text-2xl tracking-tight leading-none">YouTube</h1>
              <span className="text-primary font-black text-[10px] tracking-[0.25em] -mt-0.5 uppercase">WORKSPACE</span>
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
                history={history} watchLater={watchLater} playlists={playlists} queues={queues} currentView={sidebarView} onViewChange={setSidebarView}
                onSelect={i => {
                   if (sidebarView === SidebarView.QUEUE) {
                     const q = queues.find(x => x.videoIds.includes(extractYoutubeId(i.url)!));
                     if (q) setActiveQueueId(q.id);
                   }
                   onSelectVideo(i);
                }}
                onDelete={(id, wl) => wl ? setWatchLater(p => p.filter(i=>i.id!==id)) : setHistory(p => p.filter(i=>i.id!==id))}
                onRename={(id, t, wl) => wl ? setWatchLater(p => p.map(h=>h.id===id?{...h,title:t}:h)) : setHistory(p => p.map(h=>h.id===id?{...h,title:t}:h))}
                onCreatePlaylist={(name) => setPlaylists(prev => [...prev, { id: crypto.randomUUID(), name, videoIds: [] }])}
                onDeletePlaylist={(id) => setPlaylists(prev => prev.filter(p => p.id !== id))}
                onDeleteQueue={(id) => setQueues(prev => prev.filter(p => p.id !== id))}
                onExport={() => { const b = new Blob([JSON.stringify({history,watchLater,playlists,queues})],{type:'application/json'}); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href=u; a.download='workspace.json'; a.click(); }}
                onImport={e => { const f = e.target.files?.[0]; if(f){const r=new FileReader(); r.onload=re=>{try{const i=JSON.parse(re.target?.result as string); if(i.history) setHistory(i.history); if(i.watchLater) setWatchLater(i.watchLater); if(i.playlists) setPlaylists(i.playlists); if(i.queues) setQueues(i.queues || []); else setQueues([]);}catch(err){}};r.readAsText(f);}}}
              />
            </div>
          </div>
        </aside>
      )}

      <div className="flex-1 flex flex-col relative min-w-0 bg-black overflow-hidden h-full">
        {showHeader && (
          <header className="z-50 w-full p-4 flex justify-between items-center bg-[#0f0f0f]/95 backdrop-blur-2xl fixed top-0 left-0 right-0 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-3 ml-2">
              <WorkspaceLogo src="/favicon-96x96.png" fallback={FALLBACK_FAVICON} className="w-8 h-8 object-contain rounded-md" />
              <div className="hidden sm:flex flex-col">
                <span className="text-[11px] font-bold text-white uppercase tracking-tight leading-none">YouTube</span>
                <span className="text-[8px] font-black text-primary uppercase tracking-[0.2em]">WORKSPACE</span>
              </div>
            </div>

            <div className="flex-1 max-w-3xl flex items-center gap-3 px-4">
              <div className="relative flex-1">
                <input type="text" value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="Paste video link to analyze objective..." className="w-full bg-[#121212] border border-white/10 text-white px-5 py-2.5 rounded-full text-sm outline-none focus:border-primary transition-all shadow-inner" />
                <button onClick={() => { const id = extractYoutubeId(urlInput); if(id) { setIsGateOpen(false); setVideoFinished(false); } }} className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-full flex items-center gap-2 font-bold uppercase tracking-widest text-[10px]">Analyze <Zap size={14} className="text-primary" /></button>
              </div>
            </div>

            <div className="flex items-center gap-3 mr-2">
               <WorkspaceLogo src="/favicon-96x96.png" fallback={FALLBACK_FAVICON} className="w-8 h-8 object-contain rounded-md opacity-50" />
            </div>
          </header>
        )}

        {showPlaylistPicker && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-md">
            <div className="w-96 bg-[#121212] border border-white/10 rounded-2xl shadow-2xl p-6 animate-fade-in relative">
              <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-3">
                <h3 className="text-xs font-black uppercase tracking-[0.25em] text-primary">{pickerMode === 'queue' ? 'Session Queue' : 'Target List'}</h3>
                <button onClick={() => setShowPlaylistPicker(false)} className="text-zinc-500 hover:text-white transition-colors"><X size={20} /></button>
              </div>
              
              {pickerMode === 'queue' && (
                <form onSubmit={handleAddLinkToQueue} className="mb-6">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input 
                        autoFocus
                        value={queueUrlInput} 
                        onChange={e => setQueueUrlInput(e.target.value)} 
                        placeholder="Paste YouTube Link here..." 
                        className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-xs text-white focus:border-primary outline-none transition-all"
                      />
                      <Link size={14} className="absolute right-3 top-3.5 text-zinc-600" />
                    </div>
                    <button type="submit" className="px-5 bg-primary text-white font-bold rounded-lg hover:bg-primaryHover transition-all text-[10px] uppercase tracking-widest active:scale-95">Add</button>
                  </div>
                </form>
              )}

              <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2">
                {pickerMode === 'queue' ? (
                  <>
                    <button onClick={() => handleCreateAndAddToQueue()} className="w-full text-left px-4 py-3 text-xs text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-xl transition-all flex items-center gap-3 mb-2 font-bold uppercase tracking-widest"><Plus size={16} /> Start New Queue</button>
                    {queues.map(q => (
                      <button key={q.id} onClick={() => handleSaveToPlaylist(q.id)} className={`w-full text-left px-4 py-3 text-xs rounded-xl border transition-all flex justify-between items-center ${activeQueueId === q.id ? 'bg-primary/20 border-primary text-white' : 'bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10'}`}>
                        <div className="flex items-center gap-3"><ListOrdered size={14} /><span className="font-bold truncate max-w-[180px]">{q.name}</span></div>
                        <span className="text-[9px] font-black text-zinc-600 uppercase">({q.videoIds.length})</span>
                      </button>
                    ))}
                  </>
                ) : (
                  <>
                    <button onClick={handleSaveWatchLater} className="w-full text-left px-4 py-4 text-xs text-zinc-300 bg-white/5 hover:bg-white/10 rounded-xl transition-all flex items-center gap-3 mb-2 font-bold uppercase tracking-widest"><Clock size={16} className="text-primary" /> Watch Later</button>
                    {playlists.map(p => (
                      <button key={p.id} onClick={() => handleSaveToPlaylist(p.id)} className="w-full text-left px-4 py-3.5 text-xs text-zinc-400 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all flex justify-between items-center">
                        <span className="font-bold truncate max-w-[200px]">{p.name}</span>
                        <span className="text-[9px] font-black text-zinc-600">({p.videoIds.length})</span>
                      </button>
                    ))}
                  </>
                )}
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
          className={`flex-1 flex gap-0 transition-all duration-500 min-h-0 overflow-hidden ${showHeader ? 'pt-20' : 'pt-0'}`}
        >
          <div className="flex-1 relative bg-black overflow-hidden flex items-center justify-center h-full">
            {isProtocolActive && (
              <div className="absolute inset-0 z-[150] flex items-center justify-center bg-[#0f0f0f] p-8 animate-fade-in">
                <div className="max-w-md w-full text-center space-y-6 relative">
                  <div className="relative inline-block">
                    <WorkspaceLogo src={PROTOCOL_ICON} fallback={PROTOCOL_ICON} className="w-32 h-32 mx-auto" />
                  </div>
                  <h2 className="text-2xl font-black uppercase tracking-tight text-white">Intentional Protocol</h2>
                  <textarea 
                    value={intentInput} 
                    onChange={e => setIntentInput(e.target.value)} 
                    placeholder="Why are you watching this? State your learning objective..." 
                    className="w-full bg-[#181818] border border-white/10 rounded-2xl p-6 text-sm text-white focus:border-primary outline-none min-h-[140px] resize-none transition-all shadow-inner" 
                  />
                  <div className="flex gap-4">
                    <button type="button" onClick={() => { const id = extractYoutubeId(urlInput); if(id) startSession(id, "Direct Session"); }} className="flex-1 py-4 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full font-bold uppercase text-[11px] tracking-widest transition-all active:scale-95 border border-white/5">Skip Analysis</button>
                    <button 
                      onClick={handleIntentSubmit} 
                      disabled={isEvaluating || !intentInput.trim()} 
                      className="flex-[2] py-4 bg-white hover:bg-zinc-200 text-black rounded-full font-bold uppercase text-[11px] tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.1)] disabled:opacity-50"
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
                playing={isPlaying} played={played} duration={duration} muted={isMuted} 
                chapters={currentVideo?.chapters || []}
                playbackRate={playbackRate}
                quality={quality}
                availableRates={availableRates}
                availableQualities={availableQualities}
                captionsEnabled={captionsEnabled}
                onPlayPause={togglePlay}
                onSeek={e => { const v = parseFloat(e.target.value); setPlayed(v); playerRef.current?.seekTo(v * duration, true); }}
                onMute={() => { if (isMuted) { playerRef.current?.unMute(); setIsMuted(false); } else { playerRef.current?.mute(); setIsMuted(true); } }}
                onRewind={seekBackward}
                onFastForward={seekForward}
                onSkipNext={() => handleSkip('next')}
                onSkipPrev={() => handleSkip('prev')}
                onToggleFullscreen={() => containerRef.current?.requestFullscreen()}
                onAddToList={() => { setPickerMode('playlist'); setShowPlaylistPicker(true); }}
                onAddToQueue={() => { setPickerMode('queue'); setShowPlaylistPicker(true); }}
                onSetRate={rate => { playerRef.current?.setPlaybackRate(rate); setPlaybackRate(rate); }}
                onSetQuality={q => { playerRef.current?.setPlaybackQuality(q); setQuality(q); }}
                onToggleCaptions={() => { 
                   if (captionsEnabled) playerRef.current?.unloadModule('captions');
                   else playerRef.current?.loadModule('captions');
                   setCaptionsEnabled(!captionsEnabled); 
                }}
                visible={controlsVisible || !isPlaying}
              />
            )}

            {videoFinished && (
              <div className="absolute inset-0 z-[200] flex flex-col items-center justify-center bg-black/98 backdrop-blur-3xl p-12 text-center animate-fade-in">
                <div className="relative mb-10"><CheckCircle2 size={100} className="text-emerald-500 drop-shadow-[0_0_35px_rgba(16,185,129,0.7)]" /></div>
                <h2 className="text-6xl font-black mb-4 tracking-tighter text-white">Deep Work Success</h2>
                <div className="flex gap-6 mt-12">
                  <button onClick={() => { setVideoFinished(false); playerRef.current?.playVideo(); }} className="px-12 py-5 bg-white/5 text-white rounded-full font-bold hover:bg-white/10 transition-all border border-white/10 uppercase tracking-widest text-[11px]"><RotateCcw size={18} className="inline mr-2" /> Resume Flow</button>
                  <button onClick={() => { setIsGateOpen(false); setUrlInput(''); setIsFocusing(false); setIsCinemaMode(false); setActiveQueueId(null); }} className="px-12 py-5 bg-primary text-white rounded-full font-bold shadow-[0_0_40px_rgba(225,0,255,0.5)] hover:bg-primaryHover transition-all uppercase tracking-widest text-[11px]">End Session</button>
                </div>
              </div>
            )}

            {!activeVideoId && (
              <div className="text-center p-12 animate-fade-in flex flex-col items-center">
                <WorkspaceLogo src="/favicon-96x96.png" fallback={FALLBACK_CENTER_LOGO} className="w-56 h-56 mx-auto mb-10 animate-glow-pulse object-contain" />
                <h2 className="text-4xl font-black mb-4 tracking-tight text-white">Focus flow. AI guided.</h2>
              </div>
            )}
          </div>
          {!isCinemaMode && (
            <div className="w-[440px] hidden xl:flex flex-col h-full shrink-0 border-l border-white/5 animate-in slide-in-from-right duration-500 overflow-hidden">
              <AIStudio 
                currentTitle={currentVideo?.title || ''} 
                notes={currentVideo?.notes || ''} 
                onNotesChange={t => { 
                   const caps = extractChaptersFromText(t);
                   setCurrentVideo(p => p ? {...p, notes: t, chapters: caps.length > 0 ? caps : p.chapters} : null); 
                   setHistory(old => old.map(h => h.id === currentVideo?.id ? {...h, notes: t, chapters: caps.length > 0 ? caps : h.chapters} : h)); 
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
