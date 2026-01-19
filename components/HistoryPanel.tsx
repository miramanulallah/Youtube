
import React, { useState } from 'react';
import { VideoHistoryItem } from '../types';
import { PlayCircle, Trash2, Download, Upload, FileJson, Pencil, Check, X, User } from 'lucide-react';

interface HistoryPanelProps {
  history: VideoHistoryItem[];
  onSelect: (item: VideoHistoryItem) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ 
  history, 
  onSelect, 
  onDelete, 
  onRename,
  onExport, 
  onImport 
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const startRename = (e: React.MouseEvent, item: VideoHistoryItem) => {
    e.stopPropagation();
    setEditingId(item.id);
    setEditValue(item.title);
  };

  const handleSaveRename = (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    if (editingId && editValue.trim()) {
      onRename(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  const handleCancelRename = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingId(null);
  };

  return (
    <div className="h-full flex flex-col glass-panel rounded-xl overflow-hidden border border-white/5">
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Watch History</h2>
        <div className="flex gap-1">
          <button 
            onClick={onExport} 
            title="Export History"
            className="p-1.5 hover:bg-white/10 rounded-md text-zinc-500 hover:text-emerald-400 transition-colors"
          >
            <Download size={16} />
          </button>
          <label 
            title="Import History"
            className="p-1.5 hover:bg-white/10 rounded-md text-zinc-500 hover:text-blue-400 cursor-pointer transition-colors"
          >
            <Upload size={16} />
            <input type="file" accept=".json" onChange={onImport} className="hidden" />
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {history.length === 0 ? (
          <div className="text-center text-zinc-700 mt-10">
            <FileJson className="mx-auto mb-3 opacity-20" size={40} />
            <p className="text-xs font-medium uppercase tracking-widest">No history yet.</p>
          </div>
        ) : (
          history.map((item) => (
            <div 
              key={item.id} 
              className={`group relative bg-white/[0.02] hover:bg-white/[0.05] border transition-all cursor-pointer rounded-xl p-4 ${editingId === item.id ? 'border-primary ring-1 ring-primary/20 bg-zinc-800' : 'border-white/5'}`}
            >
              <div onClick={() => editingId !== item.id && onSelect(item)} className="flex items-start gap-3">
                <div className="mt-1 text-primary/60 shrink-0">
                  <PlayCircle size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  {editingId === item.id ? (
                    <form onSubmit={handleSaveRename} className="flex items-center gap-1">
                      <input 
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Escape' && handleCancelRename()}
                        className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-primary"
                      />
                      <button type="submit" onClick={handleSaveRename} className="p-1 text-emerald-400 hover:text-emerald-300">
                        <Check size={14} />
                      </button>
                      <button type="button" onClick={handleCancelRename} className="p-1 text-zinc-500 hover:text-zinc-300">
                        <X size={14} />
                      </button>
                    </form>
                  ) : (
                    <>
                      <h3 className="text-sm font-bold text-zinc-100 truncate pr-14 leading-tight mb-1">{item.title}</h3>
                      {item.author && (
                        <div className="flex items-center gap-1.5 mb-2">
                           <User size={10} className="text-zinc-500" />
                           <span className="text-[10px] text-zinc-500 font-medium truncate">{item.author}</span>
                        </div>
                      )}
                    </>
                  )}
                  
                  <div className="flex items-center justify-between gap-3 mt-1">
                    <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary/60 shadow-[0_0_8px_rgba(225,0,255,0.4)]" 
                        style={{ width: `${(item.progress / (item.duration || 1)) * 100}%` }}
                      />
                    </div>
                    {item.category && (
                      <span className="text-[9px] px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary rounded-full font-bold uppercase tracking-tighter shrink-0">
                        {item.category}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {editingId !== item.id && (
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => startRename(e, item)}
                    className="p-1.5 bg-black/60 hover:bg-primary/20 text-zinc-500 hover:text-primary rounded-lg transition-colors"
                    title="Rename"
                  >
                    <Pencil size={12} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                    className="p-1.5 bg-black/60 hover:bg-red-400/20 text-zinc-500 hover:text-red-400 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
