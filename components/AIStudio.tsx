import React, { useState } from 'react';
import { generateStudyAid } from '../services/geminiService';
import { Brain, Sparkles, BookOpen, ScrollText, Loader2, Save } from 'lucide-react';

interface AIStudioProps {
  currentTitle: string;
  notes: string;
  onNotesChange: (notes: string) => void;
}

export const AIStudio: React.FC<AIStudioProps> = ({ currentTitle, notes, onNotesChange }) => {
  const [loading, setLoading] = useState(false);
  const [aiOutput, setAiOutput] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'notes' | 'ai'>('notes');

  const handleGenerate = async (mode: 'plan' | 'quiz' | 'summary') => {
    if (!currentTitle) return;
    setLoading(true);
    setActiveTab('ai');
    const result = await generateStudyAid(currentTitle, notes, mode);
    setAiOutput(result);
    setLoading(false);
  };

  return (
    <div className="h-full flex flex-col glass-panel rounded-3xl overflow-hidden shadow-2xl border border-white/5">
      <div className="p-5 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-indigo-500/10 rounded-lg">
            <Brain size={18} className="text-indigo-400" />
          </div>
          <h2 className="font-bold text-white tracking-tight">AI Synthesis</h2>
        </div>
        <div className="flex bg-black/40 rounded-xl p-1 border border-white/5">
          <button 
            onClick={() => setActiveTab('notes')}
            className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'notes' ? 'bg-zinc-700 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Draft
          </button>
          <button 
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'ai' ? 'bg-indigo-600/50 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Insights
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {activeTab === 'notes' ? (
          <div className="flex-1 relative">
            <textarea
              className="w-full h-full bg-transparent p-6 text-sm text-zinc-300 focus:outline-none resize-none font-sans leading-relaxed placeholder:text-zinc-700"
              placeholder="Take notes here as you watch. Use keywords and timestamps..."
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
            />
            <div className="absolute bottom-4 right-4 text-[10px] text-zinc-600 flex items-center gap-1">
               <Save size={10} /> Auto-saving to local storage
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 bg-black/20">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-4">
                <Loader2 className="animate-spin text-primary" size={40} />
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] animate-pulse">Gemini analyzing session...</span>
              </div>
            ) : aiOutput ? (
              <div className="prose prose-invert max-w-none">
                 <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-300 leading-relaxed border-none bg-transparent p-0 m-0">
                   {aiOutput}
                 </pre>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-zinc-600 text-center px-10">
                <Sparkles size={32} className="mb-4 opacity-20" />
                <p className="text-xs font-medium uppercase tracking-widest leading-loose">
                  Select a synthesizer tool below to process your session
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-5 border-t border-white/5 bg-white/[0.02] grid grid-cols-3 gap-3">
        <button 
          onClick={() => handleGenerate('plan')}
          disabled={!currentTitle || loading}
          className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl bg-zinc-900/50 hover:bg-zinc-800 disabled:opacity-30 transition-all border border-white/5 hover:border-primary/50 group"
        >
          <BookOpen size={18} className="text-emerald-400 group-hover:scale-110 transition-transform" />
          <span className="text-[9px] uppercase font-bold tracking-[0.15em] text-zinc-500">Plan</span>
        </button>
        <button 
          onClick={() => handleGenerate('quiz')}
          disabled={!currentTitle || loading}
          className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl bg-zinc-900/50 hover:bg-zinc-800 disabled:opacity-30 transition-all border border-white/5 hover:border-accent/50 group"
        >
          <Sparkles size={18} className="text-amber-400 group-hover:scale-110 transition-transform" />
          <span className="text-[9px] uppercase font-bold tracking-[0.15em] text-zinc-500">Quiz</span>
        </button>
        <button 
          onClick={() => handleGenerate('summary')}
          disabled={!currentTitle || loading}
          className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl bg-zinc-900/50 hover:bg-zinc-800 disabled:opacity-30 transition-all border border-white/5 hover:border-indigo-400/50 group"
        >
          <ScrollText size={18} className="text-blue-400 group-hover:scale-110 transition-transform" />
          <span className="text-[9px] uppercase font-bold tracking-[0.15em] text-zinc-500">Refine</span>
        </button>
      </div>
    </div>
  );
};