
import React, { useState } from 'react';
import { VideoHistoryItem, SidebarView, Playlist } from '../types';
import { Trash2, Download, Upload, FileJson, Pencil, User, MoreVertical, Clock, History, ListMusic, Plus, X, ListOrdered } from 'lucide-react';

interface HistoryPanelProps {
  history: VideoHistoryItem[];
  watchLater: VideoHistoryItem[];
  playlists: Playlist[];
  queues: Playlist[];
  currentView: SidebarView;
  onViewChange: (view: SidebarView) => void;
  onSelect: (item: VideoHistoryItem) => void;
  onDelete: (id: string, isWatchLater: boolean) => void;
  onRename: (id: string, newTitle: string, isWatchLater: boolean) => void;
  onCreatePlaylist: (name: string) => void;
  onDeletePlaylist: (id: string) => void;
  onDeleteQueue: (id: string) => void;
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
  history, watchLater, playlists, queues, currentView, onViewChange, onSelect, onDelete, onRename,
  onCreatePlaylist, onDeletePlaylist, onDeleteQueue, onExport, onImport 
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

  const isWatchLaterView = currentView === SidebarView.WATCH_LATER;
  const isHistoryView = currentView === SidebarView.HISTORY;
  const isQueueView = currentView === SidebarView.QUEUE;
  const isPlaylistsView = currentView === SidebarView.PLAYLISTS;
  
  let items: VideoHistoryItem[] = [];
  if (isHistoryView) {
    items = history;
  } else if (isWatchLaterView) {
    items = watchLater;
  } else if (isQueueView || isPlaylistsView) {
    if (selectedPlaylistId) {
      const activePlaylists = isQueueView ? queues : playlists;
      const playlist = activePlaylists.find(p => p.id === selectedPlaylistId);
      if (playlist) {
        const combined = [...history, ...watchLater];
        items = playlist.videoIds.map(vidId => combined.find(v => extractYoutubeId(v.url) === vidId)).filter(Boolean) as VideoHistoryItem[];
      }
    }
  }

  const handleSaveRename = () => {
    if (editingId && editValue.trim()) {
      onRename(editingId, editValue.trim(), isWatchLaterView);
    }
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveRename();
    if (e.key === 'Escape') setEditingId(null);
  };

  const renderViewTitle = () => {
    if (selectedPlaylistId) {
      const p = [...playlists, ...queues].find(x => x.id === selectedPlaylistId);
      return p?.name || 'Playlist';
    }
    switch(currentView) {
      case SidebarView.HISTORY: return 'History';
      case SidebarView.WATCH_LATER: return 'Watch Later';
      case SidebarView.QUEUE: return 'Queue';
      case SidebarView.PLAYLISTS: return 'Playlists';
      default: return 'Workspace';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0f0f0f] rounded-xl border border-white/5 overflow-hidden">
      <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5 shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            {renderViewTitle()}
          </h2>
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-1 hover:bg-white/10 rounded-md text-zinc-500 transition-colors"><MoreVertical size={14} /></button>
            {showMenu && (
              <div className="absolute left-0 mt-2 w-48 bg-[#181818] border border-white/10 rounded-xl shadow-2xl py-1 z-[200] animate-fade-in">
                <button onClick={() => { onViewChange(SidebarView.HISTORY); setSelectedPlaylistId(null); setShowMenu(false); }} className={`w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-white/5 ${isHistoryView ? 'text-primary' : 'text-zinc-400'}`}><History size={14} /> History</button>
                <button onClick={() => { onViewChange(SidebarView.WATCH_LATER); setSelectedPlaylistId(null); setShowMenu(false); }} className={`w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-white/5 ${isWatchLaterView ? 'text-primary' : 'text-zinc-400'}`}><Clock size={14} /> Watch Later</button>
                <button onClick={() => { onViewChange(SidebarView.QUEUE); setSelectedPlaylistId(null); setShowMenu(false); }} className={`w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-white/5 ${isQueueView ? 'text-primary' : 'text-zinc-400'}`}><ListOrdered size={14} /> Queue</button>
                <button onClick={() => { onViewChange(SidebarView.PLAYLISTS); setSelectedPlaylistId(null); setShowMenu(false); }} className={`w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-white/5 ${isPlaylistsView ? 'text-primary' : 'text-zinc-400'}`}><ListMusic size={14} /> Playlists</button>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={onExport} className="p-1.5 hover:bg-white/5 rounded-md text-zinc-500 transition-colors"><Download size={14} /></button>
          <label className="p-1.5 hover:bg-white/5 rounded-md text-zinc-500 cursor-pointer transition-colors"><Upload size={14} /><input type="file" accept=".json" onChange={onImport} className="hidden" /></label>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {((isPlaylistsView || isQueueView) && !selectedPlaylistId) && (
          <div className="mb-6 space-y-3 shrink-0">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                {isQueueView ? <ListOrdered size={12} className="text-primary" /> : <ListMusic size={12} className="text-primary" />} 
                {isQueueView ? 'Queue Lists' : 'Playlists'}
              </span>
              {!isQueueView && (
                <button onClick={() => setIsCreatingPlaylist(!isCreatingPlaylist)} className="p-1 bg-white/5 hover:bg-primary/20 rounded-md text-zinc-400 hover:text-primary transition-all"><Plus size={14} /></button>
              )}
            </div>
            
            {isCreatingPlaylist && (
              <div className="flex gap-1 animate-fade-in">
                <input autoFocus value={newPlaylistName} onChange={(e) => setNewPlaylistName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (onCreatePlaylist(newPlaylistName), setIsCreatingPlaylist(false), setNewPlaylistName(""))} placeholder="Playlist name..." className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:border-primary outline-none" />
                <button onClick={() => setIsCreatingPlaylist(false)} className="p-2 bg-white/5 text-zinc-500 rounded"><X size={14} /></button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2">
              {(isQueueView ? queues : playlists).map(p => (
                <div key={p.id} onClick={() => setSelectedPlaylistId(p.id)} className="group flex items-center gap-3 bg-white/5 border border-white/5 p-3 rounded-xl hover:border-primary/20 transition-all cursor-pointer">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                    {isQueueView ? <ListOrdered size={20} /> : <ListMusic size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-zinc-200 truncate">{p.name}</div>
                    <div className="text-[9px] text-zinc-500 uppercase">{p.videoIds.length} videos</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); isQueueView ? onDeleteQueue(p.id) : onDeletePlaylist(p.id); }} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 transition-all"><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedPlaylistId && (
          <button onClick={() => setSelectedPlaylistId(null)} className="text-[10px] font-bold text-primary mb-4 hover:underline block shrink-0">← Back to collections</button>
        )}

        <div className="space-y-3">
          {(!isPlaylistsView && !isQueueView || selectedPlaylistId) && items.length === 0 ? (
            <div className="text-center text-zinc-700 py-10"><FileJson className="mx-auto mb-2 opacity-10" size={32} /><p className="text-[10px] font-bold uppercase tracking-widest">Empty Workspace</p></div>
          ) : items.map((item) => (
            <div key={item.id} className={`group relative bg-white/[0.02] hover:bg-white/[0.04] border rounded-xl overflow-hidden transition-all ${editingId === item.id ? 'border-primary ring-1 ring-primary/20' : 'border-white/5'}`}>
              <div onClick={() => editingId !== item.id && onSelect(item)} className="flex gap-0 min-h-[5rem] cursor-pointer">
                {item.thumbnailUrl && (
                  <div className="w-24 shrink-0 bg-black overflow-hidden relative border-r border-white/5">
                    <img src={item.thumbnailUrl} className="w-full h-full object-cover" alt={item.title} />
                    <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
                <div className="flex-1 min-w-0 p-3 flex flex-col justify-center">
                  {editingId === item.id ? (
                    <input 
                      autoFocus 
                      value={editValue} 
                      onChange={(e) => setEditValue(e.target.value)} 
                      onBlur={handleSaveRename}
                      onKeyDown={handleKeyDown}
                      className="w-full bg-black/60 border border-primary/40 rounded px-2 py-1 text-xs text-white focus:outline-none" 
                    />
                  ) : (
                    <>
                      <h3 className="text-[11px] font-bold text-zinc-100 truncate mb-1 leading-tight group-hover:text-primary transition-colors">{item.title}</h3>
                      <div className="flex items-center gap-1.5 text-zinc-500">
                        <User size={8} />
                        <span className="text-[9px] font-medium truncate uppercase tracking-tighter">{item.author || 'YouTube'}</span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[8px] px-1.5 py-0.5 bg-primary/5 border border-primary/10 text-primary rounded-sm font-bold uppercase tracking-tight">
                      {isWatchLaterView ? 'Watch Later' : (item.category || 'Session')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); setEditingId(item.id); setEditValue(item.title); }} className="p-1.5 bg-black/80 text-zinc-400 hover:text-white rounded-md"><Pencil size={10} /></button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(item.id, isWatchLaterView); }} className="p-1.5 bg-black/80 text-zinc-400 hover:text-red-500 rounded-md"><Trash2 size={10} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {showMenu && <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />}
    </div>
  );
};
