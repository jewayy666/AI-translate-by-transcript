
import React from 'react';
import { TranscriptLine, Highlight } from '../types';

interface VocabSidebarProps {
  lines: TranscriptLine[];
  onVocabClick: (time: number, text: string) => void;
}

const VocabSidebar: React.FC<VocabSidebarProps> = ({ lines, onVocabClick }) => {
  const allVocab = React.useMemo(() => {
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

  const words = allVocab.filter(v => v.info.type === 'word');
  const phrases = allVocab.filter(v => v.info.type === 'phrase');

  const renderVocabCard = (v: { info: Highlight; time: number }, i: number) => (
    <div 
      key={i} 
      id={`vocab-${v.info.text}`}
      onClick={() => onVocabClick(v.time, v.info.text)}
      className="p-3 rounded-xl border border-gray-100 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all cursor-pointer group"
    >
      <div className="flex items-baseline space-x-2">
        <span className="font-bold text-indigo-900 group-hover:text-indigo-600">{v.info.text}</span>
        {v.info.ipa && <span className="text-[10px] text-slate-400 font-mono italic">{v.info.ipa}</span>}
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
      <div className="p-4 border-b bg-slate-50 shrink-0">
        <h3 className="font-bold text-slate-800 flex items-center">
          <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          智慧單字庫 ({allVocab.length})
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
        {words.length > 0 && (
          <section>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">重點單字</h4>
            <div className="space-y-3">
              {words.map((v, i) => renderVocabCard(v, i))}
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

        {allVocab.length === 0 && (
          <div className="text-center py-20 opacity-30">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 14l9-5-9-5-9 5 9 5z" /><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
            <p className="text-xs">分析中，請稍候...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VocabSidebar;
