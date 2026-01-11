
import React, { useRef, memo, useState, useEffect, useCallback } from 'react';
import { TranscriptLine, Highlight } from '../types';
import ContextMenu from './ContextMenu';

interface TranscriptViewerProps {
  lines: TranscriptLine[];
  currentTime: number;
  onSeek: (time: number) => void;
  onVocabClick: (text: string) => void;
  onAddToVocab: (text: string, time: number) => void;
}

const renderHighlightedText = (text: string, highlights: Highlight[], onVocabClick: (text: string) => void) => {
  if (!highlights || highlights.length === 0) return text;
  const sortedHighlights = [...highlights].sort((a, b) => b.text.length - a.text.length);
  const pattern = new RegExp(`(${sortedHighlights.map(h => h.text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})`, 'gi');
  const parts = text.split(pattern);

  return parts.map((part, i) => {
    const isMatch = sortedHighlights.find(h => h.text.toLowerCase() === part.toLowerCase());
    if (isMatch) {
      return (
        <span 
          key={i} 
          onClick={(e) => {
            e.stopPropagation();
            onVocabClick(isMatch.text);
          }}
          className="text-red-600 font-bold border-b-2 border-transparent hover:border-red-600 transition-all cursor-pointer mx-0.5 select-text"
          style={{ userSelect: 'text' }}
          title={`${isMatch.ipa} - ${isMatch.meaning}`}
        >
          {part}
        </span>
      );
    }
    return part;
  });
};

const TranscriptRow = memo(({ block, onSeek, onVocabClick, isFocused, index, onClick }: { 
  block: TranscriptLine, 
  onSeek: (time: number) => void, 
  onVocabClick: (text: string) => void,
  isFocused: boolean,
  index: number,
  onClick: () => void
}) => {
  const rowRef = useRef<HTMLElement>(null);

  return (
    <article 
      ref={rowRef}
      id={`transcript-segment-${index}`}
      data-time={block.startTime}
      data-index={index}
      onClick={onClick}
      className={`immersive-translate-target-wrapper flex items-stretch transition-all border-l-4 cursor-pointer ${
        isFocused ? 'border-indigo-600 bg-indigo-50/60 shadow-inner' : 'border-transparent hover:bg-slate-50/50'
      }`}
    >
      {/* 點擊左側時間戳仍可控制音訊跳轉，但主要區塊點擊為聚焦閱讀 */}
      <aside 
        onClick={(e) => { e.stopPropagation(); onSeek(block.startTime); }}
        className={`w-16 shrink-0 flex items-start justify-center py-6 font-mono text-xs transition-all group/time ${isFocused ? 'text-indigo-600 font-bold' : 'text-gray-400 hover:text-indigo-600'}`}
      >
        <span className="group-hover/time:underline">{block.timestamp}</span>
      </aside>

      <div className={`flex-1 flex flex-col border-l ${isFocused ? 'border-indigo-200' : 'border-gray-100'}`}>
        {block.segments.map((seg, sIdx) => (
          <div key={sIdx} className="flex flex-col border-b border-gray-50 last:border-b-0">
            <div className="px-6 py-5 flex flex-col space-y-3">
              <div className="flex">
                <span 
                  className={`text-[10px] font-black uppercase w-fit px-1.5 py-0.5 rounded transition-colors ${isFocused ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}
                >
                  {seg.speaker}
                </span>
              </div>
              <p 
                lang="en"
                className={`immersive-translate-target transcript-en-text text-[18px] leading-relaxed font-medium whitespace-pre-wrap select-text cursor-text ${isFocused ? 'text-slate-900' : 'text-slate-800'}`}
              >
                {renderHighlightedText(seg.english, seg.highlights, onVocabClick)}
              </p>
              <p 
                lang="zh-TW"
                className="immersive-translate-target transcript-zh-text text-[15px] leading-relaxed text-slate-500 italic border-l-2 border-slate-100 pl-4 whitespace-pre-wrap select-text cursor-text"
              >
                {seg.chinese}
              </p>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}, (prev, next) => {
  return prev.block.id === next.block.id && 
         prev.isFocused === next.isFocused && 
         prev.block.segments === next.block.segments;
});

const TranscriptViewer: React.FC<TranscriptViewerProps> = memo(({ lines, onSeek, onVocabClick, onAddToVocab }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [readingIndex, setReadingIndex] = useState(0); 
  const [menuPos, setMenuPos] = useState<{ x: number, y: number } | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [selectedTime, setSelectedTime] = useState(0);

  // 捲動至特定索引並聚焦
  const scrollToIndex = useCallback((index: number) => {
    const el = document.getElementById(`transcript-segment-${index}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const handleFocusSegment = useCallback((index: number) => {
    setReadingIndex(index);
    scrollToIndex(index);
  }, [scrollToIndex]);

  // 純手動導覽：上一句
  const handlePrev = useCallback(() => {
    setReadingIndex(prev => {
      const nextIndex = Math.max(0, prev - 1);
      scrollToIndex(nextIndex);
      return nextIndex;
    });
  }, [scrollToIndex]);

  // 純手動導覽：下一句
  const handleNext = useCallback(() => {
    setReadingIndex(prev => {
      const nextIndex = Math.min(lines.length - 1, prev + 1);
      scrollToIndex(nextIndex);
      return nextIndex;
    });
  }, [lines.length, scrollToIndex]);

  // 鍵盤監聽：上下鍵僅控制閱讀捲動，與音訊無關
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

      if (e.code === 'ArrowUp') {
        e.preventDefault();
        handlePrev();
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext]);

  const handleContextMenu = (e: React.MouseEvent) => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    
    if (text && text.length > 0) {
      e.preventDefault();
      const row = (e.target as HTMLElement).closest('[data-time]');
      const timeAttr = row?.getAttribute('data-time');
      const time = timeAttr ? parseFloat(timeAttr) : 0;

      setSelectedText(text);
      setSelectedTime(time);
      setMenuPos({ x: e.clientX, y: e.clientY });
    } else {
      setMenuPos(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white relative" onContextMenu={handleContextMenu}>
      {/* 懸浮導覽按鈕：純手動捲動控制 */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 z-[40] flex items-center space-x-1 bg-white/90 backdrop-blur-md border border-slate-200 shadow-xl rounded-full px-2 py-1 select-none border-b-2 border-b-indigo-100">
        <button 
          onClick={(e) => { e.stopPropagation(); handlePrev(); }}
          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all flex items-center space-x-1"
          title="上一句 (Up Arrow)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
          <span className="text-[10px] font-bold mr-1">Prev</span>
        </button>
        <div className="w-px h-4 bg-slate-200 mx-1" />
        <button 
          onClick={(e) => { e.stopPropagation(); handleNext(); }}
          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all flex items-center space-x-1"
          title="下一句 (Down Arrow)"
        >
          <span className="text-[10px] font-bold ml-1">Next</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>
      </div>

      <header className="border-b bg-slate-50 flex items-center px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest sticky top-0 z-10 shrink-0 shadow-sm">
        <div className="w-16 shrink-0 text-center">Time</div>
        <div className="flex-1 px-4 border-l border-slate-200">
          Manual Reading Mode (Click any row to focus)
        </div>
      </header>
      
      <main ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar relative">
        <section className="divide-y divide-gray-100 pb-[50vh]">
          {lines.map((block, i) => {
            const isFocused = i === readingIndex;
            return (
              <TranscriptRow 
                key={block.id} 
                index={i}
                block={block} 
                onSeek={onSeek} 
                onVocabClick={onVocabClick} 
                isFocused={isFocused}
                onClick={() => handleFocusSegment(i)}
              />
            );
          })}
        </section>
      </main>

      {menuPos && (
        <ContextMenu 
          x={menuPos.x} 
          y={menuPos.y} 
          onAddToVocab={() => {
            onAddToVocab(selectedText, selectedTime);
            setMenuPos(null);
          }}
          onClose={() => setMenuPos(null)}
        />
      )}
    </div>
  );
}, (prev, next) => prev.lines === next.lines);

export default TranscriptViewer;
