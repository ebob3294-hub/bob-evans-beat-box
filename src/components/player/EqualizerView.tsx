import { usePlayerStore } from '@/store/playerStore';
import { ChevronDown, RotateCcw, Power, Waves, Radio, Maximize2, Volume2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

const BAND_LABELS = ['32', '64', '125', '250', '500', '1K', '2K', '4K', '8K', '16K'];
const PRESETS = ['Flat', 'Bass Boost', 'Rock', 'Pop', 'Jazz', 'Classical', 'Vocal', 'Electronic'];
const PRESET_VALUES: Record<string, number[]> = {
  'Flat': [50, 50, 50, 50, 50, 50, 50, 50, 50, 50],
  'Bass Boost': [85, 80, 70, 55, 45, 45, 50, 50, 50, 50],
  'Rock': [65, 60, 45, 40, 55, 65, 70, 65, 60, 55],
  'Pop': [45, 50, 60, 70, 75, 70, 60, 50, 45, 45],
  'Jazz': [55, 50, 45, 60, 65, 65, 60, 55, 50, 50],
  'Classical': [50, 55, 60, 65, 55, 45, 50, 65, 70, 65],
  'Vocal': [40, 45, 50, 60, 70, 75, 70, 60, 50, 45],
  'Electronic': [75, 70, 55, 45, 40, 50, 55, 65, 75, 80],
};

interface EffectSliderProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  unit?: string;
  disabled?: boolean;
}

const EffectSlider = ({ icon, label, value, onChange, min = 0, max = 100, unit = '%', disabled }: EffectSliderProps) => (
  <div className={`bg-card/50 border border-border rounded-xl p-3 transition-opacity ${disabled ? 'opacity-50' : ''}`}>
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <div className="text-primary">{icon}</div>
        <span className="text-xs font-medium text-foreground">{label}</span>
      </div>
      <span className="text-[10px] text-muted-foreground tabular-nums">
        {value}{unit}
      </span>
    </div>
    <Slider
      value={[value]}
      min={min}
      max={max}
      step={1}
      disabled={disabled}
      onValueChange={(v) => onChange(v[0])}
      className="w-full"
    />
  </div>
);

const EqualizerView = () => {
  const {
    equalizerBands,
    setEqualizerBand,
    setActiveView,
    bassBoost,
    virtualizer,
    reverb,
    loudness,
    effectsEnabled,
    setBassBoost,
    setVirtualizer,
    setReverb,
    setLoudness,
    setEffectsEnabled,
    resetEffects,
  } = usePlayerStore();

  const applyPreset = (name: string) => {
    const values = PRESET_VALUES[name];
    values.forEach((v, i) => setEqualizerBand(i, v));
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4 sticky top-0 bg-background/80 backdrop-blur-md z-10">
        <button onClick={() => setActiveView('nowPlaying')} aria-label="Close equalizer">
          <ChevronDown className="w-6 h-6 text-foreground" />
        </button>
        <h2 className="text-lg font-display font-bold">Equalizer & Effects</h2>
        <button onClick={resetEffects} aria-label="Reset effects">
          <RotateCcw className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
        </button>
      </div>

      {/* Master enable */}
      <div className="mx-5 mb-4 flex items-center justify-between bg-card/50 border border-border rounded-xl p-3">
        <div className="flex items-center gap-2">
          <Power className={`w-4 h-4 ${effectsEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className="text-sm font-medium text-foreground">Audio Effects</span>
        </div>
        <Switch checked={effectsEnabled} onCheckedChange={setEffectsEnabled} />
      </div>

      {/* Presets */}
      <div className="flex gap-2 px-5 pb-4 overflow-x-auto no-scrollbar">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => applyPreset(p)}
            disabled={!effectsEnabled}
            className="px-3 py-1.5 text-xs font-medium rounded-full bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors whitespace-nowrap disabled:opacity-50"
          >
            {p}
          </button>
        ))}
      </div>

      {/* EQ Bars */}
      <div className={`flex items-end justify-center gap-2 px-5 pb-3 transition-opacity ${effectsEnabled ? '' : 'opacity-50'}`}>
        {equalizerBands.map((value, i) => (
          <div key={i} className="flex flex-col items-center gap-2 flex-1 max-w-[40px]">
            <div className="h-40 w-full flex flex-col-reverse relative bg-secondary rounded-full overflow-hidden">
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
                disabled={!effectsEnabled}
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
      <div className="flex justify-between px-6 pb-5">
        <span className="text-[10px] text-muted-foreground">-8dB</span>
        <span className="text-[10px] text-muted-foreground">0dB</span>
        <span className="text-[10px] text-muted-foreground">+8dB</span>
      </div>

      {/* Effects section */}
      <div className="px-5 space-y-2.5">
        <h3 className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Sound Effects
        </h3>

        <EffectSlider
          icon={<Waves className="w-3.5 h-3.5" />}
          label="Bass Boost"
          value={bassBoost}
          onChange={setBassBoost}
          disabled={!effectsEnabled}
        />

        <EffectSlider
          icon={<Maximize2 className="w-3.5 h-3.5" />}
          label="Stereo Widener"
          value={virtualizer}
          onChange={setVirtualizer}
          disabled={!effectsEnabled}
        />

        <EffectSlider
          icon={<Radio className="w-3.5 h-3.5" />}
          label="Reverb (Hall)"
          value={reverb}
          onChange={setReverb}
          disabled={!effectsEnabled}
        />

        <EffectSlider
          icon={<Volume2 className="w-3.5 h-3.5" />}
          label="Loudness"
          value={loudness}
          onChange={setLoudness}
          min={0}
          max={100}
        />
      </div>
    </div>
  );
};

export default EqualizerView;
