import { useEffect, useState } from 'react';
import PWAUtils from '../utils/pwaUtils';

export const useDesktopPWA = () => {
  const [isPWA, setIsPWA] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [titleBarRect, setTitleBarRect] = useState(null);
  const [storageEstimate, setStorageEstimate] = useState(null);

  useEffect(() => {
    setIsPWA(PWAUtils.isPWA());
    setIsDesktop(PWAUtils.isDesktop());

    // Initialize desktop PWA features
    PWAUtils.initDesktopPWA();

    // Get storage estimate
    PWAUtils.getStorageEstimate().then(estimate => {
      setStorageEstimate(estimate);
    });

    // Listen for title bar changes
    const handleTitleBarChange = (e) => {
      setTitleBarRect(e.detail);
    };

    window.addEventListener('pwa-titlebar-change', handleTitleBarChange);

    return () => {
      window.removeEventListener('pwa-titlebar-change', handleTitleBarChange);
    };
  }, []);

  const shareContent = async (data) => {
    return await PWAUtils.shareContent(data);
  };

  const setupFileDrop = (callback) => {
    PWAUtils.setupFileDrop(callback);
  };

  return {
    isPWA,
    isDesktop,
    titleBarRect,
    storageEstimate,
    shareContent,
    setupFileDrop,
    isDesktopPWA: isPWA && isDesktop
  };
};

export default useDesktopPWA;
