import { usePlayerStore } from '@/store/playerStore';
import { Music, Disc, FolderOpen, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { scanDeviceMusic, pickMusicFiles } from '@/services/musicScanner';
import { useEffect } from 'react';

const PermissionScreen = () => {
  const { setPermissionGranted, setIsScanning, addSongs } = usePlayerStore();

  const handleGrantAndScan = async () => {
    setIsScanning(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const songs = await scanDeviceMusic();
        if (songs.length > 0) addSongs(songs);
      } else {
        const songs = await pickMusicFiles();
        if (songs.length > 0) addSongs(songs);
      }
      setPermissionGranted(true);
    } catch (err) {
      console.error('Failed to scan music:', err);
    } finally {
      setIsScanning(false);
    }
  };

  // Auto-scan on native platforms
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      handleGrantAndScan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isNative = Capacitor.isNativePlatform();

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center">
      {/* Logo */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', duration: 0.8 }}
        className="w-24 h-24 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center mb-6"
      >
        <Disc className="w-12 h-12 text-primary" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h1 className="font-display text-3xl font-bold mb-1">
          <span className="text-primary">BOB</span>{' '}
          <span className="text-foreground">EVAN</span>
        </h1>
        <p className="text-xs text-muted-foreground mb-6">by Ayoub Sadkouni</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="space-y-3 w-full max-w-[260px]"
      >
        <p className="text-sm text-muted-foreground mb-4">
          {isNative
            ? 'Scanning your phone and SD card for music...'
            : 'Grant access to your music library to start listening'}
        </p>

        {!isNative && (
          <button
            onClick={handleGrantAndScan}
            className="w-full py-3 px-6 bg-primary text-primary-foreground rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            <FolderOpen className="w-4 h-4" />
            Select Music Files
          </button>
        )}

        <button
          onClick={() => setPermissionGranted(true)}
          className="w-full py-3 px-6 bg-secondary text-secondary-foreground rounded-xl font-medium text-sm hover:opacity-90 transition-opacity"
        >
          Skip for Now
        </button>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-[10px] text-muted-foreground mt-8"
      >
        Your music stays on your device. We never upload your files.
      </motion.p>
    </div>
  );
};

export const ScanningOverlay = () => {
  const { isScanning } = usePlayerStore();
  if (!isScanning) return null;

  return (
    <div className="absolute inset-0 bg-background/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-10 h-10 text-primary animate-spin" />
      <p className="text-sm text-muted-foreground">Scanning your music...</p>
    </div>
  );
};

export default PermissionScreen;
