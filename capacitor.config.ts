import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.800ae548c16a4f31b2cf9fbcd408a19d',
  appName: 'csplantaopro',
  webDir: 'dist',
  server: {
    url: 'https://800ae548-c16a-4f31-b2cf-9fbcd408a19d.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,
      launchAutoHide: true,
      launchFadeOutDuration: 400,
      backgroundColor: '#050810',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#f59e0b',
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
