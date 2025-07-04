// client/src/hooks/usePWAUpdate.js
import { useState, useEffect } from 'react';
import usePWAInstallPrompt from './usePWAInstallPrompt';

export default function usePWAUpdate() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [newWorker, setNewWorker] = useState(null);
  const { isStandalone } = usePWAInstallPrompt();

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Listen for service worker updates
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service worker updated');
        if (isUpdating) {
          window.location.reload();
        }
      });

      // Listen for waiting service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SW_UPDATE_AVAILABLE') {
          setNewWorker(event.data.worker || navigator.serviceWorker.waiting);
          setShowUpdate(true);
        }
      });

      // Check for updates periodically (every 30 seconds for PWA users)
      if (isStandalone) {
        const checkForUpdates = () => {
          navigator.serviceWorker.getRegistration().then((registration) => {
            if (registration) {
              registration.update();
            }
          });
        };

        // Check immediately
        checkForUpdates();
        
        // Check every 30 seconds
        const interval = setInterval(checkForUpdates, 30000);
        
        return () => clearInterval(interval);
      }
    }
  }, [isStandalone, isUpdating]);

  // Handle legacy update event
  useEffect(() => {
    const handleSWUpdate = () => {
      setShowUpdate(true);
    };

    document.addEventListener('swUpdated', handleSWUpdate);
    return () => document.removeEventListener('swUpdated', handleSWUpdate);
  }, []);

  const updateApp = () => {
    if (newWorker) {
      setIsUpdating(true);
      newWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      // Fallback: just reload
      window.location.reload();
    }
    setShowUpdate(false);
  };

  const dismissUpdate = () => {
    setShowUpdate(false);
    setNewWorker(null);
  };

  return {
    showUpdate,
    updateApp,
    dismissUpdate,
    isUpdating,
    isStandalone
  };
}