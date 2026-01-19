
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
  }, [chatHistory, activeTab]);

  const handleGenerate = async (mode: 'plan' | 'quiz' | 'summary') => {
    if (!currentTitle) return;
    setLoading(true);
    setActiveTab('ai');
    const result = await generateStudyAid(currentTitle, notes, mode);
    setAiOutput(result);
    setLoading(false);
  };

  const handleMicToggle = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        audioChunksRef.current = [];
        recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
        recorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];
            const transcription = await transcribeAudio(base64Audio);
            if (transcription) onNotesChange(notes + (notes ? " " : "") + transcription);
          };
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
      } catch (err) {
        console.error("Mic access denied", err);
      }
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="h-full flex flex-col bg-[#121212] border-l border-white/5 overflow-hidden">
      <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-primary">
          <Target size={18} />
          <h2 className="font-bold text-white tracking-tight text-sm uppercase">AI Workspace</h2>
        </div>
        <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/5">
          <button onClick={() => setActiveTab('notes')} className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${activeTab === 'notes' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Draft</button>
          <button onClick={() => setActiveTab('ai')} className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${activeTab === 'ai' ? 'bg-primary/20 text-primary' : 'text-zinc-500 hover:text-zinc-300'}`}>Insights</button>
          <button onClick={() => setActiveTab('chat')} className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${activeTab === 'chat' ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}>Chat</button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden bg-black/20">
        {activeTab === 'notes' && (
          <div className="flex-1 flex flex-col relative">
            <textarea
              className="flex-1 bg-transparent p-6 text-sm text-zinc-300 focus:outline-none resize-none font-sans leading-relaxed placeholder:text-zinc-600"
              placeholder="Start drafting your synthesis..."
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
            />
            <button 
              onClick={handleMicToggle}
              className={`absolute bottom-6 right-6 p-4 rounded-full transition-all shadow-xl ${isRecording ? 'bg-red-500 animate-pulse text-white scale-110' : 'bg-primary text-white hover:scale-105'}`}
            >
              <Mic size={20} />
            </button>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <Loader2 className="animate-spin text-primary" size={32} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Synthesizing...</span>
              </div>
            ) : aiOutput ? (
              <div className="prose prose-invert max-w-none text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap animate-fade-in">{aiOutput}</div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full opacity-20 text-center"><Sparkles size={48} /><p className="mt-4 text-[10px] font-bold uppercase tracking-widest">Select a synthesizer</p></div>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {chatHistory.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full opacity-20 text-center">
                  <Bot size={48} />
                  <p className="mt-4 text-[10px] font-bold uppercase tracking-widest">Assistant Ready</p>
                </div>
              )}
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex gap-3 animate-fade-in ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role === 'model' && <Bot size={16} className="text-blue-400 shrink-0 mt-1" />}
                  <div className={`max-w-[85%] p-4 rounded-2xl text-[13px] leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-primary/10 text-primary border border-primary/20 rounded-tr-none' : 'bg-white/5 text-zinc-300 border border-white/5 rounded-tl-none'}`}>
                    {msg.text}
                  </div>
                  {msg.role === 'user' && <User size={16} className="text-primary shrink-0 mt-1" />}
                </div>
              ))}
              {chatLoading && (
                <div className="flex gap-3 animate-pulse">
                  <Bot size={16} className="text-blue-400 shrink-0 mt-1" />
                  <div className="bg-white/5 text-zinc-500 p-3 rounded-2xl rounded-tl-none text-[10px] uppercase font-bold tracking-widest border border-white/5 flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin" /> Assistant is thinking...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleChatSubmit} className="p-4 bg-[#0f0f0f] border-t border-white/5 flex gap-2 shrink-0">
              <input 
                disabled={chatLoading}
                value={chatInput} 
                onChange={e => setChatInput(e.target.value)} 
                placeholder="Ask about the content..." 
                className="flex-1 bg-black/40 border border-white/10 rounded-full px-5 py-3 text-sm text-white focus:outline-none focus:border-primary transition-colors disabled:opacity-50" 
              />
              <button 
                type="submit" 
                disabled={chatLoading || !chatInput.trim()}
                className="p-3 bg-primary text-white rounded-full hover:scale-105 transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-primary/20"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/5 bg-white/[0.02] grid grid-cols-3 gap-3 shrink-0">
        <button onClick={() => handleGenerate('plan')} disabled={loading} className="flex flex-col items-center p-3 rounded-xl bg-zinc-900/50 hover:bg-zinc-800 border border-white/5 transition-all group active:scale-95">
          <BookOpen size={16} className="text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
          <span className="text-[8px] uppercase font-bold text-zinc-500">Plan</span>
        </button>
        <button onClick={() => handleGenerate('quiz')} disabled={loading} className="flex flex-col items-center p-3 rounded-xl bg-zinc-900/50 hover:bg-zinc-800 border border-white/5 transition-all group active:scale-95">
          <Sparkles size={16} className="text-amber-400 mb-1 group-hover:scale-110 transition-transform" />
          <span className="text-[8px] uppercase font-bold text-zinc-500">Quiz</span>
        </button>
        <button onClick={() => handleGenerate('summary')} disabled={loading} className="flex flex-col items-center p-3 rounded-xl bg-zinc-900/50 hover:bg-zinc-800 border border-white/5 transition-all group active:scale-95">
          <ScrollText size={16} className="text-blue-400 mb-1 group-hover:scale-110 transition-transform" />
          <span className="text-[8px] uppercase font-bold text-zinc-500">Refine</span>
        </button>
      </div>
    </div>
  );
};
