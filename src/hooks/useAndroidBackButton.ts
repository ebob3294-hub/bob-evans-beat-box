import { useEffect } from 'react';
import { App, type BackButtonListenerEvent } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { usePlayerStore } from '@/store/playerStore';
import { toast } from '@/hooks/use-toast';

/**
 * Handle Android hardware back button:
 *  - From sub-views (nowPlaying, equalizer, queue, settings) -> go back to library
 *  - From library -> ask once before exiting (double-press to confirm)
 */
export function useAndroidBackButton() {
  const activeView = usePlayerStore((s) => s.activeView);
  const setActiveView = usePlayerStore((s) => s.setActiveView);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let lastBackPress = 0;
    let listenerHandle: { remove: () => void } | null = null;

    const handler = (_event: BackButtonListenerEvent) => {
      const current = usePlayerStore.getState().activeView;

      // Sub-views: navigate back to the library
      if (current === 'nowPlaying' || current === 'queue' || current === 'settings') {
        setActiveView('library');
        return;
      }
      // Equalizer is opened from Now Playing -> go back there
      if (current === 'equalizer') {
        setActiveView('nowPlaying');
        return;
      }

      // Library: double-press to exit
      const now = Date.now();
      if (now - lastBackPress < 2000) {
        App.exitApp();
      } else {
        lastBackPress = now;
        toast({
          title: 'Press back again to exit',
          duration: 2000,
        });
      }
    };

    App.addListener('backButton', handler).then((h) => {
      listenerHandle = h;
    });

    return () => {
      listenerHandle?.remove();
    };
    // setActiveView is stable from Zustand; activeView referenced via getState() so no rebinding needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
