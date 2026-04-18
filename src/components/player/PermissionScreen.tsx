import { usePlayerStore } from '@/store/playerStore';
import { Disc, FolderOpen, Loader2, Settings, RefreshCw, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { scanDeviceMusic, pickMusicFiles, openAppSettings } from '@/services/musicScanner';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const PermissionScreen = () => {
  const { setPermissionGranted, setIsScanning, addSongs } = usePlayerStore();
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [hasTriedScan, setHasTriedScan] = useState(false);

  const handleGrantAndScan = async () => {
    setIsScanning(true);
    setPermissionDenied(false);
    try {
      if (Capacitor.isNativePlatform()) {
        const songs = await scanDeviceMusic();
        if (songs.length > 0) {
          addSongs(songs);
          toast.success(`Found ${songs.length} songs`);
          setPermissionGranted(true);
        } else {
          toast.info('No music found on device');
          setPermissionGranted(true);
        }
      } else {
        const songs = await pickMusicFiles();
        if (songs.length > 0) addSongs(songs);
        setPermissionGranted(true);
      }
    } catch (err) {
      console.error('Failed to scan music:', err);
      if (err instanceof Error && err.message === 'MUSIC_PERMISSION_DENIED') {
        setPermissionDenied(true);
        toast.error('Music permission denied. Please enable it in settings.');
      } else {
        toast.error('Failed to scan music');
      }
    } finally {
      setIsScanning(false);
      setHasTriedScan(true);
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
        className="space-y-3 w-full max-w-[280px]"
      >
        {permissionDenied ? (
          <>
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-left">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive mb-1">Permission Required</p>
                <p className="text-xs text-muted-foreground">
                  Enable <strong>Music and audio</strong> permission in app settings to scan your library.
                </p>
              </div>
            </div>

            <button
              onClick={openAppSettings}
              className="w-full py-3 px-6 bg-primary text-primary-foreground rounded-xl font-medium text-sm flex items-center justify-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Open App Settings
            </button>

            <button
              onClick={handleGrantAndScan}
              className="w-full py-3 px-6 bg-secondary text-secondary-foreground rounded-xl font-medium text-sm flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {isNative
                ? hasTriedScan
                  ? 'Tap below to scan again'
                  : 'Scanning your phone and SD card for music...'
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

            {isNative && hasTriedScan && (
              <button
                onClick={handleGrantAndScan}
                className="w-full py-3 px-6 bg-primary text-primary-foreground rounded-xl font-medium text-sm flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Rescan Music
              </button>
            )}
          </>
        )}

        <button
          onClick={() => setPermissionGranted(true)}
          className="w-full py-3 px-6 bg-secondary text-secondary-foreground rounded-xl font-medium text-sm hover:opacity-90 transition-opacity"
        >
          Continue Anyway
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
