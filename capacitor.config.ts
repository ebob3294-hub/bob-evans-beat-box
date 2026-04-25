import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.8ca1e3eb35ee4645b29d33775c572a63',
  appName: 'Bob Evan',
  webDir: 'dist',
  server: {
    url: 'https://8ca1e3eb-35ee-4645-b29d-33775c572a63.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  android: {
    backgroundColor: '#0d0d0d',
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    // Keep WebView alive in the background so audio routing to Bluetooth
    // speakers (Baffles, JBL, car kits) stays stable when the screen is off
    appendUserAgent: 'BobEvanPlayer/1.0',
  },
  ios: {
    backgroundColor: '#0d0d0d',
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0d0d0d',
      overlaysWebView: true,
    },
  },
};

export default config;
