
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { formatTime } from '../utils';

interface AudioPlayerProps {
  url: string;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  currentTime: number;
  seekTo: (time: number) => void;
}

const AudioPlayer = forwardRef<HTMLAudioElement, AudioPlayerProps>(({
  url,
  onTimeUpdate,
  onDurationChange,
  isPlaying,
  setIsPlaying,
  currentTime,
  seekTo
}, ref) => {
  const localAudioRef = useRef<HTMLAudioElement | null>(null);

  // 將內部的 audio 引用暴露給 forwardRef
  useImperativeHandle(ref, () => localAudioRef.current!);

  useEffect(() => {
    if (!localAudioRef.current) return;
    if (isPlaying) {
      localAudioRef.current.play().catch(e => console.error("Play failed", e));
    } else {
      localAudioRef.current.pause();
    }
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    if (localAudioRef.current) {
      onTimeUpdate(localAudioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (localAudioRef.current) {
      onDurationChange(localAudioRef.current.duration);
    }
  };

  const skip = (seconds: number) => {
    if (localAudioRef.current) {
      const newTime = Math.max(0, Math.min(localAudioRef.current.duration, localAudioRef.current.currentTime + seconds));
      localAudioRef.current.currentTime = newTime;
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!localAudioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickedValue = (x / rect.width) * localAudioRef.current.duration;
    localAudioRef.current.currentTime = clickedValue;
    seekTo(clickedValue);
  };

  // Global Keyboard listener for Space
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setIsPlaying(!isPlaying);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, setIsPlaying]);

  return (
    <div className="w-full h-full flex flex-col justify-center">
      <audio
        ref={localAudioRef}
        src={url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="w-full space-y-2">
        {/* Compact Progress Bar */}
        <div 
          className="h-1.5 bg-gray-200 rounded-full cursor-pointer relative overflow-hidden"
          onClick={handleProgressClick}
        >
          <div 
            className="absolute top-0 left-0 h-full bg-indigo-600 transition-all duration-100 ease-linear"
            style={{ width: `${(currentTime / (localAudioRef.current?.duration || 1)) * 100}%` }}
          />
        </div>

        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="shrink-0 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            {isPlaying ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            )}
          </button>

          <div className="flex items-center space-x-1">
            <button 
              onClick={() => skip(-10)}
              className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
              title="後退 10 秒"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" /></svg>
            </button>
            <button 
              onClick={() => skip(10)}
              className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
              title="前進 10 秒"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.599 7.2A1 1 0 005 8v8a1 1 0 001.599.8l5.334-4zM19.933 12.8a1 1 0 000-1.6l-5.334-4A1 1 0 0013 8v8a1 1 0 001.599.8l5.334-4z" /></svg>
            </button>
          </div>

          <div className="text-[11px] font-mono font-bold text-gray-500 tabular-nums bg-gray-100 px-2 py-1 rounded">
            {formatTime(currentTime)} <span className="text-gray-300">/</span> {formatTime(localAudioRef.current?.duration || 0)}
          </div>
        </div>
      </div>
    </div>
  );
});

export default AudioPlayer;
