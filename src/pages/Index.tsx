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

const views = {
  library: LibraryView,
  nowPlaying: NowPlayingView,
  equalizer: EqualizerView,
  queue: QueueView,
  settings: SettingsView,
};

const Index = () => {
  const { activeView, bgColor, bgImage, permissionGranted } = usePlayerStore();
  useAudioPlayer(); // Mount global audio playback
  const ActiveComponent = views[activeView];

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
