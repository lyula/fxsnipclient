import { Link, useNavigate, useLocation, Routes, Route } from "react-router-dom";
import {
  FaBook,
  FaBookOpen,
  FaChartBar,
  FaUsers,
  FaSignOutAlt,
  FaBars,
  FaChevronLeft,
  FaChevronRight,
  FaBullhorn,
  FaUser,
  FaInbox,
  FaBell,
  FaMoon,
  FaSun,
  FaCreditCard,
} from "react-icons/fa";
import { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import UserProfile from "./dashboard/community/UserProfile";
import Profile from "./dashboard/Profile";
import { useAuth } from "../context/auth";
import VerifiedBadge from "../components/VerifiedBadge";
import Notifications from "./dashboard/Notifications";
import { useDashboard } from "../context/dashboard";
import PostNotificationView from "./dashboard/community/PostNotificationView";
import PaymentDetails from "./dashboard/PaymentDetails";
import AdCreation from "./dashboard/AdCreation";

// Import only dashboard subpages that are linked in the sidebar
import Journal from "./dashboard/Journal";
import Stats from "./dashboard/Stats";
import Community from "./dashboard/Community";
import Signals from "./dashboard/Signals";
import Inbox from "./dashboard/Inbox";
import Payments from "./dashboard/Payments";

// Add this mapping at the top of your file
const DASHBOARD_LABELS = {
  "/dashboard": "Dashboard",
  "/dashboard/journal": "My Journals",
  "/dashboard/stats": "Analytics",
  "/dashboard/community": "Vibe",
  "/dashboard/signals": "Signal Rooms",
  "/dashboard/inbox": "Inbox",
  "/dashboard/payments": "Payments",
};

export default function Dashboard() {
  // Use dashboard context instead of local state
  const {
    conversations,
    notifications,
    fetchConversations,
    fetchNotifications,
    isMobileChatOpen,
    startPolling,
    stopPolling
  } = useDashboard();

  const { user, refreshUser } = useAuth();

  // Optionally, update user state if localStorage changes (e.g. after login)
  useEffect(() => {
    const handleStorage = () => {
      const token = localStorage.getItem("token");
      if (!token) setUser(null);
      else {
        try {
          setUser(jwtDecode(token));
        } catch {
          setUser(null);
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Persist sidebarCollapsed in localStorage (PC only)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined" && window.localStorage && window.innerWidth >= 768) {
      return localStorage.getItem("sidebarCollapsed") === "true";
    }
    return false;
  });

  // Robust theme state
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      const stored = localStorage.getItem("theme");
      if (stored === "dark") return true;
      if (stored === "light") return false;
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  // Save sidebarCollapsed preference
  useEffect(() => {
    // Only persist on PC (md and up)
    if (typeof window !== "undefined" && window.localStorage && window.innerWidth >= 768) {
      localStorage.setItem("sidebarCollapsed", sidebarCollapsed);
    }
  }, [sidebarCollapsed]);

  const navigate = useNavigate();
  const location = useLocation();

  // Removed forced redirect to login. All routes are accessible. Restrict features in UI only for unauthenticated users.
  // useEffect(() => {
  //   if (user === null || user === undefined) {
  //     navigate('/login', { replace: true });
  //   }
  // }, [user, navigate]);

  // --- Remember last dashboard route in localStorage ---
  useEffect(() => {
    // Only store dashboard routes, never /, /login, /register, etc.
    if (
      location.pathname.startsWith("/dashboard") ||
      location.pathname.startsWith("/tsr") ||
      location.pathname.startsWith("/stats") ||
      location.pathname.startsWith("/user-profile")
    ) {
      localStorage.setItem("lastDashboardRoute", location.pathname + location.search);
    }
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const currentYear = new Date().getFullYear();

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }

  // Helper for active nav link
  const isActive = (path) => location.pathname === path;

  // Find the best matching label (longest prefix match)
  const currentLabel =
    Object.entries(DASHBOARD_LABELS)
      .sort((a, b) => b[0].length - a[0].length)
      .find(([key]) => location.pathname.startsWith(key))?.[1] || "Dashboard";

  // Calculate unread counts from context data
  const unreadConversations = conversations.filter(conv => conv.unreadCount > 0).length;
  const unreadNotifications = notifications.filter(notif => !notif.read).length;

  // Load data on mount
  useEffect(() => {
    fetchConversations();
    fetchNotifications();
  }, [fetchConversations, fetchNotifications]);

  // Add polling lifecycle management
  useEffect(() => {
    // Start polling when dashboard mounts
    startPolling();
    
    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // User came back, refresh data
        fetchConversations(true);
        fetchNotifications(true);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [startPolling, stopPolling, fetchConversations, fetchNotifications]);

  // Main dashboard content (preserved original layout)
  const DashboardMain = (
    <div className="w-full max-w-7xl mx-auto">
      {/* Greeting and username */}
      <div className="mb-4 flex flex-col w-full">
        <h2
          className="text-lg sm:text-xl md:text-2xl font-bold text-[#a99d6b] dark:text-[#a99d6b] leading-tight mb-1 sm:mb-2 text-left w-full"
          style={{lineHeight:1.2}}
        >
          {getGreeting()}, <span className="break-all">{user?.username}</span>
        </h2>
      </div>
      <div className="grid gap-8 grid-cols-1 lg:grid-cols-2 mb-12">
        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6 flex flex-col min-w-0 h-full">
          <h2 className="font-extrabold text-2xl text-[#1E3A8A] dark:text-[#a99d6b] mb-6">Recent Activity</h2>
          <div className="flex flex-col gap-4">
            <div className="bg-[#f7f6f2] dark:bg-[#2e3a4e] rounded-lg p-4 flex items-center gap-4">
              <FaBookOpen className="text-[#a99d6b] text-2xl" />
              <div>
                <div className="font-semibold text-[#a99d6b] dark:text-[#a99d6b]">Reviewed journal entry</div>
                <div className="text-black dark:text-gray-300 text-xs">10 minutes ago</div>
              </div>
            </div>
            <div className="bg-[#f7f6f2] dark:bg-[#2e3a4e] rounded-lg p-4 flex items-center gap-4">
              <FaChartBar className="text-[#a99d6b] text-2xl" />
              <div>
                <div className="font-semibold text-[#a99d6b] dark:text-[#a99d6b]">Analyzed trading statistics</div>
                <div className="text-black dark:text-gray-300 text-xs">30 minutes ago</div>
              </div>
            </div>
            <div className="bg-[#f7f6f2] dark:bg-[#2e3a4e] rounded-lg p-4 flex items-center gap-4">
              <FaBullhorn className="text-[#a99d6b] text-2xl" />
              <div>
                <div className="font-semibold text-[#a99d6b] dark:text-[#a99d6b]">Received new trading signal</div>
                <div className="text-black dark:text-gray-300 text-xs">1 hour ago</div>
              </div>
            </div>
          </div>
        </div>
        {/* Performance Overview */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6 flex flex-col min-w-0 h-full">
          <h2 className="font-extrabold text-2xl text-[#1E3A8A] dark:text-[#a99d6b] mb-6">Performance Overview</h2>
          <div className="bg-[#f7f6f2] dark:bg-[#2e3a4e] rounded-lg p-8 flex items-center justify-center text-[#1E3A8A] dark:text-[#a99d6b] text-lg mb-6" style={{ minHeight: 120 }}>
            Performance Chart
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#f7f6f2] dark:bg-[#2e3a4e] rounded-lg p-4 flex flex-col items-center">
              <span className="text-2xl font-bold text-[#1E3A8A] dark:text-[#a99d6b]">+12.5%</span>
              <span className="text-[#a99d6b] dark:text-gray-300 text-xs mt-1">Monthly Return</span>
            </div>
            <div className="bg-[#f7f6f2] dark:bg-[#2e3a4e] rounded-lg p-4 flex flex-col items-center">
              <span className="text-2xl font-bold text-[#1E3A8A] dark:text-[#a99d6b]">1.35</span>
              <span className="text-[#a99d6b] dark:text-gray-300 text-xs mt-1">Sharpe Ratio</span>
            </div>
            <div className="bg-[#f7f6f2] dark:bg-[#2e3a4e] rounded-lg p-4 flex flex-col items-center">
              <span className="text-2xl font-bold text-[#1E3A8A] dark:text-[#a99d6b]">8</span>
              <span className="text-[#a99d6b] dark:text-gray-300 text-xs mt-1">Winning Trades</span>
            </div>
            <div className="bg-[#f7f6f2] dark:bg-[#2e3a4e] rounded-lg p-4 flex flex-col items-center">
              <span className="text-2xl font-bold text-[#1E3A8A] dark:text-[#a99d6b]">2</span>
              <span className="text-[#a99d6b] dark:text-gray-300 text-xs mt-1">Losing Trades</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // If on /dashboard/inbox with chat param, but chatbox is not open, reset URL
  // (This logic is now handled in Inbox.jsx for more accurate control)
  // useEffect(() => {
  //   if (
  //     location.pathname === "/dashboard/inbox" &&
  //     new URLSearchParams(location.search).has("chat") &&
  //     (!isMobile || !isMobileChatOpen)
  //   ) {
  //     navigate("/dashboard/inbox", { replace: true });
  //   }
  // }, [location, isMobile, isMobileChatOpen, navigate]);

  return (
    <div className="fixed inset-0 flex bg-gradient-to-b from-white via-blue-50 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
      {/* Sidebar */}
      <aside
        className={`fixed z-30 inset-y-0 left-0 transform
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:static md:inset-0 transition-all duration-300 ease-in-out
          bg-white dark:bg-gray-900 border-r border-blue-100 dark:border-gray-800 flex flex-col
          w-3/5 max-w-xs sm:max-w-sm
          ${sidebarCollapsed ? "md:w-20 w-20" : "md:w-64 w-64"}
          items-center md:items-stretch
        `}
        style={{ minWidth: 0 }}
      >
        {/* Mobile close button */}
        <div className="w-full flex md:hidden justify-end pt-3 pr-4 absolute top-0 right-0 z-40">
          <button
            className="text-[#a99d6b] text-2xl"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            &times;
          </button>
        </div>
        {/* Desktop header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-blue-100 dark:border-gray-800 w-full relative md:static">
          <span className={`text-2xl font-extrabold text-[#1E3A8A] dark:text-white font-inter transition-all duration-200 ${sidebarCollapsed ? "hidden md:block md:text-lg" : ""}`}>
            {sidebarCollapsed ? "FX" : "FXsnip"}
          </span>
          <div className="flex items-center gap-2">
            <button
              className="hidden md:block text-[#a99d6b] text-xl focus:outline-none"
              onClick={() => setSidebarCollapsed((v) => !v)}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
            </button>
          </div>
        </div>
        {/* Profile Section */}
        <div className={`flex flex-col items-center py-6 border-b border-blue-100 dark:border-gray-800 ${sidebarCollapsed ? "px-0" : "px-4"}`}>
          <div className="flex flex-col items-center w-full">
            {user?.profile?.profileImage ? (
              <img
                src={user.profile.profileImage}
                alt="Profile"
                className="rounded-full w-12 h-12 object-cover mb-2 border border-gray-300 dark:border-gray-700"
              />
            ) : (
              <div className="bg-[#a99d6b] text-white rounded-full p-3 mb-2">
                <FaUser className="text-2xl" />
              </div>
            )}
            {!sidebarCollapsed ? (
              <div
                className="w-full cursor-pointer"
                onClick={() => {
                  navigate(`/dashboard/community/user/${encodeURIComponent(user?.username)}`, {
                    state: { fromSidebar: true }
                  });
                  setSidebarOpen(false);
                }}
                title="View your public profile"
              >
                <span className="block text-[#1E3A8A] dark:text-white font-semibold text-base text-center truncate w-full">
                  {user?.username}
                  {user?.verified && <VerifiedBadge />}
                </span>
                <span className="block text-gray-500 dark:text-gray-400 text-xs text-center truncate w-full">
                  {user?.email}
                </span>
              </div>
            ) : null}
            {!sidebarCollapsed && (
              <Link
                to="/dashboard/profile"
                onClick={() => {
                  if (window.innerWidth < 768) setSidebarOpen(false);
                }}
                className="mt-2 text-xs text-[#a99d6b] hover:underline font-medium text-center"
              >
                Update Profile
              </Link>
            )}
          </div>
        </div>
        <nav className="flex-1 px-1 sm:px-2 py-6 flex flex-col gap-2 min-w-0 w-full items-center md:items-stretch">
          <Link
            to="/dashboard"
            onClick={() => {
              if (window.innerWidth < 768) setSidebarOpen(false);
            }}
            className={`flex items-center justify-start gap-3 px-2 sm:px-4 py-2 rounded-lg font-semibold
              ${isActive("/dashboard") ? "text-[#a99d6b] bg-blue-50 dark:bg-gray-800" : "text-[#1E3A8A] dark:text-white"}
              hover:bg-blue-50 dark:hover:bg-gray-800 transition
              ${sidebarCollapsed ? "justify-center md:px-2" : ""}
              w-full md:w-auto
            `}
          >
            <FaBook className="text-lg" />
            <span className={
              "truncate " +
              (sidebarCollapsed
                ? "hidden md:inline-block md:opacity-0 md:w-0 md:visible"
                : "inline-block")
            }>
              Dashboard
            </span>
          </Link>
          <Link
            to="/dashboard/journal"
            onClick={() => {
              if (window.innerWidth < 768) setSidebarOpen(false);
            }}
            className={`flex items-center justify-start gap-3 px-2 sm:px-4 py-2 rounded-lg font-semibold
              ${isActive("/dashboard/journal") ? "text-[#a99d6b] bg-blue-50 dark:bg-gray-800" : "text-[#1E3A8A] dark:text-white"}
              hover:bg-blue-50 dark:hover:bg-gray-800 transition
              ${sidebarCollapsed ? "justify-center md:px-2" : ""}
              w-full md:w-auto
            `}
          >
            <FaBookOpen className="text-lg" />
            <span className={
              "truncate " +
              (sidebarCollapsed
                ? "hidden md:inline-block md:opacity-0 md:w-0 md:visible"
                : "inline-block")
            }>
              My Journals
            </span>
          </Link>
          <Link
            to="/dashboard/stats"
            onClick={() => {
              if (window.innerWidth < 768) setSidebarOpen(false);
            }}
            className={`flex items-center justify-start gap-3 px-2 sm:px-4 py-2 rounded-lg font-semibold
              ${isActive("/dashboard/stats") ? "text-[#a99d6b] bg-blue-50 dark:bg-gray-800" : "text-[#1E3A8A] dark:text-white"}
              hover:bg-blue-50 dark:hover:bg-gray-800 transition
              ${sidebarCollapsed ? "justify-center md:px-2" : ""}
              w-full md:w-auto
            `}
          >
            <FaChartBar className="text-lg" />
            <span className={
              "truncate " +
              (sidebarCollapsed
                ? "hidden md:inline-block md:opacity-0 md:w-0 md:visible"
                : "inline-block")
            }>
              Analytics
            </span>
          </Link>
          <Link
            to="/dashboard/community"
            onClick={() => {
              if (window.innerWidth < 768) setSidebarOpen(false);
            }}
            className={`flex items-center justify-start gap-3 px-2 sm:px-4 py-2 rounded-lg font-semibold
              ${isActive("/dashboard/community") ? "text-[#a99d6b] bg-blue-50 dark:bg-gray-800" : "text-[#1E3A8A] dark:text-white"}
              hover:bg-blue-50 dark:hover:bg-gray-800 transition
              ${sidebarCollapsed ? "justify-center md:px-2" : ""}
              w-full md:w-auto
            `}
          >
            <FaUsers className="text-lg" />
            <span className={
              "truncate " +
              (sidebarCollapsed
                ? "hidden md:inline-block md:opacity-0 md:w-0 md:visible"
                : "inline-block")
            }>
              Vibe
            </span>
          </Link>
          <Link
            to="/dashboard/signals"
            onClick={() => {
              if (window.innerWidth < 768) setSidebarOpen(false);
            }}
            className={`flex items-center justify-start gap-3 px-2 sm:px-4 py-2 rounded-lg font-semibold
              ${isActive("/dashboard/signals") ? "text-[#a99d6b] bg-blue-50 dark:bg-gray-800" : "text-[#1E3A8A] dark:text-white"}
              hover:bg-blue-50 dark:hover:bg-gray-800 transition
              ${sidebarCollapsed ? "justify-center md:px-2" : ""}
              w-full md:w-auto
            `}
          >
            <FaBullhorn className="text-lg" />
            <span className={
              "truncate " +
              (sidebarCollapsed
                ? "hidden md:inline-block md:opacity-0 md:w-0 md:visible"
                : "inline-block")
            }>
              Signal Rooms
            </span>
          </Link>
          <Link
            to="/dashboard/inbox"
            onClick={() => {
              if (window.innerWidth < 768) setSidebarOpen(false);
            }}
            className={`flex items-center justify-start gap-3 px-2 sm:px-4 py-2 rounded-lg font-semibold
              ${isActive("/dashboard/inbox") ? "text-[#a99d6b] bg-blue-50 dark:bg-gray-800" : "text-[#1E3A8A] dark:text-white"}
              hover:bg-blue-50 dark:hover:bg-gray-800 transition
              ${sidebarCollapsed ? "justify-center md:px-2" : ""}
              w-full md:w-auto
            `}
          >
            <FaInbox className="text-lg" />
            <span className={
              "truncate " +
              (sidebarCollapsed
                ? "hidden md:inline-block md:opacity-0 md:w-0 md:visible"
                : "inline-block")
            }>
              Inbox
            </span>
          </Link>
          <Link
            to="/dashboard/payments"
            onClick={() => {
              if (window.innerWidth < 768) setSidebarOpen(false);
            }}
            className={`flex items-center justify-start gap-3 px-2 sm:px-4 py-2 rounded-lg font-semibold
              ${isActive("/dashboard/payments") ? "text-[#a99d6b] bg-blue-50 dark:bg-gray-800" : "text-[#1E3A8A] dark:text-white"}
              hover:bg-blue-50 dark:hover:bg-gray-800 transition
              ${sidebarCollapsed ? "justify-center md:px-2" : ""}
              w-full md:w-auto
            `}
          >
            <FaCreditCard className="text-lg" />
            <span className={
              "truncate " +
              (sidebarCollapsed
                ? "hidden md:inline-block md:opacity-0 md:w-0 md:visible"
                : "inline-block")
            }>
              Payments
            </span>
          </Link>
        </nav>
        {/* Sidebar bottom section */}
        <div className="mt-auto px-0 py-4 border-t border-blue-100 dark:border-gray-800 flex flex-col items-center gap-2 w-full">
          {/* Show email at bottom only on mobile */}
          {window.innerWidth < 768 && (
            <span className="text-xs text-gray-500 dark:text-gray-400 text-center break-all px-2 pt-2 w-full block">
              {user?.email}
            </span>
          )}
          {/* Logout button: only show on desktop when collapsed */}
          {sidebarCollapsed && window.innerWidth >= 768 && (
            <button
              onClick={handleLogout}
              className="text-[#a99d6b] hover:text-[#c2b77a] transition mt-2"
              title="Logout"
              type="button"
            >
              <FaSignOutAlt className="text-2xl" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 ml-0 transition-all duration-300 ease-in-out">
        {/* Remove header only on mobile when in chatbox, always show on desktop and on conversation list */}
        {!(
          isMobile &&
          location.pathname === "/dashboard/inbox" &&
          new URLSearchParams(location.search).has("chat")
        ) && (
          <header className="flex items-center justify-between px-2 sm:px-4 md:px-6 py-3 sm:py-4 bg-white dark:bg-gray-900 border-b border-blue-100 dark:border-gray-800 shadow-sm sticky top-0 z-20 flex-shrink-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                className="md:hidden text-[#a99d6b] text-3xl sm:text-xl md:text-2xl"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <FaBars />
              </button>
              <h1
                className="font-bold text-[#1E3A8A] dark:text-white font-inter truncate"
                style={{
                  fontSize: "clamp(1rem, 5vw, 2rem)",
                  lineHeight: 1.1,
                  maxWidth: "60vw"
                }}
              >
                {currentLabel}
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Community (Vibe) Icon */}
              <button
                className="p-2 sm:p-3 bg-blue-100 dark:bg-gray-800 text-[#a99d6b] rounded-full shadow hover:bg-blue-200 dark:hover:bg-gray-700 transition"
                title="Vibe"
                type="button"
                onClick={() => navigate("/dashboard/community")}
              >
                <FaUsers className="text-base sm:text-xl" />
              </button>
              {/* Inbox Icon */}
              <button
                className="relative p-2 sm:p-3 bg-blue-100 dark:bg-gray-800 text-[#a99d6b] rounded-full shadow hover:bg-blue-200 dark:hover:bg-gray-700 transition"
                title="Inbox"
                type="button"
                onClick={() => navigate("/dashboard/inbox")}
              >
                <FaInbox className="text-base sm:text-xl" />
                {unreadConversations > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center">
                    {unreadConversations > 99 ? "99+" : unreadConversations}
                  </span>
                )}
              </button>
              {/* Notifications */}
              <button
                className="relative p-2 sm:p-3 bg-blue-100 dark:bg-gray-800 text-[#a99d6b] rounded-full shadow hover:bg-blue-200 dark:hover:bg-gray-700 transition"
                title="Notifications"
                type="button"
                onClick={() => navigate("/dashboard/notifications")}
              >
                <FaBell className="text-base sm:text-xl" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center">
                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                  </span>
                )}
              </button>
              {/* Theme Toggle */}
              <button
                className="p-2 sm:p-3 bg-blue-100 dark:bg-gray-800 text-[#a99d6b] rounded-full shadow hover:bg-blue-200 dark:hover:bg-gray-700 transition"
                title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                onClick={() => setDarkMode((v) => !v)}
                type="button"
              >
                {darkMode ? (
                  <FaSun className="text-base sm:text-xl" />
                ) : (
                  <FaMoon className="text-base sm:text-xl" />
                )}
              </button>
              {/* Logout */}
              <button
                onClick={handleLogout}
                className="p-2 sm:p-3 bg-[#a99d6b] text-white rounded-full shadow hover:bg-[#c2b77a] transition"
                title="Logout"
                type="button"
              >
                <FaSignOutAlt className="text-base sm:text-xl" />
              </button>
            </div>
          </header>
        )}

        {/* Dashboard Content */}
        <main className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 flex flex-col min-h-0">
            {/* Special handling for Community routes - no padding, no scrolling */}
            {location.pathname.startsWith("/dashboard/community") ? (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <Routes>
                  <Route path="community/user/:username" element={<UserProfile />} />
                  <Route path="community/post/:postId" element={<PostNotificationView />} />
                  <Route path="community/*" element={<Community user={user} />} />
                </Routes>
              </div>
            ) : location.pathname.startsWith("/dashboard/inbox") ? (
              // Always use the same layout for inbox, regardless of chat param
              <div className="flex-1 min-h-0 min-w-0 p-0 m-0 overflow-hidden">
                <Routes>
                  <Route path="inbox" element={<Inbox />} />
                </Routes>
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-4 md:p-6 hide-scrollbar">
                <Routes>
                  <Route path="" element={DashboardMain} />
                  <Route path="signals" element={<Signals />} />
                  <Route path="journal" element={<Journal />} />
                  <Route path="stats" element={<Stats />} />
                  <Route path="payments" element={<Payments />} />
                  <Route path="payment/:id" element={<PaymentDetails />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="notifications" element={<Notifications />} />
                  <Route path="ad-creation" element={<AdCreation />} />
                </Routes>
                {/* Footer removed for all internal pages */}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}