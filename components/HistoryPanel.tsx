
import React, { useState } from 'react';
import { VideoHistoryItem, SidebarView } from '../types';
import { PlayCircle, Trash2, Download, Upload, FileJson, Pencil, Check, X, User, MoreVertical, Clock, History } from 'lucide-react';

interface HistoryPanelProps {
  history: VideoHistoryItem[];
  watchLater: VideoHistoryItem[];
  currentView: SidebarView;
  onViewChange: (view: SidebarView) => void;
  onSelect: (item: VideoHistoryItem) => void;
  onDelete: (id: string, isWatchLater: boolean) => void;
  onRename: (id: string, newTitle: string, isWatchLater: boolean) => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ 
  history, 
  watchLater,
  currentView,
  onViewChange,
  onSelect, 
  onDelete, 
  onRename,
  onExport, 
  onImport 
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showMenu, setShowMenu] = useState(false);

  const items = currentView === SidebarView.HISTORY ? history : watchLater;
  const isWatchLaterView = currentView === SidebarView.WATCH_LATER;

  const handleSaveRename = (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    if (editingId && editValue.trim()) {
      onRename(editingId, editValue.trim(), isWatchLaterView);
    }
    setEditingId(null);
  };

  return (
    <div className="h-full flex flex-col glass-panel rounded-xl overflow-hidden border border-white/5">
      {/* Header with overflow-visible to allow menu to pop out correctly */}
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5 relative z-50 overflow-visible">
        <div className="flex items-center gap-2 relative">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">
            {isWatchLaterView ? 'Watch Later' : 'Watch History'}
          </h2>
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)} 
              className="p-1 hover:bg-white/10 rounded-md text-zinc-500 transition-colors"
            >
              <MoreVertical size={16} />
            </button>
            {showMenu && (
              <div className="absolute left-0 mt-2 w-48 bg-zinc-900 border border-white/10 rounded-lg shadow-2xl z-[100] py-1 animate-fade-in ring-1 ring-white/10">
                <button 
                  onClick={() => { onViewChange(SidebarView.HISTORY); setShowMenu(false); }} 
                  className={`w-full text-left px-4 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-white/5 transition-colors ${!isWatchLaterView ? 'text-primary' : 'text-zinc-400'}`}
                >
                  <History size={14} /> Watch History
                </button>
                <button 
                  onClick={() => { onViewChange(SidebarView.WATCH_LATER); setShowMenu(false); }} 
                  className={`w-full text-left px-4 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-white/5 transition-colors ${isWatchLaterView ? 'text-primary' : 'text-zinc-400'}`}
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

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {items.length === 0 ? (
          <div className="text-center text-zinc-700 mt-10">
            <FileJson className="mx-auto mb-3 opacity-20" size={40} />
            <p className="text-xs font-medium uppercase tracking-widest">{isWatchLaterView ? 'No videos saved yet.' : 'No history yet.'}</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className={`group relative bg-white/[0.02] hover:bg-white/[0.05] border transition-all cursor-pointer rounded-xl overflow-hidden ${editingId === item.id ? 'border-primary ring-1 ring-primary/20 bg-zinc-800' : 'border-white/5'}`}>
              <div onClick={() => editingId !== item.id && onSelect(item)} className="flex gap-0">
                {item.thumbnailUrl && (
                  <div className="w-24 h-16 shrink-0 relative overflow-hidden bg-black border-r border-white/5">
                    <img src={item.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                    <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
                <div className="flex-1 min-w-0 p-3 flex flex-col justify-center">
                  {editingId === item.id ? (
                    <form onSubmit={handleSaveRename} className="flex items-center gap-1">
                      <input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white" />
                      <button type="submit" className="p-1 text-emerald-400"><Check size={14} /></button>
                    </form>
                  ) : (
                    <>
                      <h3 className="text-[11px] font-bold text-zinc-100 truncate mb-1 leading-tight">{item.title}</h3>
                      <div className="flex items-center gap-1.5">
                        <User size={8} className="text-zinc-500" />
                        <span className="text-[9px] text-zinc-500 font-medium truncate uppercase tracking-tighter">{item.author || 'YouTube'}</span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    {!isWatchLaterView && (
                      <div className="flex-1 h-0.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-primary/60" style={{ width: `${(item.progress / (item.duration || 1)) * 100}%` }} />
                      </div>
                    )}
                    <span className="text-[8px] px-1.5 py-0.5 bg-primary/10 border border-primary/20 text-primary rounded-sm font-bold uppercase tracking-tighter">
                      {isWatchLaterView ? 'Watch Later' : item.category || 'Focus'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); setEditingId(item.id); setEditValue(item.title); }} className="p-1.5 bg-black/60 text-zinc-400 hover:text-white rounded-md shadow-lg"><Pencil size={10} /></button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(item.id, isWatchLaterView); }} className="p-1.5 bg-black/60 text-zinc-400 hover:text-red-400 rounded-md shadow-lg"><Trash2 size={10} /></button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
