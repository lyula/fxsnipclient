import React, { useState, useEffect } from 'react';
import { FaDownload, FaTimes, FaDesktop, FaMobile } from 'react-icons/fa';
import usePWAInstallPrompt from '../hooks/usePWAInstallPrompt';
import { useLocation } from 'react-router-dom';

export default function PWAInstallPrompt() {
  const { deferredPrompt, isStandalone } = usePWAInstallPrompt();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [installMethod, setInstallMethod] = useState('');
  const location = useLocation();

  useEffect(() => {
    // Detect if desktop
    const isDesktopDevice = window.innerWidth >= 1024 && 
      !(/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    
    setIsDesktop(isDesktopDevice);

    // Show prompt after a delay if not standalone and we have a deferred prompt
    if (deferredPrompt && !isStandalone) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000); // Show after 3 seconds

      return () => clearTimeout(timer);
    }
  }, [deferredPrompt, isStandalone]);

  useEffect(() => {
    // Detect browser for install instructions
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
      setInstallMethod('chrome');
    } else if (userAgent.includes('firefox')) {
      setInstallMethod('firefox');
    } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
      setInstallMethod('safari');
    } else if (userAgent.includes('edg')) {
      setInstallMethod('edge');
    } else {
      setInstallMethod('generic');
    }
  }, []);

  // Only show on /login route (after all hooks)
  if (location.pathname !== '/login') {
    return null;
  }

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('PWA installed');
      }
      setShowPrompt(false);
    }
  };

  const getInstallInstructions = () => {
    if (isDesktop) {
      switch (installMethod) {
        case 'chrome':
          return (
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <p className="mb-2">To install Journalyze on your desktop:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Click the install icon in your browser's address bar</li>
                <li>Or click the menu (⋮) → "Install Journalyze..."</li>
                <li>Click "Install" in the popup</li>
              </ol>
            </div>
          );
        case 'edge':
          return (
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <p className="mb-2">To install Journalyze on your desktop:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Click the "Apps" icon in your browser toolbar</li>
                <li>Click "Install this site as an app"</li>
                <li>Click "Install" in the dialog</li>
              </ol>
            </div>
          );
        case 'firefox':
          return (
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <p className="mb-2">Firefox desktop PWA support:</p>
              <p>Firefox has limited PWA support on desktop. For the best experience, try Chrome or Edge.</p>
            </div>
          );
        default:
          return (
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <p>Your browser may support installing this app. Look for an install option in your browser menu.</p>
            </div>
          );
      }
    } else {
      return (
        <div className="text-sm text-gray-600 dark:text-gray-300">
          <p className="mb-2">To install Journalyze on your device:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Tap the share button in your browser</li>
            <li>Look for "Add to Home Screen" or "Install App"</li>
            <li>Tap "Add" or "Install"</li>
          </ol>
        </div>
      );
    }
  };

  if (isStandalone || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {isDesktop ? <FaDesktop className="text-blue-500" /> : <FaMobile className="text-blue-500" />}
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Install Journalyze
            </h3>
          </div>
          <button
            onClick={() => setShowPrompt(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <FaTimes size={16} />
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
          Get the full app experience with offline access, notifications, and faster loading.
        </p>

        {deferredPrompt ? (
          <>
            <button
              onClick={handleInstall}
              className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors mb-2"
            >
              <FaDownload size={16} />
              Install App
            </button>
            <button
              onClick={() => setShowPrompt(false)}
              className="w-full flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Not Now
            </button>
          </>
        ) : (
          <div>
            {getInstallInstructions()}
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {isDesktop ? 'Desktop PWA' : 'Mobile PWA'} • Works offline • Fast & secure
          </p>
        </div>
      </div>
    </div>
  );
}
