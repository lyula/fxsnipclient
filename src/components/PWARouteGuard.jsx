// client/src/components/PWARouteGuard.jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/auth';
import usePWARouting from '../hooks/usePWARouting';

export default function PWARouteGuard({ children }) {
  const { isLoading, user } = useAuth();
  const { isStandalone } = usePWARouting();
  const location = useLocation();

  // Show loading state while auth is being determined in PWA mode
  if (isStandalone && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white via-blue-50 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login and save intended route
  if (!isLoading && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}