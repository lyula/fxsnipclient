import { useEffect, useState } from "react";

// You may want to update this version string on each deploy
const APP_VERSION = '1.0.0';

export default function usePWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [hasInstalled, setHasInstalled] = useState(false);

  useEffect(() => {
    // Detect if running as standalone (PWA)
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    );

    // Check if this version is already installed
    const installedVersion = localStorage.getItem('pwa_installed_version');
    if (installedVersion === APP_VERSION) {
      setHasInstalled(true);
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Listen for appinstalled event to store version
    const onAppInstalled = () => {
      localStorage.setItem('pwa_installed_version', APP_VERSION);
      setHasInstalled(true);
    };
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  return { deferredPrompt, isStandalone, hasInstalled };
}