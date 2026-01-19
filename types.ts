
export interface VideoHistoryItem {
  id: string;
  url: string;
  title: string;
  author?: string; // Channel name
  thumbnailUrl?: string;
  lastPlayed: number; // timestamp
  progress: number; // seconds
  duration: number; // seconds
  completed: boolean;
  notes: string;
  category?: string; // AI categorized intent
}

export interface Playlist {
  id: string;
  name: string;
  videoIds: string[]; // List of YouTube IDs
}

export interface ChatMessage {
  role: 'user' | 'model' | 'thought';
  text: string;
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

export enum SidebarView {
  HISTORY = 'HISTORY',
  WATCH_LATER = 'WATCH_LATER',
  PLAYLISTS = 'PLAYLISTS',
}
