import { useEffect } from 'react';
import { usePlayerStore } from '@/store/playerStore';

/**
 * Global keyboard / D-pad navigation for Nokia KaiOS-style devices,
 * Nokia Android phones with hardware keys, and any browser.
 *
 * Shortcuts (work anywhere except inside <input>/<textarea>):
 *   Space / Enter / 5    -> Play / Pause
 *   ArrowLeft  / 4       -> Previous track
 *   ArrowRight / 6       -> Next track
 *   ArrowUp    / 2       -> Volume +
 *   ArrowDown  / 8       -> Volume -
 *   1                    -> Library view
 *   2                    -> Now Playing
 *   3                    -> Equalizer
 *   7                    -> Queue
 *   9                    -> Settings
 *   0 / Backspace        -> Back to Library
 *   S                    -> Toggle Shuffle
 *   R                    -> Cycle Repeat
 *   L                    -> Like current
 *
 * Also enables Tab/D-pad focus traversal via :focus-visible styles
 * defined in index.css.
 */
export function useKeyboardNavigation() {
  const {
    togglePlay,
    nextSong,
    prevSong,
    setActiveView,
    activeView,
    toggleShuffle,
    cycleRepeat,
    loudness,
    setLoudness,
    currentSong,
    toggleLike,
  } = usePlayerStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      // Don't hijack typing in inputs
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;

      const key = e.key;

      // Media keys (Nokia phones often expose them)
      if (key === 'MediaPlayPause' || key === 'MediaPlay' || key === 'MediaPause') {
        e.preventDefault(); togglePlay(); return;
      }
      if (key === 'MediaTrackNext') { e.preventDefault(); nextSong(); return; }
      if (key === 'MediaTrackPrevious') { e.preventDefault(); prevSong(); return; }

      switch (key) {
        case ' ':
        case 'Spacebar':
        case '5':
          e.preventDefault(); togglePlay(); break;
        case 'Enter':
          // Let Enter act on focused element if any (D-pad select)
          if (target && target !== document.body) return;
          e.preventDefault(); togglePlay(); break;
        case 'ArrowLeft':
        case '4':
          e.preventDefault(); prevSong(); break;
        case 'ArrowRight':
        case '6':
          e.preventDefault(); nextSong(); break;
        case 'ArrowUp':
        case '2':
          if (key === 'ArrowUp' && target && target !== document.body) return;
          e.preventDefault();
          setLoudness(Math.min(100, loudness + 5));
          break;
        case 'ArrowDown':
        case '8':
          if (key === 'ArrowDown' && target && target !== document.body) return;
          e.preventDefault();
          setLoudness(Math.max(0, loudness - 5));
          break;
        case '1': setActiveView('library'); break;
        case '3': setActiveView('equalizer'); break;
        case '7': setActiveView('queue'); break;
        case '9': setActiveView('settings'); break;
        case '0':
        case 'Backspace':
        case 'GoBack':
          if (activeView !== 'library') {
            e.preventDefault();
            setActiveView('library');
          }
          break;
        case 's': case 'S': toggleShuffle(); break;
        case 'r': case 'R': cycleRepeat(); break;
        case 'l': case 'L':
          if (currentSong) toggleLike(currentSong.id);
          break;
        default: break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    togglePlay, nextSong, prevSong, setActiveView, activeView,
    toggleShuffle, cycleRepeat, loudness, setLoudness, currentSong, toggleLike,
  ]);
}
