
import React from 'react';
import { TranscriptLine, Highlight } from '../types';
import { formatTime } from '../utils';

interface VocabSidebarProps {
  lines: TranscriptLine[];
  userVocab?: Highlight[];
  onVocabClick: (time: number, text: string) => void;
  onExport?: () => void; // ✅ 新增：匯出回呼
}

const VocabSidebar: React.FC<VocabSidebarProps> = ({ lines, userVocab = [], onVocabClick, onExport }) => {
  const autoVocab = React.useMemo(() => {
    const vocabMap = new Map<string, { info: Highlight; time: number }>();
    lines.forEach(line => {
      line.segments.forEach(seg => {
        seg.highlights.forEach(h => {
          if (!vocabMap.has(h.text)) {
            vocabMap.set(h.text, { info: h, time: line.startTime });
          }
        });
      });
    });
    return Array.from(vocabMap.values()).sort((a, b) => a.time - b.time);
  }, [lines]);

  const allWords = React.useMemo(() => {
    const userWords = userVocab.map(v => ({ info: v, time: v.timestamp || 0, isUser: true }));
    const autoWords = autoVocab.filter(v => v.info.type === 'word').map(v => ({ ...v, isUser: false }));
    return [...userWords, ...autoWords];
  }, [autoVocab, userVocab]);

  const phrases = autoVocab.filter(v => v.info.type === 'phrase');

  const renderVocabCard = (v: { info: Highlight; time: number, isUser?: boolean }, i: number) => (
    <div 
      key={i} 
      id={`vocab-${v.info.text}`}
      onClick={() => onVocabClick(v.time, v.info.text)}
      className={`p-3 rounded-xl border transition-all cursor-pointer group ${v.isUser ? 'border-amber-200 bg-amber-50/50 hover:border-amber-400' : 'border-gray-100 hover:border-indigo-300 hover:bg-indigo-50/50'}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-baseline space-x-2">
          <span className={`font-bold ${v.isUser ? 'text-amber-900' : 'text-indigo-900 group-hover:text-indigo-600'}`}>{v.info.text}</span>
          {v.info.ipa && <span className="text-[10px] text-slate-400 font-mono italic">{v.info.ipa}</span>}
        </div>
        <div className="flex items-center space-x-2">
          {v.isUser && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-700 uppercase">Note</span>
          )}
          {/* ✅ [NEW] 時間戳記跳轉按鈕 */}
          <button 
            className="p-1 rounded bg-slate-100 text-slate-400 hover:bg-indigo-600 hover:text-white transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onVocabClick(v.time, v.info.text);
            }}
            title={`跳轉至 ${formatTime(v.time)}`}
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </button>
        </div>
      </div>
      <p className="text-sm text-slate-600 mt-1">{v.info.meaning}</p>
      {v.info.example && (
        <p className="text-[12px] text-slate-400 italic mt-1.5 leading-snug">
          {v.info.example}
        </p>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200 overflow-hidden">
      <div className="p-4 border-b bg-slate-50 shrink-0 flex items-center justify-between">
        <h3 className="font-bold text-slate-800 flex items-center">
          <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          智慧單字庫 ({autoVocab.length + userVocab.length})
        </h3>
        {/* ✅ [NEW] 匯出按鈕 */}
        {(autoVocab.length > 0 || userVocab.length > 0) && onExport && (
          <button 
            onClick={onExport}
            className="p-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center space-x-1 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            <span>匯出</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
        {allWords.length > 0 && (
          <section>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">重點單字</h4>
            <div className="space-y-3">
              {allWords.map((v, i) => renderVocabCard(v, i))}
            </div>
          </section>
        )}
        {phrases.length > 0 && (
          <section>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">實用語塊 / 片語</h4>
            <div className="space-y-3">
              {phrases.map((v, i) => renderVocabCard(v, i))}
            </div>
          </section>
        )}
        {allWords.length === 0 && phrases.length === 0 && (
          <div className="text-center py-20 opacity-30">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 14l9-5-9-5-9 5 9 5z" /><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
            <p className="text-xs">尚無單字資訊</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VocabSidebar;
