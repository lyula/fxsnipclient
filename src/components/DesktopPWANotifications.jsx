import React, { useState, useEffect } from 'react';
import { FaBell, FaTimes, FaDesktop } from 'react-icons/fa';
import { useDesktopPWA } from '../hooks/useDesktopPWA';

export default function DesktopPWANotifications() {
  const { isDesktopPWA } = useDesktopPWA();
  const [notifications, setNotifications] = useState([]);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    if (!isDesktopPWA) return;

    // Check notification permission
    if ('Notification' in window) {
      setHasPermission(Notification.permission === 'granted');
    }

    // Listen for notification events
    const handleNotificationRequest = async (e) => {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        setHasPermission(permission === 'granted');
      }

      if (Notification.permission === 'granted') {
        const notification = new Notification(e.detail.title, {
          body: e.detail.body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: e.detail.tag || 'journalyze-notification',
          requireInteraction: e.detail.requireInteraction || false,
          actions: e.detail.actions || []
        });

        notification.onclick = () => {
          window.focus();
          if (e.detail.url) {
            window.location.href = e.detail.url;
          }
          notification.close();
        };

        // Auto close after 5 seconds unless requireInteraction is true
        if (!e.detail.requireInteraction) {
          setTimeout(() => notification.close(), 5000);
        }
      } else {
        // Fallback to in-app notification
        addInAppNotification(e.detail);
      }
    };

    const addInAppNotification = (notificationData) => {
      const id = Date.now();
      const notification = {
        id,
        ...notificationData,
        timestamp: new Date()
      };

      setNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep max 5 notifications

      // Auto remove after 5 seconds
      setTimeout(() => {
        removeNotification(id);
      }, 5000);
    };

    window.addEventListener('pwa-send-notification', handleNotificationRequest);

    // Example: Listen for various app events to send notifications
    const handleAppEvents = (e) => {
      switch (e.type) {
        case 'pwa-new-message':
          window.dispatchEvent(new CustomEvent('pwa-send-notification', {
            detail: {
              title: 'New Message',
              body: e.detail.message,
              icon: '/pwa-192x192.png',
              url: '/dashboard/community'
            }
          }));
          break;
        case 'pwa-trade-alert':
          window.dispatchEvent(new CustomEvent('pwa-send-notification', {
            detail: {
              title: 'Trade Alert',
              body: e.detail.message,
              icon: '/pwa-192x192.png',
              url: '/dashboard/journal',
              requireInteraction: true
            }
          }));
          break;
        case 'pwa-data-sync':
          addInAppNotification({
            title: 'Data Synced',
            body: 'Your data has been synchronized',
            type: 'success'
          });
          break;
      }
    };

    window.addEventListener('pwa-new-message', handleAppEvents);
    window.addEventListener('pwa-trade-alert', handleAppEvents);
    window.addEventListener('pwa-data-sync', handleAppEvents);

    return () => {
      window.removeEventListener('pwa-send-notification', handleNotificationRequest);
      window.removeEventListener('pwa-new-message', handleAppEvents);
      window.removeEventListener('pwa-trade-alert', handleAppEvents);
      window.removeEventListener('pwa-data-sync', handleAppEvents);
    };
  }, [isDesktopPWA]);

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setHasPermission(permission === 'granted');
      
      if (permission === 'granted') {
        // Send a test notification
        new Notification('Notifications Enabled', {
          body: 'You\'ll now receive desktop notifications from Journalyze',
          icon: '/pwa-192x192.png'
        });
      }
    }
  };

  if (!isDesktopPWA) return null;

  return (
    <>
      {/* Notification Permission Prompt */}
      {!hasPermission && 'Notification' in window && Notification.permission === 'default' && (
        <div className="fixed top-4 right-4 z-50 max-w-sm">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <FaBell className="text-blue-500 text-xl" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Enable Notifications
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  Get desktop notifications for messages, trade alerts, and updates.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={requestNotificationPermission}
                    className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1 rounded transition-colors"
                  >
                    Enable
                  </button>
                  <button
                    onClick={() => setHasPermission(null)} // Hide the prompt
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-sm px-3 py-1 transition-colors"
                  >
                    Not now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* In-App Notifications */}
      <div className="fixed top-20 right-4 z-40 space-y-2 max-w-sm">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 animate-slide-in-right"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  {notification.type === 'success' ? (
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <FaDesktop className="text-blue-600 dark:text-blue-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                    {notification.title}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {notification.body}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    {notification.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-2"
              >
                <FaTimes size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// CSS for slide-in animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slide-in-right {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  .animate-slide-in-right {
    animation: slide-in-right 0.3s ease-out;
  }
`;
document.head.appendChild(style);
