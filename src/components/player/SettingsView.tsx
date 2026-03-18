import { usePlayerStore } from '@/store/playerStore';
import { Settings, Upload, Palette, X, User } from 'lucide-react';
import { useRef } from 'react';

const BG_COLORS = [
  { name: 'Default', value: '' },
  { name: 'Charcoal', value: '#1a1a2e' },
  { name: 'Deep Navy', value: '#0a0a1a' },
  { name: 'Wine', value: '#2a0a0a' },
  { name: 'Forest', value: '#0a1a0a' },
  { name: 'Midnight', value: '#0d0d2b' },
  { name: 'Smoke', value: '#1c1c1c' },
  { name: 'Plum', value: '#1a0a2a' },
  { name: 'Coffee', value: '#1a1208' },
];

const SettingsView = () => {
  const { bgColor, bgImage, setBgColor, setBgImage } = usePlayerStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setBgImage(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-4">
        <Settings className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-display font-bold tracking-tight">Settings</h1>
      </div>

      {/* App Branding */}
      <div className="flex flex-col items-center py-8 px-5">
        <div className="relative mb-4">
          <h2 className="text-5xl font-display font-extrabold tracking-tighter leading-none">
            <span className="text-primary">BOB</span>
          </h2>
          <h2 className="text-5xl font-display font-extrabold tracking-tighter leading-none -mt-1">
            <span className="text-foreground">EVAN</span>
          </h2>
          <div className="absolute -inset-4 bg-primary/5 rounded-2xl -z-10 blur-xl" />
        </div>
        <div className="flex items-center gap-1.5 mt-2">
          <div className="w-8 h-[1px] bg-primary/40" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-[0.3em] font-medium">Music Player</span>
          <div className="w-8 h-[1px] bg-primary/40" />
        </div>
        <div className="flex items-center gap-1.5 mt-6 opacity-70">
          <User className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-body">
            Developed by <span className="text-primary/80 font-medium">Ayoub Sadkouni</span>
          </span>
        </div>
      </div>

      {/* Background Color */}
      <div className="px-5 mt-4">
        <div className="flex items-center gap-2 mb-3">
          <Palette className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-display font-semibold">Background Color</h3>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {BG_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => setBgColor(c.value)}
              className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all ${
                bgColor === c.value && !bgImage
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-muted-foreground/30'
              }`}
            >
              <div
                className="w-5 h-5 rounded-full border border-border shrink-0"
                style={{ backgroundColor: c.value || 'hsl(0 0% 8%)' }}
              />
              <span className="text-[11px] text-foreground truncate">{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Background Image */}
      <div className="px-5 mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Upload className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-display font-semibold">Background Image</h3>
        </div>

        {bgImage ? (
          <div className="relative rounded-xl overflow-hidden border border-border">
            <img src={bgImage} alt="Background" className="w-full h-32 object-cover" />
            <button
              onClick={() => setBgImage(null)}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-card/80 backdrop-blur flex items-center justify-center border border-border"
            >
              <X className="w-3.5 h-3.5 text-foreground" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full h-28 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary/40 transition-colors"
          >
            <Upload className="w-6 h-6 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Tap to upload image</span>
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>

      {/* Version */}
      <div className="px-5 mt-8 text-center">
        <p className="text-[10px] text-muted-foreground/50">Bob Evan v1.0.0</p>
      </div>
    </div>
  );
};

export default SettingsView;
