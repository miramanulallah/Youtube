
import React, { useState, useRef, useEffect } from 'react';
import { generateStudyAid, quickChat, transcribeAudio } from '../services/geminiService';
import { Sparkles, BookOpen, ScrollText, Loader2, Target, Mic, Send, Bot, User } from 'lucide-react';
import { ChatMessage } from '../types';

interface AIStudioProps {
  currentTitle: string;
  notes: string;
  onNotesChange: (notes: string) => void;
}

export const AIStudio: React.FC<AIStudioProps> = ({ currentTitle, notes, onNotesChange }) => {
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [aiOutput, setAiOutput] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'notes' | 'ai' | 'chat'>('notes');
  const [isRecording, setIsRecording] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, activeTab, chatLoading]);

  const handleGenerate = async (mode: 'plan' | 'quiz' | 'summary') => {
    if (!currentTitle) return;
    setLoading(true);
    setActiveTab('ai');
    const result = await generateStudyAid(currentTitle, notes, mode);
    setAiOutput(result);
    setLoading(false);
  };

  const startRecording = async (target: 'notes' | 'chat') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        setIsTranscribing(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          const transcription = await transcribeAudio(base64Audio);
          if (transcription) {
            if (target === 'notes') {
              onNotesChange(notes + (notes ? " " : "") + transcription);
            } else {
              setChatInput(prev => prev + (prev ? " " : "") + transcription);
            }
          }
          setIsTranscribing(false);
        };
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error("Mic access denied", err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleChatSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatLoading(true);
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    
    try {
      const response = await quickChat(userMsg, `Context: Notes - ${notes}\nVideo - ${currentTitle}`);
      setChatHistory(prev => [...prev, { role: 'model', text: response }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0d0d0d] border-l border-white/5 overflow-hidden">
      <div className="p-5 border-b border-white/5 bg-white/[0.02] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 text-primary">
          <Target size={20} className="drop-shadow-[0_0_8px_rgba(225,0,255,0.4)]" />
          <h2 className="font-black text-white tracking-widest text-[11px] uppercase">AI Workspace</h2>
        </div>
        <div className="flex bg-black/50 rounded-lg p-0.5 border border-white/5">
          <button onClick={() => setActiveTab('notes')} className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all ${activeTab === 'notes' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>Draft</button>
          <button onClick={() => setActiveTab('ai')} className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all ${activeTab === 'ai' ? 'bg-primary/20 text-primary shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>Insights</button>
          <button onClick={() => setActiveTab('chat')} className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all ${activeTab === 'chat' ? 'bg-blue-500/20 text-blue-400 shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>Chat</button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 relative bg-black/40 overflow-hidden">
        {isTranscribing && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] bg-primary px-5 py-2.5 rounded-full shadow-[0_0_30px_rgba(225,0,255,0.3)] flex items-center gap-2.5 animate-bounce border border-white/10">
            <Loader2 size={14} className="animate-spin text-white" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white">Processing Audio...</span>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="flex-1 flex flex-col relative min-h-0">
            <textarea
              className="flex-1 bg-transparent p-8 text-sm text-zinc-300 focus:outline-none resize-none font-sans leading-relaxed placeholder:text-zinc-600 custom-scrollbar selection:bg-primary/20"
              placeholder="Synthesize your learning here..."
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
            />
            <div className="absolute bottom-8 right-8 flex flex-col items-center gap-4">
              {isRecording && (
                <div className="flex items-end gap-1.5 mb-3">
                  {[1,2,3,4,5,6].map(i => (
                    <div key={i} className="w-1.5 bg-primary animate-pulse rounded-full" style={{ height: `${Math.random() * 25 + 12}px`, animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
              )}
              <button 
                onClick={() => isRecording ? stopRecording() : startRecording('notes')}
                className={`p-5 rounded-full transition-all shadow-[0_0_25px_rgba(0,0,0,0.5)] ${isRecording ? 'bg-red-500 text-white scale-110 animate-pulse' : 'bg-primary text-white hover:scale-110 active:scale-95'}`}
              >
                <Mic size={24} />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-5">
                <Loader2 className="animate-spin text-primary" size={40} />
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Curating Insights...</span>
              </div>
            ) : aiOutput ? (
              <div className="prose prose-invert max-w-none text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap animate-fade-in border-l-2 border-primary/10 pl-6">{aiOutput}</div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full opacity-10 text-center scale-110">
                <Sparkles size={64} />
                <p className="mt-6 text-[11px] font-black uppercase tracking-[0.3em]">Neural Engine Active</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              {chatHistory.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full opacity-10 text-center">
                  <Bot size={64} />
                  <p className="mt-6 text-[11px] font-black uppercase tracking-[0.3em]">Knowledge Agent Ready</p>
                </div>
              )}
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex gap-4 animate-fade-in ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role === 'model' && <Bot size={20} className="text-blue-400 shrink-0 mt-1" />}
                  <div className={`max-w-[85%] p-5 rounded-3xl text-[13px] leading-relaxed shadow-lg ${msg.role === 'user' ? 'bg-primary/10 text-primary border border-primary/20 rounded-tr-none' : 'bg-white/5 text-zinc-300 border border-white/5 rounded-tl-none'}`}>
                    {msg.text}
                  </div>
                  {msg.role === 'user' && <User size={20} className="text-primary shrink-0 mt-1" />}
                </div>
              ))}
              {chatLoading && (
                <div className="flex gap-4 animate-pulse">
                  <Bot size={20} className="text-blue-400 shrink-0 mt-1" />
                  <div className="bg-white/5 text-zinc-500 p-4 rounded-3xl rounded-tl-none text-[10px] uppercase font-black tracking-widest border border-white/5 flex items-center gap-3">
                    <Loader2 size={14} className="animate-spin" /> Analyzing context...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleChatSubmit} className="p-5 bg-black border-t border-white/5 flex items-center gap-3 shrink-0">
              <div className="relative flex-1">
                <input 
                  disabled={chatLoading}
                  value={chatInput} 
                  onChange={e => setChatInput(e.target.value)} 
                  placeholder="Ask about the lesson..." 
                  className="w-full bg-[#121212] border border-white/10 rounded-full px-7 py-4 pr-14 text-sm text-white focus:outline-none focus:border-primary transition-all shadow-inner disabled:opacity-50" 
                />
                <button 
                  type="button"
                  onClick={() => isRecording ? stopRecording() : startRecording('chat')}
                  className={`absolute right-2.5 top-2 p-2.5 rounded-full transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse shadow-lg' : 'text-zinc-600 hover:text-primary'}`}
                >
                  <Mic size={20} />
                </button>
              </div>
              <button 
                type="submit" 
                disabled={chatLoading || !chatInput.trim()}
                className="p-4 bg-primary text-white rounded-full hover:scale-105 transition-all disabled:opacity-50 active:scale-95 shadow-[0_0_20px_rgba(225,0,255,0.3)]"
              >
                <Send size={22} />
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="p-5 border-t border-white/5 bg-white/[0.02] grid grid-cols-3 gap-4 shrink-0">
        <button onClick={() => handleGenerate('plan')} disabled={loading} className="flex flex-col items-center p-4 rounded-2xl bg-zinc-900/40 hover:bg-zinc-800 border border-white/5 transition-all group active:scale-95 shadow-lg">
          <BookOpen size={18} className="text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-[9px] uppercase font-black text-zinc-500 tracking-wider">Plan</span>
        </button>
        <button onClick={() => handleGenerate('quiz')} disabled={loading} className="flex flex-col items-center p-4 rounded-2xl bg-zinc-900/40 hover:bg-zinc-800 border border-white/5 transition-all group active:scale-95 shadow-lg">
          <Sparkles size={18} className="text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-[9px] uppercase font-black text-zinc-500 tracking-wider">Quiz</span>
        </button>
        <button onClick={() => handleGenerate('summary')} disabled={loading} className="flex flex-col items-center p-4 rounded-2xl bg-zinc-900/40 hover:bg-zinc-800 border border-white/5 transition-all group active:scale-95 shadow-lg">
          <ScrollText size={18} className="text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-[9px] uppercase font-black text-zinc-500 tracking-wider">Refine</span>
        </button>
      </div>
    </div>
  );
};
