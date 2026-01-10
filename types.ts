
export interface Highlight {
  text: string;
  ipa?: string;
  meaning: string;
  example: string; // 新增例句欄位
  type: 'word' | 'phrase';
}

export interface DialogueSegment {
  speaker: string;
  english: string;
  chinese: string;
  highlights: Highlight[];
}

export interface TranscriptLine {
  id: string;
  startTime: number;
  timestamp: string;
  segments: DialogueSegment[];
}

export interface HistoryItem {
  id: string;
  name: string;
  createdAt: number;
  audioUrl: string; 
  transcript: string;
  lines: TranscriptLine[];
}

export interface AppState {
  history: HistoryItem[];
  currentItem: HistoryItem | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}
