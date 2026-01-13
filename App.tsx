
import React, { useState, useEffect, useCallback, useRef } from 'react';
import AudioPlayer from './components/AudioPlayer';
import TranscriptViewer from './components/TranscriptViewer';
import VocabSidebar from './components/VocabSidebar';
import HistoryList from './components/HistoryList';
import ImportDialog from './components/ImportDialog';
import { HistoryItem, Highlight } from './types';
import { getAllItems, deleteItem as deleteFromDB, saveItem } from './services/storageService';
import { lookupVocabulary } from './services/aiService';
import { formatTime } from './utils';

const App: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeItem, setActiveItem] = useState<HistoryItem | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [readingIndex, setReadingIndex] = useState(0);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('dark-mode');
    return saved ? JSON.parse(saved) : false;
  });

  const [vocabularyList, setVocabularyList] = useState<Highlight[]>([]);
  const [isLookupLoading, setIsLookupLoading] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const historyRef = useRef<HistoryItem[]>([]);

  useEffect(() => { historyRef.current = history; }, [history]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('dark-mode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    const savedVocab = localStorage.getItem('my-vocabulary');
    if (savedVocab) {
      try {
        setVocabularyList(JSON.parse(savedVocab));
      } catch (err) {
        console.error("Failed to parse vocabulary from localStorage", err);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('my-vocabulary', JSON.stringify(vocabularyList));
  }, [vocabularyList]);

  const loadHistory = useCallback(async () => {
    try {
      const items = await getAllItems();
      const itemsWithUrls = items.map(item => ({ ...item, audioUrl: URL.createObjectURL(item.audioBlob) }));
      setHistory(itemsWithUrls);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => {
    loadHistory();
    return () => historyRef.current.forEach(item => item.audioUrl && URL.revokeObjectURL(item.audioUrl));
  }, [loadHistory]);

  const handleSeek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }, []);

  const handlePrevSegment = useCallback(() => {
    if (!activeItem) return;
    const nextIdx = Math.max(0, readingIndex - 1);
    setReadingIndex(nextIdx);
  }, [activeItem, readingIndex]);

  const handleNextSegment = useCallback(() => {
    if (!activeItem) return;
    const nextIdx = Math.min(activeItem.lines.length - 1, readingIndex + 1);
    setReadingIndex(nextIdx);
  }, [activeItem, readingIndex]);

  const handleTranscriptVocabClick = useCallback((text: string) => {
    const el = document.getElementById(`vocab-${text}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bg-indigo-100', 'dark:bg-indigo-900/40');
      setTimeout(() => el.classList.remove('bg-indigo-100', 'dark:bg-indigo-900/40'), 1500);
    }
  }, []);

  const handleAddToVocabulary = useCallback(async (text: string, time: number) => {
    if (isLookupLoading) return;
    setIsLookupLoading(true);
    try {
      const result = await lookupVocabulary(text);
      const newEntry = { ...result, timestamp: time }; 
      setVocabularyList(prev => {
        if (prev.some(v => v.text.toLowerCase() === newEntry.text.toLowerCase())) return prev;
        return [newEntry, ...prev];
      });
      setTimeout(() => {
        const el = document.getElementById(`vocab-${newEntry.text}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    } catch (err: any) {
      alert(err.message || "Query failed.");
    } finally {
      setIsLookupLoading(false);
    }
  }, [isLookupLoading]);

  const handleExportVocab = useCallback(() => {
    const aiKeywords: Highlight[] = [];
    if (activeItem) {
      activeItem.lines.forEach(line => {
        line.segments.forEach(seg => {
          if (seg.highlights) aiKeywords.push(...seg.highlights);
        });
      });
    }

    const formatItem = (item: Highlight) => {
      const word = item.text || "";
      const ipa = item.ipa ? ` (${item.ipa})` : "";
      const meaning = item.meaning || "";
      const example = item.example || "N/A";
      return `${word}${ipa} - ${meaning}\r\nExample: ${example}\r\n---------------------------`;
    };

    let exportContent = "";
    if (vocabularyList.length > 0) {
      exportContent += "New Vocabulary\r\n---------------------------\r\n" + vocabularyList.map(formatItem).join('\r\n') + "\r\n\r\n";
    }
    const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vocabulary_list_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }, [vocabularyList, activeItem]);

  const handleSidebarVocabClick = useCallback((time: number, text: string) => {
    handleSeek(time);
    const lineIndex = activeItem?.lines.findIndex(l => l.startTime === time);
    if (lineIndex !== undefined && lineIndex !== -1) {
      setReadingIndex(lineIndex);
    }
  }, [activeItem, handleSeek]);

  return (
    <div className="h-screen w-full flex flex-col bg-slate-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 overflow-hidden font-sans transition-colors duration-300">
      {/* Sticky Header with fixed height and solid background */}
      <header className="sticky top-0 z-50 shrink-0 h-24 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm transition-colors flex items-center">
        {activeItem ? (
          <div className="flex w-full items-center px-6">
            <div className="flex-1 flex items-center">
              <AudioPlayer 
                ref={audioRef} 
                url={activeItem.audioUrl} 
                isPlaying={isPlaying} 
                setIsPlaying={setIsPlaying} 
                currentTime={currentTime} 
                onTimeUpdate={setCurrentTime} 
                onDurationChange={setDuration} 
                seekTo={handleSeek}
                onPrevSegment={handlePrevSegment}
                onNextSegment={handleNextSegment}
              />
            </div>
            <div className="w-[30%] border-l border-gray-200 dark:border-gray-800 ml-8 pl-8 flex items-center justify-between">
              <div className="truncate">
                <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 truncate">{activeItem.name}</h2>
              </div>
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className={`p-2 rounded-lg transition-colors ${isSidebarOpen ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-gray-800'}`}
                  title="Toggle Vocabulary Sidebar"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                </button>
                <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-colors">
                  {isDarkMode ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                  )}
                </button>
                <button onClick={() => setActiveItem(null)} className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors bg-slate-50 dark:bg-gray-800 px-3 py-2 rounded-lg">
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex w-full items-center justify-between px-6">
            <h1 className="text-2xl font-black bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">AI Transcriber</h1>
            <div className="flex items-center space-x-4">
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-colors">
                {isDarkMode ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                )}
              </button>
              <button 
                onClick={() => setIsImportOpen(true)}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg active:scale-95 flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                <span>Import Project</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area - Scrollable */}
      <main className="flex-1 flex overflow-hidden relative">
        {activeItem ? (
          <>
            <div className="flex-1 flex flex-col overflow-hidden">
              <TranscriptViewer 
                lines={activeItem.lines} 
                currentTime={currentTime} 
                readingIndex={readingIndex}
                onFocusSegment={setReadingIndex}
                onSeek={handleSeek}
                onVocabClick={handleTranscriptVocabClick}
                onAddToVocab={handleAddToVocabulary}
              />
            </div>
            {isSidebarOpen && (
              <div className="w-96 border-l border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden bg-white dark:bg-gray-900 shadow-2xl z-40 transition-all">
                <VocabSidebar 
                  lines={activeItem.lines} 
                  userVocab={vocabularyList}
                  onVocabClick={handleSidebarVocabClick}
                  onExport={handleExportVocab}
                />
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50 dark:bg-gray-950 transition-colors">
            <div className="max-w-6xl mx-auto">
              <HistoryList 
                items={history} 
                onSelectItem={setActiveItem} 
                onDeleteItem={async (id) => {
                  await deleteFromDB(id);
                  setHistory(prev => prev.filter(item => item.id !== id));
                }} 
              />
            </div>
          </div>
        )}
      </main>

      <ImportDialog 
        isOpen={isImportOpen} 
        onClose={() => setIsImportOpen(false)} 
        onImportComplete={(item) => {
          setHistory(prev => [item, ...prev]);
          setActiveItem(item);
        }} 
      />
      
      {isLookupLoading && (
        <div className="fixed bottom-10 left-10 z-[100] bg-indigo-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center space-x-3 animate-bounce">
          <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm font-bold tracking-wide">AI analyzing...</span>
        </div>
      )}
    </div>
  );
};

export default App;
