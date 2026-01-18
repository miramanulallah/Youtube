import React, { useState } from 'react';
import { VideoHistoryItem } from '../types';
import { PlayCircle, Trash2, Download, Upload, FileJson, Pencil, Check, X } from 'lucide-react';

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
    <div className="h-full flex flex-col glass-panel rounded-xl overflow-hidden">
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
        <h2 className="text-lg font-semibold text-white">Watch History</h2>
        <div className="flex gap-2">
          <button 
            onClick={onExport} 
            title="Export History"
            className="p-2 hover:bg-white/10 rounded-lg text-emerald-400 transition-colors"
          >
            <Download size={18} />
          </button>
          <label 
            title="Import History"
            className="p-2 hover:bg-white/10 rounded-lg text-blue-400 cursor-pointer transition-colors"
          >
            <Upload size={18} />
            <input type="file" accept=".json" onChange={onImport} className="hidden" />
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {history.length === 0 ? (
          <div className="text-center text-zinc-500 mt-10">
            <FileJson className="mx-auto mb-2 opacity-50" size={32} />
            <p className="text-sm">No history yet.</p>
          </div>
        ) : (
          history.map((item) => (
            <div 
              key={item.id} 
              className={`group relative bg-zinc-900/50 hover:bg-zinc-800 border transition-all cursor-pointer rounded-lg p-3 ${editingId === item.id ? 'border-primary ring-1 ring-primary/20 bg-zinc-800' : 'border-white/5 hover:border-primary/30'}`}
            >
              <div onClick={() => editingId !== item.id && onSelect(item)} className="flex items-start gap-3">
                <div className="mt-1 text-primary shrink-0">
                  <PlayCircle size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  {editingId === item.id ? (
                    <form onSubmit={handleSaveRename} className="flex items-center gap-1">
                      <input 
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Escape' && handleCancelRename()}
                        className="w-full bg-black/40 border border-white/10 rounded px-2 py-0.5 text-sm text-white focus:outline-none focus:border-primary"
                      />
                      <button type="submit" onClick={handleSaveRename} className="p-1 text-emerald-400 hover:text-emerald-300">
                        <Check size={14} />
                      </button>
                      <button type="button" onClick={handleCancelRename} className="p-1 text-zinc-500 hover:text-zinc-300">
                        <X size={14} />
                      </button>
                    </form>
                  ) : (
                    <h3 className="text-sm font-medium text-zinc-200 truncate pr-12">{item.title || item.url}</h3>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="h-1 flex-1 bg-zinc-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary" 
                        style={{ width: `${(item.progress / (item.duration || 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {Math.floor(item.progress / 60)}m
                    </span>
                  </div>
                </div>
              </div>
              
              {editingId !== item.id && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => startRename(e, item)}
                    className="p-1.5 bg-black/40 hover:bg-primary/20 text-zinc-400 hover:text-primary rounded-md transition-colors"
                    title="Rename"
                  >
                    <Pencil size={12} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                    className="p-1.5 bg-black/40 hover:bg-red-400/20 text-zinc-500 hover:text-red-400 rounded-md transition-colors"
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