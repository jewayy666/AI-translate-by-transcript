
import React, { useRef, memo } from 'react';
import { TranscriptLine, Highlight } from '../types';

interface TranscriptViewerProps {
  lines: TranscriptLine[];
  onSeek: (time: number) => void;
  onVocabClick: (text: string) => void;
}

/**
 * [HELPER] 渲染帶有紅字標註的英文句子
 * 使用最簡潔的語法，避免插件解析失敗
 */
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

/**
 * ✅ [SEMANTIC & STABLE] TranscriptRow
 * 使用 <article> 標籤提高翻譯插件的識別率，並加入特定類名標記。
 */
const TranscriptRow = memo(({ block, onSeek, onVocabClick }: { 
  block: TranscriptLine, 
  onSeek: (time: number) => void, 
  onVocabClick: (text: string) => void 
}) => {
  return (
    <article 
      id={`transcript-${block.id}`}
      className="immersive-translate-target-wrapper flex items-stretch transition-colors border-l-4 border-transparent hover:bg-slate-50/50"
    >
      {/* 左側：時間跳轉按鈕 */}
      <aside 
        onClick={() => onSeek(block.startTime)}
        className="w-16 shrink-0 flex items-start justify-center py-6 font-mono text-xs text-gray-400 cursor-pointer hover:text-indigo-600 hover:font-bold transition-all group/time"
      >
        <span className="group-hover/time:underline">{block.timestamp}</span>
      </aside>

      {/* 右側：內容區 */}
      <div className="flex-1 flex flex-col border-l border-gray-100">
        {block.segments.map((seg, sIdx) => (
          <div key={sIdx} className="flex flex-col border-b border-gray-50 last:border-b-0">
            <div className="px-6 py-5 flex flex-col space-y-3">
              {/* 說話者標記 */}
              <div className="flex">
                <span 
                  onClick={() => onSeek(block.startTime)}
                  className="text-[10px] font-black uppercase w-fit px-1.5 py-0.5 rounded bg-gray-200 text-gray-500 cursor-pointer hover:bg-indigo-600 hover:text-white transition-colors"
                >
                  {seg.speaker}
                </span>
              </div>

              {/* 英文原文：加入 lang="en" 與特定標記類名 */}
              <p 
                lang="en"
                className="immersive-translate-target transcript-en-text text-[18px] leading-relaxed text-slate-800 font-medium whitespace-pre-wrap select-text cursor-text"
                style={{ userSelect: 'text', cursor: 'text' }}
              >
                {renderHighlightedText(seg.english, seg.highlights, onVocabClick)}
              </p>

              {/* 中文翻譯：加入 lang="zh-TW" 與特定標記類名 */}
              <p 
                lang="zh-TW"
                className="immersive-translate-target transcript-zh-text text-[15px] leading-relaxed text-slate-500 italic border-l-2 border-slate-100 pl-4 whitespace-pre-wrap select-text cursor-text"
                style={{ userSelect: 'text', cursor: 'text' }}
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
  // 嚴格比對內容：只要內容沒變，絕不重建 DOM。
  const contentEqual = prev.block.segments.every((seg, i) => {
    const nextSeg = next.block.segments[i];
    return nextSeg && seg.english === nextSeg.english && seg.chinese === nextSeg.chinese;
  });
  return prev.block.id === next.block.id && contentEqual;
});

/**
 * ✅ TranscriptViewer 主元件
 * 使用 <main> 做為主要逐字稿滾動區塊。
 */
const TranscriptViewer: React.FC<TranscriptViewerProps> = memo(({ lines, onSeek, onVocabClick }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* 固定標頭 */}
      <header className="border-b bg-slate-50 flex items-center px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest sticky top-0 z-10 shrink-0">
        <div className="w-16 shrink-0 text-center">Time</div>
        <div className="flex-1 px-4 border-l border-slate-200">
          Semantic Transcript (Optimized for Immersion Translation)
        </div>
      </header>

      {/* 逐字稿主體容器 */}
      <main 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto custom-scrollbar"
      >
        <section className="divide-y divide-gray-100 pb-[40vh]">
          {lines.map((block) => (
            <TranscriptRow 
              key={block.id} 
              block={block} 
              onSeek={onSeek} 
              onVocabClick={onVocabClick} 
            />
          ))}
        </section>
      </main>
    </div>
  );
}, (prev, next) => {
  // 列表級別保護：資料陣列參照沒變，就不准重新渲染
  return prev.lines === next.lines;
});

export default TranscriptViewer;
