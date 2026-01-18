import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HistoryPanel } from './components/HistoryPanel';
import { AIStudio } from './components/AIStudio';
import { VideoHistoryItem } from './types';
import { AlertCircle, Timer, Target, ArrowRight, Maximize, Monitor } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'focusflow_history';

const extractYoutubeId = (url: string): string | null => {
  if (!url) return null;
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

function App() {
  const [urlInput, setUrlInput] = useState('');
  const [currentVideo, setCurrentVideo] = useState<VideoHistoryItem | null>(null);
  const [history, setHistory] = useState<VideoHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // View States
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

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key.toLowerCase() === 't') {
        setIsCinemaMode(prev => !prev);
      }
      
      if (e.key.toLowerCase() === 'f') {
        if (!document.fullscreenElement) {
          containerRef.current?.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message}`);
          });
        } else {
          document.exitFullscreen();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const formatFocusTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const updateHistoryItem = useCallback((updates: Partial<VideoHistoryItem>) => {
    if (!currentVideo) return;
    const updated = { ...currentVideo, ...updates, lastPlayed: Date.now() };
    setCurrentVideo(updated);
    setHistory(prev => {
      const filtered = prev.filter(p => p.id !== updated.id);
      return [updated, ...filtered];
    });
  }, [currentVideo]);

  const handleRenameHistoryItem = (id: string, newTitle: string) => {
    setHistory(prev => prev.map(item => 
      item.id === id ? { ...item, title: newTitle } : item
    ));
    if (currentVideo?.id === id) {
      setCurrentVideo(prev => prev ? { ...prev, title: newTitle } : null);
    }
  };

  const handleVideoLoad = (url: string) => {
    const id = extractYoutubeId(url);
    if (!id) {
      setError("Enter a specific educational link to stay focused.");
      setCurrentVideo(null);
      return;
    }

    setError(null);
    const existing = history.find(h => extractYoutubeId(h.url) === id);
    const newItem: VideoHistoryItem = existing || {
      id: crypto.randomUUID(),
      url: `https://www.youtube.com/watch?v=${id}`,
      title: 'Deep Work Session',
      lastPlayed: Date.now(),
      progress: 0,
      duration: 0,
      completed: false,
      notes: ''
    };
    
    setCurrentVideo(newItem);
    setIsFocusing(true);
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVideoLoad(urlInput);
  };

  const activeVideoId = currentVideo ? extractYoutubeId(currentVideo.url) : null;

  return (
    <div ref={containerRef} className="h-screen w-screen bg-[#050507] text-zinc-100 flex overflow-hidden font-sans">
      {!isCinemaMode && (
        <div className="w-80 hidden lg:flex flex-col p-5 border-r border-white/5 bg-[#08080a] animate-in slide-in-from-left duration-300">
          <div className="mb-8 flex items-center gap-3 px-2">
            <div className="w-10 h-10 flex items-center justify-center shrink-0">
              <img src="/web-app-manifest-192x192.png" alt="YouTube" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold tracking-tight text-xl leading-none">YouTube</h1>
              <span className="text-[10px] text-purple-400 uppercase tracking-widest font-bold block mt-1">Premium Workspace</span>
            </div>
          </div>
          
          <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
                <Timer size={14} /> Focus Session
              </span>
              <span className="text-xs font-mono text-primary">{formatFocusTime(focusTime)}</span>
            </div>
            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-1000" 
                style={{ width: `${Math.min((focusTime / 1500) * 100, 100)}%` }}
              />
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <HistoryPanel 
              history={history}
              onSelect={(item) => {
                handleVideoLoad(item.url);
                setUrlInput(item.url);
              }}
              onDelete={(id) => {
                setHistory(prev => prev.filter(i => i.id !== id));
                if (currentVideo?.id === id) {
                  setCurrentVideo(null);
                  setIsFocusing(false);
                }
              }}
              onRename={handleRenameHistoryItem}
              onExport={() => {}}
              onImport={() => {}}
            />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col relative transition-all duration-300">
        <header className={`z-20 w-full p-4 flex justify-center border-b border-white/5 bg-black/20 backdrop-blur-md transition-all duration-300 ${isCinemaMode ? 'py-2 opacity-40 hover:opacity-100' : ''}`}>
          <form onSubmit={handleUrlSubmit} className="relative w-full max-w-2xl flex items-center gap-4">
            <div className="relative flex-1">
              <input 
                type="text" 
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Paste a specific lecture or tutorial link..."
                className="w-full bg-white/5 border border-white/10 text-zinc-100 pl-5 pr-14 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-white/10 transition-all text-sm"
              />
              <button 
                type="submit"
                className="absolute right-2 top-1.5 bottom-1.5 px-3 bg-zinc-800 hover:bg-primary text-zinc-400 hover:text-white rounded-xl transition-all flex items-center gap-2 group"
              >
                <span className="text-xs font-semibold hidden sm:inline">Focus</span>
                <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
            
            {activeVideoId && (
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsCinemaMode(!isCinemaMode)}
                  className={`p-2.5 rounded-xl border transition-all ${isCinemaMode ? 'bg-primary text-white border-primary' : 'bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10'}`}
                  title="Cinema Mode (T)"
                >
                  <Monitor size={18} />
                </button>
                <button 
                  onClick={() => containerRef.current?.requestFullscreen()}
                  className="p-2.5 bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10 rounded-xl transition-all"
                  title="Fullscreen (F)"
                >
                  <Maximize size={18} />
                </button>
              </div>
            )}

            {error && (
               <div className="absolute -bottom-6 left-0 text-red-400 text-[11px] font-medium flex items-center gap-1.5 px-2">
                  <AlertCircle size={12} />
                  {error}
               </div>
            )}
          </form>
        </header>

        <main className={`flex-1 flex gap-6 min-h-0 overflow-hidden transition-all duration-300 ${isCinemaMode ? 'p-0 gap-0' : 'p-6'}`}>
          <div className="flex-1 flex flex-col min-w-0 h-full">
            {activeVideoId ? (
              <div className={`relative w-full h-full bg-black overflow-hidden shadow-2xl transition-all duration-500 border-white/5 focus-glow group ${isCinemaMode ? 'rounded-0' : 'rounded-3xl border'}`}>
                <iframe
                  key={activeVideoId}
                  src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1&controls=1&modestbranding=1&rel=0`}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                
                {isCinemaMode && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <span className="px-4 py-2 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest text-white/50 border border-white/10">
                      Cinema Mode • Press T to exit
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/5 rounded-3xl bg-white/[0.02]">
                 <div className="w-24 h-24 mb-6 animate-pulse-subtle">
                   <img src="/web-app-manifest-512x512.png" alt="YouTube" className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]" />
                 </div>
                 <h2 className="text-2xl font-bold text-white mb-3">YouTube Intentionality</h2>
                 <p className="text-zinc-400 max-w-md mx-auto mb-8 text-sm leading-relaxed">
                   Turn the 10-day streak into a 10-day study sprint. Focus only on the content you searched for. No distractions, just learning.
                 </p>
              </div>
            )}
          </div>

          {!isCinemaMode && (
            <div className="w-[400px] hidden xl:flex flex-col h-full shrink-0 animate-in slide-in-from-right duration-300">
               <AIStudio 
                  currentTitle={currentVideo?.title || activeVideoId || ''} 
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