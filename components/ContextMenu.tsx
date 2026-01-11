
import React, { useEffect, useRef } from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  onAddToVocab: () => void;
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onAddToVocab, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('click', handleClickOutside);
    window.addEventListener('scroll', onClose);
    return () => {
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('scroll', onClose);
    };
  }, [onClose]);

  return (
    <div 
      ref={menuRef}
      className="fixed z-[1000] bg-white border border-gray-200 shadow-2xl rounded-xl py-1 w-48 animate-in fade-in zoom-in duration-100"
      style={{ top: y, left: x }}
    >
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onAddToVocab();
          onClose();
        }}
        className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-indigo-600 hover:text-white transition-colors flex items-center space-x-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
        <span>加入生詞筆記</span>
      </button>
      <div className="border-t border-gray-100 my-1" />
      <button 
        onClick={onClose}
        className="w-full text-left px-4 py-2 text-xs text-gray-400 hover:bg-gray-50 transition-colors"
      >
        取消
      </button>
    </div>
  );
};

export default ContextMenu;
