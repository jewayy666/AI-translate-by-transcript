
import React, { useState, useEffect, useCallback, useRef } from 'react';
import AudioPlayer from './components/AudioPlayer';
import TranscriptViewer from './components/TranscriptViewer';
import VocabSidebar from './components/VocabSidebar';
import HistoryList from './components/HistoryList';
import ImportDialog from './components/ImportDialog';
import { HistoryItem } from './types';
import { getAllItems, deleteItem as deleteFromDB } from './services/storageService';

const App: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeItem, setActiveItem] = useState<HistoryItem | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement>(null);
  const historyRef = useRef<HistoryItem[]>([]);

  useEffect(() => { historyRef.current = history; }, [history]);

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

  /**
   * 點擊逐字稿中的單字：使用 useCallback 確保參照穩定
   */
  const handleTranscriptVocabClick = useCallback((text: string) => {
    const el = document.getElementById(`vocab-${text}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bg-indigo-100');
      setTimeout(() => el.classList.remove('bg-indigo-100'), 1500);
    }
  }, []);

  /**
   * 點擊側邊欄中的單字：音訊跳轉
   */
  const handleSidebarVocabClick = useCallback((time: number, text: string) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
    
    const line = activeItem?.lines.find(l => l.startTime === time);
    if (line) {
      const el = document.getElementById(`transcript-${line.id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeItem]);

  return (
    <div className="h-screen flex flex-col bg-gray-50 text-gray-900 overflow-hidden font-sans">
      {!activeItem && (
        <header className="bg-white border-b h-16 flex items-center px-6 shrink-0 z-20">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveItem(null)}>
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
            </div>
            <span className="font-bold text-xl tracking-tight">AudioTranscriber <span className="text-indigo-600">Pro</span></span>
          </div>
          <div className="flex-1" />
          <button onClick={() => setIsImportOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold shadow-sm flex items-center">
            <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            新建學習專案
          </button>
        </header>
      )}

      <main className="flex-1 flex flex-col relative overflow-hidden">
        {activeItem ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex w-full bg-white border-b shrink-0 z-30 shadow-sm h-20 items-center overflow-hidden">
              <div className="w-1/2 h-full border-r border-gray-100 flex items-center px-4">
                <AudioPlayer ref={audioRef} url={activeItem.audioUrl} isPlaying={isPlaying} setIsPlaying={setIsPlaying} currentTime={currentTime} onTimeUpdate={setCurrentTime} onDurationChange={setDuration} seekTo={setCurrentTime} />
              </div>
              <div className="w-1/2 h-full px-6 flex items-center justify-between bg-slate-50/50">
                <div className="truncate">
                  <h2 className="text-md font-bold text-gray-800 truncate">{activeItem.name}</h2>
                  <p className="text-[10px] text-indigo-500 font-bold uppercase mt-0.5">English Learning Mode</p>
                </div>
                <button onClick={() => setActiveItem(null)} className="shrink-0 bg-white border text-xs font-bold text-gray-600 px-3 py-1.5 rounded-lg hover:text-indigo-600 transition-all flex items-center">
                  返回
                </button>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-12 overflow-hidden bg-white">
              <div className="col-span-8 flex flex-col border-r border-gray-100 overflow-hidden">
                <TranscriptViewer lines={activeItem.lines} onSeek={handleSeek} onVocabClick={handleTranscriptVocabClick} />
              </div>
              <div className="col-span-4 flex flex-col overflow-hidden">
                <VocabSidebar lines={activeItem.lines} onVocabClick={handleSidebarVocabClick} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
            <div className="max-w-6xl mx-auto">
              <h1 className="text-3xl font-extrabold text-gray-900 mb-6">學習歷史</h1>
              <HistoryList items={history} onSelectItem={(it) => setActiveItem(it)} onDeleteItem={(id) => deleteFromDB(id).then(loadHistory)} />
            </div>
          </div>
        )}
      </main>
      <ImportDialog isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} onImportComplete={loadHistory} />
    </div>
  );
};

export default App;
