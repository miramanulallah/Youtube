export interface VideoHistoryItem {
  id: string;
  url: string;
  title: string;
  lastPlayed: number; // timestamp
  progress: number; // seconds
  duration: number; // seconds
  completed: boolean;
  notes: string;
}

export interface AIResponse {
  type: 'summary' | 'quiz' | 'plan';
  content: string;
}

export enum TabView {
  PLAYER = 'PLAYER',
  HISTORY = 'HISTORY',
  AI_STUDIO = 'AI_STUDIO',
}
