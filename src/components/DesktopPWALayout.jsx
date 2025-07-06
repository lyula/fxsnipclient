import React, { useEffect } from 'react';
import { useDesktopPWA } from '../hooks/useDesktopPWA';
import { useNavigate } from 'react-router-dom';

export default function DesktopPWALayout({ children }) {
  const { isDesktopPWA, setupFileDrop, shareContent } = useDesktopPWA();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isDesktopPWA) return;

    // Set up keyboard shortcuts
    const handleKeyboardShortcuts = (e) => {
      // Global keyboard shortcuts for desktop PWA
      if ((e.ctrlKey || e.metaKey)) {
        switch (e.key) {
          case 'k':
            e.preventDefault();
            // Focus search if available
            const searchInput = document.querySelector('[data-search-input]');
            if (searchInput) {
              searchInput.focus();
            }
            break;
          case 'n':
            e.preventDefault();
            // Navigate to create new post/entry
            navigate('/dashboard/journal');
            break;
          case 'd':
            e.preventDefault();
            // Navigate to dashboard
            navigate('/dashboard');
            break;
          case '1':
            e.preventDefault();
            navigate('/dashboard');
            break;
          case '2':
            e.preventDefault();
            navigate('/dashboard/community');
            break;
          case '3':
            e.preventDefault();
            navigate('/dashboard/journal');
            break;
          case '4':
            e.preventDefault();
            navigate('/dashboard/stats');
            break;
        }
      }
    };

    // Set up file drop handling
    const handleFileDrop = (files) => {
      // Handle dropped files (CSV, JSON, images)
      console.log('Files dropped:', files);
      
      // If on journal page, import data
      if (window.location.pathname.includes('/journal')) {
        const dataFiles = files.filter(f => f.type === 'text/csv' || f.type === 'application/json');
        if (dataFiles.length > 0) {
          // Trigger import process
          const importEvent = new CustomEvent('pwa-import-data', { detail: dataFiles });
          window.dispatchEvent(importEvent);
        }
      }

      // Handle image uploads
      const imageFiles = files.filter(f => f.type.startsWith('image/'));
      if (imageFiles.length > 0) {
        const imageUploadEvent = new CustomEvent('pwa-upload-images', { detail: imageFiles });
        window.dispatchEvent(imageUploadEvent);
      }
    };

    // Set up event listeners
    document.addEventListener('keydown', handleKeyboardShortcuts);
    setupFileDrop(handleFileDrop);

    // PWA-specific event listeners
    const handleAppStateChange = (e) => {
      switch (e.type) {
        case 'pwa-app-focus':
          // Refresh data when app comes into focus
          console.log('PWA gained focus');
          break;
        case 'pwa-app-hidden':
          // Save state when app is hidden
          console.log('PWA hidden');
          break;
      }
    };

    window.addEventListener('pwa-app-focus', handleAppStateChange);
    window.addEventListener('pwa-app-hidden', handleAppStateChange);

    return () => {
      document.removeEventListener('keydown', handleKeyboardShortcuts);
      window.removeEventListener('pwa-app-focus', handleAppStateChange);
      window.removeEventListener('pwa-app-hidden', handleAppStateChange);
    };
  }, [isDesktopPWA, navigate, setupFileDrop]);

  // Add PWA-specific context menu
  useEffect(() => {
    if (!isDesktopPWA) return;

    const handleContextMenu = (e) => {
      // Custom context menu for PWA
      e.preventDefault();
      
      // Create custom context menu
      const contextMenu = document.createElement('div');
      contextMenu.className = 'fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl z-50 py-2';
      contextMenu.style.left = `${e.clientX}px`;
      contextMenu.style.top = `${e.clientY}px`;

      const menuItems = [
        { label: 'Share Page', action: () => {
          shareContent({
            title: document.title,
            url: window.location.href,
            text: 'Check out this page on Journalyze'
          });
        }},
        { label: 'Refresh', action: () => window.location.reload() },
        { label: 'Dashboard', action: () => navigate('/dashboard') }
      ];

      menuItems.forEach(item => {
        const menuItem = document.createElement('button');
        menuItem.className = 'block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700';
        menuItem.textContent = item.label;
        menuItem.onclick = () => {
          item.action();
          document.body.removeChild(contextMenu);
        };
        contextMenu.appendChild(menuItem);
      });

      document.body.appendChild(contextMenu);

      // Remove context menu when clicking elsewhere
      const removeContextMenu = () => {
        if (document.body.contains(contextMenu)) {
          document.body.removeChild(contextMenu);
        }
        document.removeEventListener('click', removeContextMenu);
      };

      setTimeout(() => {
        document.addEventListener('click', removeContextMenu);
      }, 0);
    };

    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [isDesktopPWA, navigate, shareContent]);

  if (!isDesktopPWA) {
    return children;
  }

  return (
    <div className="desktop-pwa-container">
      <div className="desktop-pwa-main selectable-text">
        {children}
      </div>
      
      {/* Desktop PWA Status Bar */}
      <div className="hidden desktop-pwa-status-bar bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-1 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center justify-between">
          <span>Journalyze PWA • Desktop Mode</span>
          <div className="flex items-center gap-4">
            <span>Ctrl+K: Search</span>
            <span>Ctrl+N: New Entry</span>
            <span>Ctrl+D: Dashboard</span>
          </div>
        </div>
      </div>
    </div>
  );
}
