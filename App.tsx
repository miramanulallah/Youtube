
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
  RotateCcw
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'yt_workspace_history';
const TOP_LOGO_FALLBACK = "https://8upload.com/preview/f01c8db6aede6f36/favicon-96x96.png";
const CENTER_LOGO_FALLBACK = "https://8upload.com/preview/69403e83898df13d/12086f9a-12fe-4396-81ce-5fc8d7866199.png";

const extractYoutubeId = (url: string): string | null => {
  if (!url) return null;
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

let player: any = null;

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
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [focusTime, setFocusTime] = useState(0);
  const [isFocusing, setIsFocusing] = useState(false);

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

  useEffect(() => {
    let interval: any;
    if (isFocusing) {
      interval = setInterval(() => setFocusTime(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isFocusing]);

  const updateHistoryItem = useCallback((updates: Partial<VideoHistoryItem>) => {
    setCurrentVideo(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...updates, lastPlayed: Date.now() };
      setHistory(oldHistory => {
        const filtered = oldHistory.filter(p => p.id !== updated.id);
        return [updated, ...filtered];
      });
      return updated;
    });
  }, []);

  const onPlayerReady = useCallback((event: any) => {
    const videoData = event.target.getVideoData();
    if (videoData) {
      updateHistoryItem({
        title: videoData.title,
        author: videoData.author,
        duration: event.target.getDuration()
      });
    }
  }, [updateHistoryItem]);

  const onPlayerStateChange = useCallback((event: any) => {
    if (event.data === 0) { // ENDED
      setVideoFinished(true);
      setIsFocusing(false);
    } else if (event.data === 1) { // PLAYING
      setVideoFinished(false);
      setIsFocusing(true);
      // Refresh metadata just in case
      const videoData = event.target.getVideoData();
      if (videoData) {
        updateHistoryItem({
          title: videoData.title,
          author: videoData.author
        });
      }
    }
  }, [updateHistoryItem]);

  const loadPlayer = useCallback((videoId: string) => {
    if (player && typeof player.loadVideoById === 'function') {
      player.loadVideoById(videoId);
      return;
    }

    const checkYT = setInterval(() => {
      if ((window as any).YT && (window as any).YT.Player) {
        clearInterval(checkYT);
        player = new (window as any).YT.Player('yt-player-container', {
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
      setError("Please provide a valid YouTube link.");
      return;
    }
    setError(null);
    setIsGateOpen(false);
    setEvalResult(null);
    setIntentInput('');
    setVideoFinished(false);
  };

  const handleIntentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (intentInput.length < 3) {
      setError("Briefly state your intention.");
      return;
    }
    
    setIsEvaluating(true);
    setError(null);
    const result = await evaluateIntent(urlInput, intentInput);
    setEvalResult(result);
    setIsEvaluating(false);

    const id = extractYoutubeId(urlInput)!;
    const existing = history.find(h => extractYoutubeId(h.url) === id);
    const newItem: VideoHistoryItem = existing || {
      id: crypto.randomUUID(),
      url: `https://www.youtube.com/watch?v=${id}`,
      title: 'Loading metadata...',
      lastPlayed: Date.now(),
      progress: 0,
      duration: 0,
      completed: false,
      notes: '',
      category: result.category
    };
    
    setCurrentVideo(newItem);
    setIsFocusing(true);
    setIsGateOpen(true);
    setVideoFinished(false);
    setTimeout(() => loadPlayer(id), 100);
  };

  const activeVideoId = isGateOpen && currentVideo ? extractYoutubeId(currentVideo.url) : null;

  const resetSession = () => {
    setVideoFinished(false);
    if (activeVideoId) {
      player?.seekTo(0);
      player?.playVideo();
    }
  };

  return (
    <div ref={containerRef} className="h-screen w-screen bg-[#0f0f0f] text-[#f1f1f1] flex overflow-hidden font-sans">
      {!isCinemaMode && (
        <div className="w-80 hidden lg:flex flex-col p-5 border-r border-white/5 bg-[#0f0f0f] animate-in slide-in-from-left duration-300">
          <div className="mb-8 flex items-center gap-3 px-2">
            <div className="w-10 h-10 shrink-0">
              <img 
                src="/favicon-96x96.png" 
                alt="YouTube" 
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
                <Timer size={14} className="text-primary" /> Focus Session
              </span>
              <span className="text-xs font-mono text-primary">{Math.floor(focusTime / 60)}:{String(focusTime % 60).padStart(2, '0')}</span>
            </div>
            <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-1000" 
                style={{ width: `${Math.min((focusTime / 1800) * 100, 100)}%` }}
              />
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <HistoryPanel 
              history={history}
              onSelect={(item) => {
                const id = extractYoutubeId(item.url)!;
                setUrlInput(item.url);
                setIsGateOpen(true);
                setCurrentVideo(item);
                setVideoFinished(false);
                setTimeout(() => loadPlayer(id), 100);
              }}
              onDelete={(id) => {
                setHistory(prev => prev.filter(i => i.id !== id));
                if (currentVideo?.id === id) {
                  setCurrentVideo(null);
                  setIsGateOpen(false);
                  player?.stopVideo();
                }
              }}
              onRename={(id, title) => setHistory(prev => prev.map(h => h.id === id ? {...h, title} : h))}
              onExport={() => {}}
              onImport={() => {}}
            />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col relative">
        <header className={`z-20 w-full p-4 flex justify-center border-b border-white/5 bg-[#0f0f0f]/80 backdrop-blur-xl transition-all ${isCinemaMode ? 'py-2 opacity-0 hover:opacity-100' : ''}`}>
          <form onSubmit={handleUrlSubmit} className="relative w-full max-w-3xl flex items-center gap-4">
            <div className="relative flex-1">
              <input 
                type="text" 
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Paste any link (MMA, Coding, Islam, Lectures...)"
                className="w-full bg-[#121212] border border-white/10 text-white pl-5 pr-24 py-2.5 rounded-full focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all text-sm"
              />
              <button 
                type="submit"
                className="absolute right-1 top-1 bottom-1 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-full transition-all flex items-center gap-2"
              >
                <span className="text-xs font-medium uppercase tracking-wider">Focus</span>
                <Zap size={14} className="text-primary" />
              </button>
            </div>
            
            {activeVideoId && (
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsCinemaMode(!isCinemaMode)}
                  className={`p-2.5 rounded-full transition-all ${isCinemaMode ? 'bg-primary text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}
                >
                  <Monitor size={18} />
                </button>
                <button 
                  onClick={() => containerRef.current?.requestFullscreen()}
                  className="p-2.5 bg-white/5 text-zinc-400 hover:bg-white/10 rounded-full transition-all"
                >
                  <Maximize size={18} />
                </button>
              </div>
            )}
          </form>
        </header>

        <main className={`flex-1 flex gap-6 min-h-0 overflow-hidden transition-all ${isCinemaMode ? 'p-0 gap-0' : 'p-6'}`}>
          <div className="flex-1 flex flex-col min-w-0 h-full relative">
            <div className={`relative w-full h-full bg-black overflow-hidden shadow-2xl ${isCinemaMode ? 'rounded-0' : 'rounded-2xl border border-white/5'}`}>
              
              {/* Intent Gate */}
              {extractYoutubeId(urlInput) && !isGateOpen && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0f0f0f] p-8">
                  <div className="max-w-md w-full text-center space-y-6 animate-fade-in">
                    <div className="inline-flex p-4 bg-primary/10 rounded-full mb-2">
                      <Lock size={40} className="text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Focus Protocol</h2>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      All content is allowed, but intentionality is mandatory.<br/>
                      <span className="text-zinc-600">Why are you watching this session?</span>
                    </p>
                    
                    <form onSubmit={handleIntentSubmit} className="space-y-4 text-left">
                      <textarea 
                        value={intentInput}
                        onChange={(e) => setIntentInput(e.target.value)}
                        placeholder="e.g. Watching MMA for technique analysis / Watching Solana dev guide / Relaxation session..."
                        className="w-full bg-[#181818] border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-primary min-h-[100px] resize-none"
                      />
                      
                      <button 
                        type="submit"
                        disabled={isEvaluating}
                        className="w-full py-3 bg-white hover:bg-zinc-200 text-black rounded-full font-bold text-sm transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                        {isEvaluating ? <Loader2 className="animate-spin" /> : <BrainCircuit size={18} />}
                        {isEvaluating ? 'Defining Intent...' : 'Enter Session'}
                      </button>
                    </form>

                    {error && (
                      <p className="text-red-400 text-xs animate-pulse">{error}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Player Container */}
              <div id="yt-player-container" className={`w-full h-full ${activeVideoId && isGateOpen ? 'block' : 'hidden'}`} />

              {/* Suggestions Block Overlay */}
              {videoFinished && (
                <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-[#0f0f0f]/90 backdrop-blur-md p-12 text-center animate-fade-in">
                  <div className="mb-6">
                    <CheckCircle2 size={80} className="text-emerald-500 mb-4 mx-auto" />
                    <h2 className="text-3xl font-bold text-white mb-2">Intentional Session Over</h2>
                    <p className="text-zinc-400 max-w-sm mx-auto">
                      Great work staying within the workspace. Distractions were successfully filtered.
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={resetSession}
                      className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full font-medium flex items-center gap-2 transition-all"
                    >
                      <RotateCcw size={18} /> Replay
                    </button>
                    <button 
                      onClick={() => {
                        setIsGateOpen(false);
                        setUrlInput('');
                        setIsFocusing(false);
                      }}
                      className="px-6 py-2.5 bg-primary hover:bg-primaryHover text-white rounded-full font-medium transition-all"
                    >
                      Close Workspace
                    </button>
                  </div>
                </div>
              )}

              {!activeVideoId && !extractYoutubeId(urlInput) && (
                <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-[#0f0f0f]">
                   <div className="w-32 h-32 mb-6 opacity-40">
                     <img 
                       src="/web-app-manifest-512x512.png" 
                       alt="YouTube Workspace Logo" 
                       className="w-full h-full object-contain filter saturate-150 drop-shadow-[0_0_15px_rgba(225,0,255,0.3)]" 
                       onError={(e) => { e.currentTarget.src = CENTER_LOGO_FALLBACK; }}
                     />
                   </div>
                   <h2 className="text-2xl font-bold text-white mb-2">Intentional Workspace</h2>
                   <p className="text-zinc-600 max-w-xs text-sm leading-relaxed">
                     Paste any YouTube link. We'll automatically fetch the title and block all distractions.
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
                  onNotesChange={(text) => updateHistoryItem({ notes: text })}
               />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
