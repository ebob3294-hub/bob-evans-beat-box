import { usePlayerStore } from '@/store/playerStore';
import LibraryView from '@/components/player/LibraryView';
import NowPlayingView from '@/components/player/NowPlayingView';
import EqualizerView from '@/components/player/EqualizerView';
import QueueView from '@/components/player/QueueView';
import SettingsView from '@/components/player/SettingsView';
import BottomNav from '@/components/player/BottomNav';
import PermissionScreen, { ScanningOverlay } from '@/components/player/PermissionScreen';
import { AnimatePresence, motion } from 'framer-motion';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useAndroidBackButton } from '@/hooks/useAndroidBackButton';
import { useEffect } from 'react';
import { ThemeId } from '@/store/playerStore';

// Each theme defines the accent HSL values used across the app
const THEMES: Record<ThemeId, { primary: string; ring: string; accent: string }> = {
  red:    { primary: '0 85% 50%',   ring: '0 85% 50%',   accent: '0 85% 50%' },
  blue:   { primary: '217 91% 55%', ring: '217 91% 55%', accent: '217 91% 55%' },
  purple: { primary: '270 80% 60%', ring: '270 80% 60%', accent: '270 80% 60%' },
  green:  { primary: '142 71% 45%', ring: '142 71% 45%', accent: '142 71% 45%' },
  orange: { primary: '24 95% 55%',  ring: '24 95% 55%',  accent: '24 95% 55%' },
  cyan:   { primary: '189 94% 50%', ring: '189 94% 50%', accent: '189 94% 50%' },
};

const views = {
  library: LibraryView,
  nowPlaying: NowPlayingView,
  equalizer: EqualizerView,
  queue: QueueView,
  settings: SettingsView,
};

const Index = () => {
  const { activeView, bgColor, bgImage, permissionGranted, theme } = usePlayerStore();
  useAudioPlayer(); // Mount global audio playback
  useAndroidBackButton(); // Handle Android hardware back button
  const ActiveComponent = views[activeView];

  // Apply theme accent colors as CSS variables
  useEffect(() => {
    const t = THEMES[theme] || THEMES.red;
    const root = document.documentElement;
    root.style.setProperty('--primary', t.primary);
    root.style.setProperty('--accent', t.accent);
    root.style.setProperty('--ring', t.ring);
    root.style.setProperty('--sidebar-primary', t.primary);
    root.style.setProperty('--sidebar-ring', t.ring);
    root.style.setProperty('--player-glow', t.primary);
  }, [theme]);

  const phoneStyle: React.CSSProperties = {};
  if (bgImage) {
    phoneStyle.backgroundImage = `url(${bgImage})`;
    phoneStyle.backgroundSize = 'cover';
    phoneStyle.backgroundPosition = 'center';
  } else if (bgColor) {
    phoneStyle.backgroundColor = bgColor;
  }

  return (
    <div
      className="relative w-full min-h-[100dvh] bg-card overflow-hidden"
      style={phoneStyle}
    >
      {bgImage && (
        <div className="absolute inset-0 bg-card/70 backdrop-blur-sm z-0" />
      )}

      <ScanningOverlay />

      {!permissionGranted ? (
        <div className="relative z-10 h-[100dvh]">
          <PermissionScreen />
        </div>
      ) : (
        <div className="relative z-10 flex flex-col h-[100dvh]">
          <div className="flex-1 overflow-hidden relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0"
              >
                <ActiveComponent />
              </motion.div>
            </AnimatePresence>
          </div>
          <BottomNav />
        </div>
      )}
    </div>
  );
};

export default Index;
