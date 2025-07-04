// client/src/components/PWAUpdateNotification.jsx
import { useState, useEffect } from 'react';
import usePWAUpdate from '../hooks/usePWAUpdate';

export default function PWAUpdateNotification() {
  const { showUpdate, updateApp, dismissUpdate, isUpdating, isStandalone } = usePWAUpdate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (showUpdate) {
      setIsVisible(true);
    }
  }, [showUpdate]);

  if (!showUpdate || !isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 pointer-events-none">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl max-w-md w-full pointer-events-auto animate-slide-up">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
            </div>
            
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {isStandalone ? 'App Update Available' : 'New Version Available'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                {isStandalone 
                  ? 'A new version of FXsnip is ready to install with the latest features and improvements.'
                  : 'A new version is available. Update now to get the latest features.'
                }
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={updateApp}
                  disabled={isUpdating}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isUpdating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      {isStandalone ? 'Update App' : 'Update Now'}
                    </>
                  )}
                </button>
                
                {!isStandalone && (
                  <button
                    onClick={dismissUpdate}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium transition-colors"
                  >
                    Later
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}