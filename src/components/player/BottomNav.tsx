import { usePlayerStore } from '@/store/playerStore';
import { Library, Disc3, SlidersHorizontal, ListMusic } from 'lucide-react';

const tabs = [
  { id: 'library' as const, icon: Library, label: 'Library' },
  { id: 'nowPlaying' as const, icon: Disc3, label: 'Playing' },
  { id: 'equalizer' as const, icon: SlidersHorizontal, label: 'EQ' },
  { id: 'queue' as const, icon: ListMusic, label: 'Queue' },
];

const BottomNav = () => {
  const { activeView, setActiveView } = usePlayerStore();

  return (
    <nav className="absolute bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border flex justify-around py-2">
      {tabs.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => setActiveView(id)}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
            activeView === id ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <Icon className="w-5 h-5" />
          <span className="text-[10px] font-medium">{label}</span>
        </button>
      ))}
    </nav>
  );
};

export default BottomNav;
