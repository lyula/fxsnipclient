// client/src/hooks/usePWARouting.js
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/auth';
import usePWAInstallPrompt from './usePWAInstallPrompt';

export default function usePWARouting() {
  const { user } = useAuth();
  const { isStandalone } = usePWAInstallPrompt();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only handle routing for PWA (standalone) mode
    if (!isStandalone) return;

    const token = localStorage.getItem('token');
    const currentPath = location.pathname;

    // If user is authenticated and on login/register/landing, redirect to dashboard
    // Only redirect if NOT coming from a login redirect (i.e., no router state)
    if (
      user && token &&
      ['/login', '/register', '/'].includes(currentPath) &&
      !location.state // Only redirect if there is no router state at all
    ) {
      const lastRoute = localStorage.getItem('lastDashboardRoute') || '/dashboard';
      navigate(lastRoute, { replace: true });
      return;
    }

    // If on landing page and no user, redirect to login (PWA should skip landing)
    if (currentPath === '/' && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, isStandalone, location, navigate]);

  return { isStandalone };
}