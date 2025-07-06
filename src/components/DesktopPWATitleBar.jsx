import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaHome, FaUsers, FaBook, FaChartLine } from 'react-icons/fa';
import { useDesktopPWA } from '../hooks/useDesktopPWA';

export default function DesktopPWATitleBar() {
  const { isDesktopPWA, titleBarRect } = useDesktopPWA();
  const location = useLocation();
  const navigate = useNavigate();

  if (!isDesktopPWA) return null;

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/dashboard/community')) return 'Community';
    if (path.includes('/dashboard/journal')) return 'Journal';
    if (path.includes('/dashboard/stats')) return 'Statistics';
    if (path.includes('/dashboard')) return 'Dashboard';
    if (path.includes('/login')) return 'Sign In';
    if (path.includes('/register')) return 'Sign Up';
    return 'Journalyze';
  };

  const canGoBack = window.history.length > 1;

  const titleBarStyle = titleBarRect ? {
    left: titleBarRect.x,
    width: titleBarRect.width,
    height: titleBarRect.height,
  } : {};

  return (
    <div className="app-titlebar" style={titleBarStyle}>
      <div className="app-titlebar-content">
        <div className="flex items-center gap-3">
          {/* Back button */}
          {canGoBack && (
            <button
              onClick={() => navigate(-1)}
              className="p-1 rounded hover:bg-black hover:bg-opacity-10 dark:hover:bg-white dark:hover:bg-opacity-10 transition-colors"
              title="Go Back"
            >
              <FaArrowLeft size={14} />
            </button>
          )}

          {/* App icon/logo */}
          <div className="flex items-center gap-2">
            <img 
              src="/pwa-192x192.png" 
              alt="Journalyze" 
              className="w-5 h-5 rounded"
            />
            <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">
              {getPageTitle()}
            </span>
          </div>
        </div>

        {/* Quick navigation */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => navigate('/dashboard')}
            className={`p-2 rounded transition-colors ${
              location.pathname === '/dashboard'
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                : 'hover:bg-black hover:bg-opacity-10 dark:hover:bg-white dark:hover:bg-opacity-10'
            }`}
            title="Dashboard"
          >
            <FaHome size={12} />
          </button>

          <button
            onClick={() => navigate('/dashboard/community')}
            className={`p-2 rounded transition-colors ${
              location.pathname.includes('/dashboard/community')
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                : 'hover:bg-black hover:bg-opacity-10 dark:hover:bg-white dark:hover:bg-opacity-10'
            }`}
            title="Community"
          >
            <FaUsers size={12} />
          </button>

          <button
            onClick={() => navigate('/dashboard/journal')}
            className={`p-2 rounded transition-colors ${
              location.pathname.includes('/dashboard/journal')
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                : 'hover:bg-black hover:bg-opacity-10 dark:hover:bg-white dark:hover:bg-opacity-10'
            }`}
            title="Journal"
          >
            <FaBook size={12} />
          </button>

          <button
            onClick={() => navigate('/dashboard/stats')}
            className={`p-2 rounded transition-colors ${
              location.pathname.includes('/dashboard/stats')
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                : 'hover:bg-black hover:bg-opacity-10 dark:hover:bg-white dark:hover:bg-opacity-10'
            }`}
            title="Statistics"
          >
            <FaChartLine size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
