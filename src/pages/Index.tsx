import { usePlayerStore } from '@/store/playerStore';
import LibraryView from '@/components/player/LibraryView';
import NowPlayingView from '@/components/player/NowPlayingView';
import EqualizerView from '@/components/player/EqualizerView';
import QueueView from '@/components/player/QueueView';
import SettingsView from '@/components/player/SettingsView';
import BottomNav from '@/components/player/BottomNav';
import { AnimatePresence, motion } from 'framer-motion';

const views = {
  library: LibraryView,
  nowPlaying: NowPlayingView,
  equalizer: EqualizerView,
  queue: QueueView,
  settings: SettingsView,
};

const Index = () => {
  const { activeView, bgColor, bgImage } = usePlayerStore();
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
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      {/* Phone frame */}
      <div
        className="relative w-full max-w-[390px] h-[844px] bg-card rounded-[2.5rem] border-2 border-border overflow-hidden shadow-2xl shadow-primary/5"
        style={phoneStyle}
      >
        {/* Overlay for readability when bg image is set */}
        {bgImage && (
          <div className="absolute inset-0 bg-card/70 backdrop-blur-sm z-0" />
        )}

        {/* Status bar */}
        <div className="relative z-10 flex items-center justify-between px-8 pt-3 pb-1">
          <span className="text-[11px] text-muted-foreground font-medium">9:41</span>
          <div className="flex gap-1">
            <div className="w-4 h-2 rounded-sm bg-muted-foreground/50" />
            <div className="w-4 h-2 rounded-sm bg-muted-foreground/50" />
            <div className="w-6 h-2.5 rounded-sm border border-muted-foreground/50 relative">
              <div className="absolute inset-0.5 bg-primary rounded-[1px]" style={{ width: '60%' }} />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 h-[calc(100%-4rem)]">
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

        {/* Bottom nav */}
        <div className="relative z-10">
          <BottomNav />
        </div>
      </div>
    </div>
  );
};

export default Index;
