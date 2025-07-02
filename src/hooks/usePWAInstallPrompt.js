import { useEffect, useState } from "react";

export default function usePWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detect if running as standalone (PWA)
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    );

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  return { deferredPrompt, isStandalone };
}