
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HistoryPanel } from './components/HistoryPanel';
import { AIStudio } from './components/AIStudio';
import { VideoHistoryItem } from './types';
import { evaluateIntent } from './services/geminiService';
import { 
  AlertCircle, 
  Timer, 
  Maximize, 
  Monitor, 
  Lock, 
  Loader2,
  BrainCircuit,
  Zap,
  CheckCircle2,
  RotateCcw,
  FastForward
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'yt_workspace_history';
const TOP_LOGO_FALLBACK = "https://8upload.com/preview/f01c8db6aede6f36/favicon-96x96.png";
const CENTER_LOGO_FALLBACK = "https://8upload.com/preview/69403e83898df13d/12086f9a-12fe-4396-81ce-5fc8d7866199.png";
const PROTOCOL_ICON = "https://8upload.com/preview/b4f4f2cc43d0df2b/_CITYPNG.COM_HD_Purple_Neon_Aesthetic_Youtube_YT_Play_Icon_PNG_-_2000x2000.png";

const extractYoutubeId = (url: string): string | null => {
  if (!url) return null;
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

// Use a ref for the global player instance
let playerInstance: any = null;

function App() {
  const [urlInput, setUrlInput] = useState('');
  const [intentInput, setIntentInput] = useState('');
  const [currentVideo, setCurrentVideo] = useState<VideoHistoryItem | null>(null);
  const [history, setHistory] = useState<VideoHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isGateOpen, setIsGateOpen] = useState(false);
  const [evalResult, setEvalResult] = useState<{ isWorthy: boolean; reasoning: string; category: string } | null>(null);
  const [videoFinished, setVideoFinished] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [focusTime, setFocusTime] = useState(0);
  const [isFocusing, setIsFocusing] = useState(false);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.toLowerCase() === 't') {
        setIsCinemaMode(prev => !prev);
      }
      if (e.key.toLowerCase() === 'f') {
        containerRef.current?.requestFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync History with Local Storage
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  // Focus Timer
  useEffect(() => {
    let interval: any;
    if (isFocusing) {
      interval = setInterval(() => setFocusTime(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isFocusing]);

  const updateHistoryFromMetadata = useCallback((p: any) => {
    if (!p || typeof p.getVideoData !== 'function') return;
    const videoData = p.getVideoData();
    const duration = p.getDuration();
    
    if (videoData && videoData.title) {
      setCurrentVideo(prev => {
        if (!prev) return null;
        const updated = { 
          ...prev, 
          title: videoData.title, 
          author: videoData.author,
          duration: duration || prev.duration 
        };
        
        setHistory(old => {
          const filtered = old.filter(i => i.id !== updated.id);
          return [updated, ...filtered];
        });
        
        return updated;
      });
    }
  }, []);

  const onPlayerReady = useCallback((event: any) => {
    updateHistoryFromMetadata(event.target);
  }, [updateHistoryFromMetadata]);

  const onPlayerStateChange = useCallback((event: any) => {
    if (event.data === (window as any).YT.PlayerState.ENDED) {
      setVideoFinished(true);
      setIsFocusing(false);
    } else if (event.data === (window as any).YT.PlayerState.PLAYING) {
      setVideoFinished(false);
      setIsFocusing(true);
      updateHistoryFromMetadata(event.target);
    } else if (event.data === (window as any).YT.PlayerState.PAUSED) {
      setIsFocusing(false);
    }
  }, [updateHistoryFromMetadata]);

  const loadPlayer = useCallback((videoId: string) => {
    if (playerInstance && typeof playerInstance.loadVideoById === 'function') {
      playerInstance.loadVideoById(videoId);
      return;
    }

    const checkYT = setInterval(() => {
      if ((window as any).YT && (window as any).YT.Player && playerContainerRef.current) {
        clearInterval(checkYT);
        const innerDiv = document.createElement('div');
        innerDiv.id = 'yt-player-internal';
        playerContainerRef.current.innerHTML = '';
        playerContainerRef.current.appendChild(innerDiv);

        playerInstance = new (window as any).YT.Player('yt-player-internal', {
          height: '100%',
          width: '100%',
          videoId: videoId,
          playerVars: {
            'autoplay': 1,
            'controls': 1,
            'modestbranding': 1,
            'rel': 0, 
            'showinfo': 0,
            'iv_load_policy': 3
          },
          events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
          }
        });
      }
    }, 100);
  }, [onPlayerReady, onPlayerStateChange]);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = extractYoutubeId(urlInput);
    if (!id) {
      setError("Valid YouTube link required.");
      return;
    }
    setError(null);
    setIsGateOpen(false);
    setEvalResult(null);
    setIntentInput('');
    setVideoFinished(false);
  };

  const startSessionWithMetadata = (id: string, category: string) => {
    const existing = history.find(h => extractYoutubeId(h.url) === id);
    
    const newItem: VideoHistoryItem = existing || {
      id: crypto.randomUUID(),
      url: `https://www.youtube.com/watch?v=${id}`,
      title: 'Syncing metadata...',
      lastPlayed: Date.now(),
      progress: 0,
      duration: 0,
      completed: false,
      notes: '',
      category: category
    };
    
    setCurrentVideo(newItem);
    setIsFocusing(true);
    setIsGateOpen(true);
    setVideoFinished(false);
    setTimeout(() => loadPlayer(id), 200);
  };

  const handleIntentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (intentInput.length < 2) {
      setError("Please state your intention.");
      return;
    }
    
    setIsEvaluating(true);
    setError(null);
    
    const result = await evaluateIntent(urlInput, intentInput);
    setEvalResult(result);
    setIsEvaluating(false);

    const id = extractYoutubeId(urlInput)!;
    startSessionWithMetadata(id, result.category);
  };

  const handleSkip = () => {
    const id = extractYoutubeId(urlInput);
    if (!id) return;
    startSessionWithMetadata(id, "Quick Session");
  };

  const activeVideoId = isGateOpen && currentVideo ? extractYoutubeId(currentVideo.url) : null;

  const resetSession = () => {
    setVideoFinished(false);
    if (playerInstance && typeof playerInstance.seekTo === 'function') {
      playerInstance.seekTo(0);
      playerInstance.playVideo();
    }
  };

  return (
    <div ref={containerRef} className="h-screen w-screen bg-[#0f0f0f] text-[#f1f1f1] flex overflow-hidden font-sans yt-gradient">
      {!isCinemaMode && (
        <aside className="w-80 flex flex-col p-5 border-r border-white/5 bg-[#0f0f0f] animate-in slide-in-from-left duration-300 h-full">
          <div className="mb-8 flex items-center gap-3 px-2">
            <div className="w-10 h-10 shrink-0">
              <img 
                src="/favicon-96x96.png" 
                alt="Logo" 
                className="w-full h-full object-contain" 
                onError={(e) => { e.currentTarget.src = TOP_LOGO_FALLBACK; }}
              />
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
              history={history}
              onSelect={(item) => {
                setUrlInput(item.url);
                setIsGateOpen(true);
                setCurrentVideo(item);
                setVideoFinished(false);
                setTimeout(() => loadPlayer(extractYoutubeId(item.url)!), 200);
              }}
              onDelete={(id) => {
                setHistory(prev => prev.filter(i => i.id !== id));
                if (currentVideo?.id === id) {
                  setCurrentVideo(null);
                  setIsGateOpen(false);
                  playerInstance?.stopVideo();
                }
              }}
              onRename={(id, title) => setHistory(prev => prev.map(h => h.id === id ? {...h, title} : h))}
              onExport={() => {
                const blob = new Blob([JSON.stringify(history)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `youtube-workspace-history.json`;
                a.click();
              }}
              onImport={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (re) => {
                  try {
                    const imported = JSON.parse(re.target?.result as string);
                    setHistory(prev => [...imported, ...prev.filter(p => !imported.some((i: any) => i.id === p.id))]);
                  } catch (err) { alert("Invalid import file."); }
                };
                reader.readAsText(file);
              }}
            />
          </div>
        </aside>
      )}

      <div className="flex-1 flex flex-col relative min-w-0">
        <header className={`z-20 w-full p-4 flex justify-center border-b border-white/5 bg-[#0f0f0f]/80 backdrop-blur-xl transition-all duration-300 ${isCinemaMode ? 'py-2 opacity-0 hover:opacity-100' : ''}`}>
          <form onSubmit={handleUrlSubmit} className="relative w-full max-w-3xl flex items-center gap-4">
            <div className="relative flex-1">
              <input 
                type="text" 
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Paste link (Learning Solana, MMA Analysis, Islam Lectures...)"
                className="w-full bg-[#121212] border border-white/10 text-white pl-5 pr-24 py-3 rounded-full focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all text-sm shadow-inner"
              />
              <button 
                type="submit"
                className="absolute right-1.5 top-1.5 bottom-1.5 px-5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-full transition-all flex items-center gap-2 group"
              >
                <span className="text-xs font-bold uppercase tracking-widest">Focus</span>
                <Zap size={14} className="text-primary group-hover:scale-125 transition-transform" />
              </button>
            </div>
            
            {activeVideoId && (
              <div className="flex gap-2 shrink-0">
                <button 
                  type="button"
                  onClick={() => setIsCinemaMode(!isCinemaMode)}
                  title="Cinema Mode (T)"
                  className={`p-3 rounded-full transition-all ${isCinemaMode ? 'bg-primary text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}
                >
                  <Monitor size={18} />
                </button>
                <button 
                  type="button"
                  onClick={() => containerRef.current?.requestFullscreen()}
                  title="Fullscreen (F)"
                  className="p-3 bg-white/5 text-zinc-400 hover:bg-white/10 rounded-full transition-all"
                >
                  <Maximize size={18} />
                </button>
              </div>
            )}
          </form>
        </header>

        <main className={`flex-1 flex min-h-0 overflow-hidden transition-all duration-300 ${isCinemaMode ? 'p-0 gap-0' : 'p-6 gap-6'}`}>
          <div className="flex-1 flex flex-col min-w-0 h-full relative">
            <div className={`relative w-full h-full bg-black overflow-hidden shadow-2xl transition-all duration-500 ${isCinemaMode ? 'rounded-0' : 'rounded-2xl border border-white/5'}`}>
              
              {/* Intent Gate */}
              {extractYoutubeId(urlInput) && !isGateOpen && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0f0f0f] p-8">
                  <div className="max-w-md w-full text-center space-y-6 animate-fade-in">
                    <div className="w-32 h-32 mx-auto mb-4 p-4 bg-primary/5 rounded-full flex items-center justify-center">
                      <img 
                        src={PROTOCOL_ICON} 
                        alt="Protocol Icon" 
                        className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(225,0,255,0.7)]" 
                      />
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-tight uppercase">Intentional Protocol</h2>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      All videos allowed. Purpose is mandatory.<br/>
                      <span className="text-zinc-600">Why are you entering this session?</span>
                    </p>
                    
                    <form onSubmit={handleIntentSubmit} className="space-y-4 text-left">
                      <textarea 
                        autoFocus
                        value={intentInput}
                        onChange={(e) => setIntentInput(e.target.value)}
                        placeholder="e.g. Analysis of UFC 300 technique / Dev session on Rust / Spiritual growth lecture..."
                        className="w-full bg-[#181818] border border-white/10 rounded-xl p-5 text-sm text-white focus:outline-none focus:border-primary min-h-[120px] resize-none shadow-xl transition-all"
                      />
                      
                      <div className="flex items-center gap-3">
                        <button 
                          type="button"
                          onClick={handleSkip}
                          className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-full font-bold text-sm transition-all flex items-center justify-center gap-3"
                        >
                          <FastForward size={18} />
                          Skip
                        </button>
                        <button 
                          type="submit"
                          disabled={isEvaluating}
                          className="flex-[2] py-4 bg-white hover:bg-zinc-200 text-black rounded-full font-bold text-sm transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                          {isEvaluating ? <Loader2 className="animate-spin" /> : <BrainCircuit size={18} />}
                          {isEvaluating ? 'Calibrating...' : 'Start Intentional Session'}
                        </button>
                      </div>
                    </form>

                    {error && (
                      <p className="text-red-400 text-xs font-medium bg-red-400/10 py-2 px-4 rounded-lg border border-red-400/20">{error}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Player Container */}
              <div 
                ref={playerContainerRef}
                className={`w-full h-full ${activeVideoId && isGateOpen ? 'block' : 'hidden'}`} 
              />

              {/* Complete Overlay */}
              {videoFinished && (
                <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-[#0f0f0f]/95 backdrop-blur-xl p-12 text-center animate-fade-in">
                  <div className="mb-8">
                    <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 size={60} className="text-emerald-500" />
                    </div>
                    <h2 className="text-4xl font-black text-white mb-3">Session Refined</h2>
                    <p className="text-zinc-400 max-w-sm mx-auto text-lg leading-relaxed">
                      Distractions filtered. <br/>You stayed intentional throughout.
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={resetSession}
                      className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-full font-bold flex items-center gap-2 transition-all border border-white/5"
                    >
                      <RotateCcw size={20} /> Replay
                    </button>
                    <button 
                      onClick={() => {
                        setIsGateOpen(false);
                        setUrlInput('');
                        setIsFocusing(false);
                        setVideoFinished(false);
                        playerInstance?.stopVideo();
                      }}
                      className="px-8 py-3 bg-primary hover:bg-primaryHover text-white rounded-full font-bold transition-all shadow-[0_0_20px_rgba(225,0,255,0.4)]"
                    >
                      Exit Workspace
                    </button>
                  </div>
                </div>
              )}

              {/* Landing State */}
              {!activeVideoId && !extractYoutubeId(urlInput) && (
                <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-[#0f0f0f]">
                   <div className="w-40 h-40 mb-8 opacity-40">
                     <img 
                       src="/web-app-manifest-512x512.png" 
                       alt="Workspace" 
                       className="w-full h-full object-contain filter saturate-150 drop-shadow-[0_0_20px_rgba(225,0,255,0.5)]" 
                       onError={(e) => { e.currentTarget.src = CENTER_LOGO_FALLBACK; }}
                     />
                   </div>
                   <h2 className="text-3xl font-black text-white mb-3 tracking-tight">YouTube Workspace</h2>
                   <p className="text-zinc-500 max-w-sm text-sm leading-relaxed">
                     Intentionality is performance. <br/>
                     Paste a link to start your zero-noise session.
                   </p>
                </div>
              )}
            </div>
          </div>

          {!isCinemaMode && (
            <div className="w-[420px] hidden xl:flex flex-col h-full shrink-0 animate-in slide-in-from-right duration-300">
               <AIStudio 
                  currentTitle={currentVideo?.title || 'Synthesis Mode'} 
                  notes={currentVideo?.notes || ''}
                  onNotesChange={(text) => {
                    setCurrentVideo(prev => prev ? { ...prev, notes: text } : null);
                    setHistory(old => old.map(h => h.id === currentVideo?.id ? { ...h, notes: text } : h));
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
