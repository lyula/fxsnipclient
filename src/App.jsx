import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import React, { useEffect, useState } from "react";
import PublicLayout from "./components/layout/PublicLayout";
import PrivateLayout from "./components/layout/PrivateLayout";
import PWARouteGuard from "./components/PWARouteGuard";
import PWAUpdateNotification from "./components/PWAUpdateNotification"; // NEW
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
import { useTheme } from "./hooks/useTheme";
import { DashboardProvider } from "./context/dashboard";

function Placeholder({ title }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <h1 className="text-3xl font-bold text-gray-700 dark:text-gray-300">
        {title} Page
      </h1>
    </div>
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

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <Router>
      <PWARouteGuard>
        <Routes>
          <Route path="/terms" element={<Terms />} />
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/about" element={<About />} />
            <Route path="/news" element={<News />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/markets" element={<Markets />} />
          </Route>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/dashboard/*"
            element={
              <DashboardProvider>
                <Dashboard />
              </DashboardProvider>
            }
          />

          <Route element={<PrivateLayout />}>
            <Route path="/tsr" element={<Placeholder title="TSR" />} />
            <Route path="/stats" element={<Placeholder title="Stats" />} />
            <Route
              path="/user-profile"
              element={isMobile ? <MobileUserProfile /> : <UserProfile />}
            />
          </Route>
        </Routes>

        {/* PWA Update Notification */}
        <PWAUpdateNotification />
      </PWARouteGuard>
    </Router>
  );
}

export default App;