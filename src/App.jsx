import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import React, { useEffect, useState } from "react";
import PublicLayout from "./components/layout/PublicLayout";
import PrivateLayout from "./components/layout/PrivateLayout";
import PWAUpdateNotification from "./components/PWAUpdateNotification";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import DesktopPWATitleBar from "./components/DesktopPWATitleBar";
import DesktopPWALayout from "./components/DesktopPWALayout";
import DesktopPWANotifications from "./components/DesktopPWANotifications";
import Landing from "./pages/Landing";
import About from "./pages/About";
import News from "./pages/News";
import Markets from "./pages/Markets";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Terms from "./pages/Terms";
import UserProfile from "./pages/dashboard/community/UserProfile";
import MobileUserProfile from "./pages/dashboard/community/MobileUserProfile";
import PostNotificationView from "./pages/dashboard/community/PostNotificationView";
import AdCreation from "./pages/dashboard/AdCreation";
import PublicPost from "./pages/PublicPost";
import { useTheme } from "./hooks/useTheme";
import { DashboardProvider, useDashboard } from "./context/dashboard";

function Placeholder({ title }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <h1 className="text-3xl font-bold text-gray-700 dark:text-gray-300">
        {title} Page
      </h1>
    </div>
  );
}

function AppRoutes({ isMobile }) {
  const location = useLocation();
  const { syncUserIdFromStorage } = useDashboard();

  useEffect(() => {
    const protectedPrefixes = ["/dashboard", "/tsr", "/stats", "/user-profile"];
    if (protectedPrefixes.some(prefix => location.pathname.startsWith(prefix))) {
      syncUserIdFromStorage();
    }
  }, [location.pathname, syncUserIdFromStorage]);

  return (
    <DesktopPWALayout>
      <DesktopPWATitleBar />
      <div className="app-content">
        <Routes>
          <Route path="/terms" element={<Terms />} />
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/about" element={<About />} />
            <Route path="/news" element={<News />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/markets" element={<Markets />} />
          </Route>
          {/* Public post view route for sharing */}
          <Route path="/post/:postId" element={<PublicPost />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard/community/post/:postId" element={<PostNotificationView />} />
          <Route path="/dashboard/*" element={<Dashboard />} />
          <Route element={<PrivateLayout />}>
            <Route path="/tsr" element={<Placeholder title="TSR" />} />
            <Route path="/stats" element={<Placeholder title="Stats" />} />
            <Route
              path="/user-profile"
              element={isMobile ? <MobileUserProfile /> : <UserProfile />}
            />
          </Route>
        </Routes>
      </div>
      <PWAUpdateNotification />
      <PWAInstallPrompt />
      <DesktopPWANotifications />
    </DesktopPWALayout>
  );
}

function App() {
  const [darkMode] = useTheme();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <Router>
      <DashboardProvider>
        <AppRoutes isMobile={isMobile} />
      </DashboardProvider>
    </Router>
  );
}

export default App;