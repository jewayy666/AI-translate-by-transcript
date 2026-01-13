
import React, { useRef, memo, useState, useEffect, useCallback, useMemo } from 'react';
import { TranscriptLine, Highlight } from '../types';
import ContextMenu from './ContextMenu';
import { formatTime } from '../utils';

interface TranscriptViewerProps {
  lines: TranscriptLine[];
  currentTime: number;
  readingIndex: number;
  onFocusSegment: (index: number) => void;
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
          className="text-red-600 dark:text-red-400 font-medium border-b-2 border-transparent hover:border-red-600 dark:hover:border-red-400 transition-all cursor-pointer mx-0.5 select-text"
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

const TranscriptRow = memo(({ block, onSeek, onVocabClick, isFocused, index, onClick, setRef }: { 
  block: TranscriptLine, 
  onSeek: (time: number) => void, 
  onVocabClick: (text: string) => void,
  isFocused: boolean,
  index: number,
  onClick: () => void,
  setRef: (el: HTMLElement | null) => void
}) => {
  return (
    <article 
      ref={setRef}
      id={`transcript-segment-${index}`}
      data-time={block.startTime}
      data-index={index}
      onClick={onClick}
      className={`immersive-translate-target-wrapper flex items-stretch transition-all border-l-4 cursor-pointer ${
        isFocused 
          ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-900/30 shadow-inner' 
          : 'border-transparent hover:bg-slate-50/50 dark:hover:bg-gray-900/40'
      }`}
    >
      <aside 
        onClick={(e) => { e.stopPropagation(); onSeek(block.startTime); }}
        className={`w-16 shrink-0 flex items-start justify-center py-6 font-mono text-xs transition-all group/time ${isFocused ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-400 dark:text-gray-600 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
      >
        <span className="group-hover/time:underline">{block.timestamp}</span>
      </aside>

      <div className={`flex-1 flex flex-col border-l ${isFocused ? 'border-indigo-200 dark:border-indigo-900' : 'border-gray-100 dark:border-gray-800'}`}>
        {block.segments.map((seg, sIdx) => (
          <div key={sIdx} className="flex flex-col border-b border-gray-50 dark:border-gray-900/50 last:border-b-0">
            <div className="px-6 py-6 flex flex-col space-y-3">
              <div className="flex">
                <span className={`text-[10px] font-black uppercase w-fit px-1.5 py-0.5 rounded transition-colors ${isFocused ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                  {seg.speaker}
                </span>
              </div>
              <p lang="en" className={`immersive-translate-target transcript-en-text text-xl md:text-[20px] leading-relaxed font-normal whitespace-pre-wrap select-text cursor-text ${isFocused ? 'text-slate-900 dark:text-gray-100' : 'text-slate-800 dark:text-gray-300'}`}>
                {renderHighlightedText(seg.english, seg.highlights, onVocabClick)}
              </p>
              <p lang="zh-TW" className="immersive-translate-target transcript-zh-text text-base md:text-[16px] leading-relaxed text-slate-500 dark:text-gray-500 italic border-l-2 border-slate-100 dark:border-gray-800 pl-4 whitespace-pre-wrap select-text cursor-text">
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

const TranscriptViewer: React.FC<TranscriptViewerProps> = memo(({ lines, currentTime, readingIndex, onFocusSegment, onSeek, onVocabClick, onAddToVocab }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const [menuPos, setMenuPos] = useState<{ x: number, y: number } | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [selectedTime, setSelectedTime] = useState(0);

  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, lines.length);
  }, [lines]);

  useEffect(() => {
    const targetElement = itemRefs.current[readingIndex];
    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [readingIndex]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const activeTag = document.activeElement?.tagName;
    if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

    if (e.code === 'ArrowUp') {
      e.preventDefault();
      const nextIdx = Math.max(0, readingIndex - 1);
      onFocusSegment(nextIdx);
    } else if (e.code === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = Math.min(lines.length - 1, readingIndex + 1);
      onFocusSegment(nextIdx);
    }
  }, [readingIndex, lines.length, onFocusSegment]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  
  const handlePrev = useCallback(() => {
    const nextIdx = Math.max(0, readingIndex - 1);
    onFocusSegment(nextIdx);
  }, [readingIndex, onFocusSegment]);

  const handleNext = useCallback(() => {
    const nextIdx = Math.min(lines.length - 1, readingIndex + 1);
    onFocusSegment(nextIdx);
  }, [readingIndex, lines.length, onFocusSegment]);

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
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-950 relative transition-colors" onContextMenu={handleContextMenu}>
      <header className="border-b dark:border-gray-800 bg-slate-50 dark:bg-gray-900 flex items-center px-4 py-2 text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest sticky top-0 z-10 shrink-0 shadow-sm transition-colors">
        <div className="w-16 shrink-0 text-center">Time</div>
        <div className="flex-1 px-4 border-l border-slate-200 dark:border-gray-800 flex items-center justify-between">
          <span className="dark:text-gray-400 text-xs">Decoupled Reading Mode (↑/↓ to Navigate)</span>
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={handlePrev}
              className="px-2 py-1 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors shadow-sm active:scale-95"
            >
              PREV
            </button>
            <button 
              onClick={handleNext}
              className="px-2 py-1 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors shadow-sm active:scale-95"
            >
              NEXT
            </button>
          </div>
        </div>
      </header>
      
      <main ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar relative">
        <section className="divide-y divide-gray-100 dark:divide-gray-800 pb-[50vh]">
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
                onClick={() => onFocusSegment(i)}
                setRef={(el) => (itemRefs.current[i] = el)}
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
}, (prev, next) => prev.lines === next.lines && prev.currentTime === next.currentTime && prev.readingIndex === next.readingIndex);

export default TranscriptViewer;
