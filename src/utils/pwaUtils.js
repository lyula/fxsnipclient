// Desktop PWA utilities for enhanced functionality
export const PWAUtils = {
  // Check if running as PWA
  isPWA() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true ||
           document.referrer.includes('android-app://');
  },

  // Check if desktop
  isDesktop() {
    return window.innerWidth >= 1024 && 
           !(/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
  },

  // Check if mobile
  isMobile() {
    return window.innerWidth < 1024 || 
           /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  },

  // Get browser type
  getBrowser() {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('chrome') && !userAgent.includes('edg')) return 'chrome';
    if (userAgent.includes('firefox')) return 'firefox';
    if (userAgent.includes('safari') && !userAgent.includes('chrome')) return 'safari';
    if (userAgent.includes('edg')) return 'edge';
    return 'unknown';
  },

  // Check if browser supports PWA installation
  supportsPWAInstall() {
    return 'serviceWorker' in navigator && 'BeforeInstallPromptEvent' in window;
  },

  // Handle keyboard shortcuts for PWA
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + K for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // Trigger search functionality
        const searchEvent = new CustomEvent('pwa-search-shortcut');
        window.dispatchEvent(searchEvent);
      }

      // Ctrl/Cmd + N for new post/entry
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        const newEntryEvent = new CustomEvent('pwa-new-entry-shortcut');
        window.dispatchEvent(newEntryEvent);
      }

      // Ctrl/Cmd + D for dashboard
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        const dashboardEvent = new CustomEvent('pwa-dashboard-shortcut');
        window.dispatchEvent(dashboardEvent);
      }
    });
  },

  // Handle file drops for PWA
  setupFileDrop(callback) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      document.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    document.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
      const files = Array.from(e.dataTransfer.files);
      const supportedFiles = files.filter(file => 
        file.type === 'text/csv' || 
        file.type === 'application/json' ||
        file.type.startsWith('image/')
      );

      if (supportedFiles.length > 0 && callback) {
        callback(supportedFiles);
      }
    }
  },

  // Request persistent storage for PWA
  async requestPersistentStorage() {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      try {
        const granted = await navigator.storage.persist();
        if (granted) {
          console.log('Persistent storage granted');
        }
        return granted;
      } catch (error) {
        console.error('Failed to request persistent storage:', error);
        return false;
      }
    }
    return false;
  },

  // Get storage usage estimate
  async getStorageEstimate() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        return await navigator.storage.estimate();
      } catch (error) {
        console.error('Failed to get storage estimate:', error);
        return null;
      }
    }
    return null;
  },

  // Share content using Web Share API or fallback
  async shareContent(data) {
    if (navigator.share) {
      try {
        await navigator.share(data);
        return true;
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
        return false;
      }
    } else {
      // Fallback to clipboard
      try {
        const text = `${data.title}\n${data.text}\n${data.url}`;
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        return false;
      }
    }
  },

  // Handle app state changes
  setupAppStateHandling() {
    // Handle visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // App hidden - pause heavy operations
        const appHiddenEvent = new CustomEvent('pwa-app-hidden');
        window.dispatchEvent(appHiddenEvent);
      } else {
        // App visible - resume operations
        const appVisibleEvent = new CustomEvent('pwa-app-visible');
        window.dispatchEvent(appVisibleEvent);
      }
    });

    // Handle focus changes
    window.addEventListener('focus', () => {
      const appFocusEvent = new CustomEvent('pwa-app-focus');
      window.dispatchEvent(appFocusEvent);
    });

    window.addEventListener('blur', () => {
      const appBlurEvent = new CustomEvent('pwa-app-blur');
      window.dispatchEvent(appBlurEvent);
    });
  },

  // Initialize desktop PWA features
  initDesktopPWA() {
    if (this.isPWA() && this.isDesktop()) {
      this.setupKeyboardShortcuts();
      this.setupAppStateHandling();
      this.requestPersistentStorage();
      
      // Set up custom title bar handling if supported
      if ('windowControlsOverlay' in navigator) {
        navigator.windowControlsOverlay.addEventListener('geometrychange', () => {
          const titleBarEvent = new CustomEvent('pwa-titlebar-change', {
            detail: navigator.windowControlsOverlay.getTitlebarAreaRect()
          });
          window.dispatchEvent(titleBarEvent);
        });
      }
    }
  }
};

export default PWAUtils;
