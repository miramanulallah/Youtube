
import React, { useState } from 'react';
import { VideoHistoryItem, SidebarView, Playlist } from '../types';
import { PlayCircle, Trash2, Download, Upload, FileJson, Pencil, Check, X, User, MoreVertical, Clock, History, ListMusic, Plus, FolderPlus } from 'lucide-react';

interface HistoryPanelProps {
  history: VideoHistoryItem[];
  watchLater: VideoHistoryItem[];
  playlists: Playlist[];
  currentView: SidebarView;
  onViewChange: (view: SidebarView) => void;
  onSelect: (item: VideoHistoryItem) => void;
  onDelete: (id: string, isWatchLater: boolean) => void;
  onRename: (id: string, newTitle: string, isWatchLater: boolean) => void;
  onCreatePlaylist: (name: string) => void;
  onDeletePlaylist: (id: string) => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const extractYoutubeId = (url: string): string | null => {
  if (!url) return null;
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ 
  history, 
  watchLater,
  playlists,
  currentView,
  onViewChange,
  onSelect, 
  onDelete, 
  onRename,
  onCreatePlaylist,
  onDeletePlaylist,
  onExport, 
  onImport 
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

  const isWatchLaterView = currentView === SidebarView.WATCH_LATER;
  const isHistoryView = currentView === SidebarView.HISTORY;
  
  // Resolve items based on selected view
  let items: VideoHistoryItem[] = [];
  if (isHistoryView) {
    items = history;
  } else if (isWatchLaterView) {
    if (selectedPlaylistId) {
      const playlist = playlists.find(p => p.id === selectedPlaylistId);
      if (playlist) {
        // Filter combined list to find videos in this playlist
        const combined = [...history, ...watchLater];
        items = playlist.videoIds.map(vidId => combined.find(v => extractYoutubeId(v.url) === vidId)).filter(Boolean) as VideoHistoryItem[];
      }
    } else {
      items = watchLater;
    }
  }

  const handleSaveRename = (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    if (editingId && editValue.trim()) {
      onRename(editingId, editValue.trim(), isWatchLaterView);
    }
    setEditingId(null);
  };

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlaylistName.trim()) {
      onCreatePlaylist(newPlaylistName.trim());
      setNewPlaylistName("");
      setIsCreatingPlaylist(false);
    }
  };

  return (
    <div className="h-full flex flex-col glass-panel rounded-xl border border-white/5 relative overflow-visible">
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5 relative z-50 rounded-t-xl overflow-visible">
        <div className="flex items-center gap-2 relative overflow-visible">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">
            {selectedPlaylistId ? playlists.find(p => p.id === selectedPlaylistId)?.name : (isWatchLaterView ? 'Watch Later' : 'Watch History')}
          </h2>
          <div className="relative overflow-visible">
            <button 
              onClick={() => setShowMenu(!showMenu)} 
              className="p-1 hover:bg-white/10 rounded-md text-zinc-500 transition-colors"
            >
              <MoreVertical size={16} />
            </button>
            {showMenu && (
              <div 
                className="absolute left-0 mt-2 w-48 bg-[#181818] border border-white/10 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[200] py-1 animate-fade-in ring-1 ring-white/10"
              >
                <button 
                  onClick={() => { onViewChange(SidebarView.HISTORY); setSelectedPlaylistId(null); setShowMenu(false); }} 
                  className={`w-full text-left px-4 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-white/5 transition-colors ${isHistoryView && !selectedPlaylistId ? 'text-primary' : 'text-zinc-400'}`}
                >
                  <History size={14} /> Watch History
                </button>
                <button 
                  onClick={() => { onViewChange(SidebarView.WATCH_LATER); setSelectedPlaylistId(null); setShowMenu(false); }} 
                  className={`w-full text-left px-4 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-white/5 transition-colors ${isWatchLaterView && !selectedPlaylistId ? 'text-primary' : 'text-zinc-400'}`}
                >
                  <Clock size={14} /> Watch Later
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={onExport} title="Export Data" className="p-1.5 hover:bg-white/10 rounded-md text-zinc-500 hover:text-emerald-400 transition-colors"><Download size={16} /></button>
          <label title="Import Data" className="p-1.5 hover:bg-white/10 rounded-md text-zinc-500 hover:text-blue-400 cursor-pointer transition-colors">
            <Upload size={16} /><input type="file" accept=".json" onChange={onImport} className="hidden" />
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 rounded-b-xl custom-scrollbar">
        {isWatchLaterView && !selectedPlaylistId && (
          <div className="mb-6 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <ListMusic size={12} className="text-primary" /> Playlists
              </span>
              <button onClick={() => setIsCreatingPlaylist(!isCreatingPlaylist)} className="p-1 bg-white/5 hover:bg-primary/20 text-zinc-400 hover:text-primary rounded-md transition-all">
                <Plus size={14} />
              </button>
            </div>
            
            {isCreatingPlaylist && (
              <form onSubmit={handleCreatePlaylist} className="flex gap-1 animate-fade-in px-1">
                <input autoFocus value={newPlaylistName} onChange={(e) => setNewPlaylistName(e.target.value)} placeholder="New playlist name..." className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary" />
                <button type="submit" className="p-2 bg-primary text-white rounded"><Check size={14} /></button>
                <button type="button" onClick={() => setIsCreatingPlaylist(false)} className="p-2 bg-white/5 text-zinc-500 rounded"><X size={14} /></button>
              </form>
            )}

            <div className="grid grid-cols-1 gap-2">
              {playlists.map(p => (
                <div key={p.id} className="group flex items-center gap-2 bg-white/5 border border-white/5 p-3 rounded-xl hover:border-primary/30 transition-all cursor-pointer" onClick={() => { setSelectedPlaylistId(p.id); onViewChange(SidebarView.WATCH_LATER); }}>
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                    <ListMusic size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-zinc-200 truncate">{p.name}</div>
                    <div className="text-[9px] text-zinc-500">{p.videoIds.length} videos</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); onDeletePlaylist(p.id); }} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 rounded-md transition-all">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedPlaylistId && (
          <button onClick={() => setSelectedPlaylistId(null)} className="flex items-center gap-2 text-[10px] font-bold text-primary mb-2 hover:underline">
            ← Back to Watch Later
          </button>
        )}

        <div className="space-y-4">
          <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Videos</div>
          {items.length === 0 ? (
            <div className="text-center text-zinc-700 py-10">
              <FileJson className="mx-auto mb-3 opacity-20" size={40} />
              <p className="text-xs font-medium uppercase tracking-widest">No videos in this section.</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className={`group relative bg-white/[0.02] hover:bg-white/[0.05] border transition-all cursor-pointer rounded-xl overflow-hidden ${editingId === item.id ? 'border-primary ring-1 ring-primary/20 bg-zinc-800' : 'border-white/5'}`}>
                <div onClick={() => editingId !== item.id && onSelect(item)} className="flex gap-0 min-h-[5rem]">
                  {item.thumbnailUrl && (
                    <div className="w-24 shrink-0 relative overflow-hidden bg-black border-r border-white/5">
                      <img src={item.thumbnailUrl} className="w-full h-full object-cover" alt={item.title} />
                      <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 p-3 flex flex-col justify-center">
                    {editingId === item.id ? (
                      <form onSubmit={handleSaveRename} className="flex items-center gap-1">
                        <input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-primary" />
                        <button type="submit" className="p-1 text-emerald-400"><Check size={14} /></button>
                      </form>
                    ) : (
                      <>
                        <h3 className="text-[11px] font-bold text-zinc-100 truncate mb-1 leading-tight group-hover:text-primary transition-colors">{item.title}</h3>
                        <div className="flex items-center gap-1.5">
                          <User size={8} className="text-zinc-500" />
                          <span className="text-[9px] text-zinc-500 font-medium truncate uppercase tracking-tighter">{item.author || 'YouTube'}</span>
                        </div>
                      </>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      {!isWatchLaterView && item.duration > 0 && (
                        <div className="flex-1 h-0.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-primary/60" style={{ width: `${(item.progress / item.duration) * 100}%` }} />
                        </div>
                      )}
                      <span className="text-[8px] px-1.5 py-0.5 bg-primary/10 border border-primary/20 text-primary rounded-sm font-bold uppercase tracking-tighter">
                        {isWatchLaterView ? 'Watch Later' : (item.category || 'Session')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button onClick={(e) => { e.stopPropagation(); setEditingId(item.id); setEditValue(item.title); }} className="p-1.5 bg-black/60 text-zinc-400 hover:text-white rounded-md shadow-lg"><Pencil size={10} /></button>
                  <button onClick={(e) => { e.stopPropagation(); onDelete(item.id, isWatchLaterView); }} className="p-1.5 bg-black/60 text-zinc-400 hover:text-red-400 rounded-md shadow-lg"><Trash2 size={10} /></button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      {showMenu && <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowMenu(false)} />}
    </div>
  );
};
