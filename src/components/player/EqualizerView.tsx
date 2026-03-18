import { usePlayerStore } from '@/store/playerStore';
import { ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';

const BAND_LABELS = ['32', '64', '125', '250', '500', '1K', '2K', '4K', '8K', '16K'];
const PRESETS = ['Flat', 'Bass Boost', 'Rock', 'Pop', 'Jazz', 'Classical'];
const PRESET_VALUES: Record<string, number[]> = {
  'Flat': [50, 50, 50, 50, 50, 50, 50, 50, 50, 50],
  'Bass Boost': [85, 80, 70, 55, 45, 45, 50, 50, 50, 50],
  'Rock': [65, 60, 45, 40, 55, 65, 70, 65, 60, 55],
  'Pop': [45, 50, 60, 70, 75, 70, 60, 50, 45, 45],
  'Jazz': [55, 50, 45, 60, 65, 65, 60, 55, 50, 50],
  'Classical': [50, 55, 60, 65, 55, 45, 50, 65, 70, 65],
};

const EqualizerView = () => {
  const { equalizerBands, setEqualizerBand, setActiveView } = usePlayerStore();

  const applyPreset = (name: string) => {
    const values = PRESET_VALUES[name];
    values.forEach((v, i) => setEqualizerBand(i, v));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <button onClick={() => setActiveView('nowPlaying')}>
          <ChevronDown className="w-6 h-6 text-foreground" />
        </button>
        <h2 className="text-lg font-display font-bold">Equalizer</h2>
        <div className="w-6" />
      </div>

      {/* Presets */}
      <div className="flex gap-2 px-5 pb-6 overflow-x-auto no-scrollbar">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => applyPreset(p)}
            className="px-3 py-1.5 text-xs font-medium rounded-full bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors whitespace-nowrap"
          >
            {p}
          </button>
        ))}
      </div>

      {/* EQ Bars */}
      <div className="flex-1 flex items-end justify-center gap-3 px-6 pb-8">
        {equalizerBands.map((value, i) => (
          <div key={i} className="flex flex-col items-center gap-2 flex-1">
            <div className="h-48 w-full flex flex-col-reverse relative bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="w-full bg-gradient-to-t from-primary to-primary/60 rounded-full"
                style={{ height: `${value}%` }}
                animate={{ height: `${value}%` }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
              <input
                type="range"
                min="0"
                max="100"
                value={value}
                onChange={(e) => setEqualizerBand(i, Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                style={{ writingMode: 'vertical-lr', direction: 'rtl' } as React.CSSProperties}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">{BAND_LABELS[i]}</span>
          </div>
        ))}
      </div>

      {/* dB labels */}
      <div className="flex justify-between px-8 pb-6">
        <span className="text-xs text-muted-foreground">-12dB</span>
        <span className="text-xs text-muted-foreground">0dB</span>
        <span className="text-xs text-muted-foreground">+12dB</span>
      </div>
    </div>
  );
};

export default EqualizerView;
