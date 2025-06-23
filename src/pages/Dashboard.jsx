import { Link, useNavigate } from "react-router-dom";
import { FaBook, FaChartBar, FaUsers, FaSignOutAlt, FaBars, FaChevronLeft, FaChevronRight, FaBullhorn, FaUser, FaInbox, FaBell, FaMoon, FaSun } from "react-icons/fa";
import { useState, useEffect } from "react";

// Dummy user data for demonstration. Replace with real user data as needed.
const username = "TraderJoe";
const userEmail = "user@email.com";
const notificationCount = 3; // Replace with your actual notification count

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  const navigate = useNavigate();

  const handleLogout = () => {
    navigate("/login");
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="fixed inset-0 flex bg-gradient-to-b from-white via-blue-50 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
      {/* Sidebar */}
      <aside
        className={`fixed z-30 inset-y-0 left-0 transform
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:static md:inset-0 transition-all duration-300 ease-in-out
          bg-white dark:bg-gray-900 border-r border-blue-100 dark:border-gray-800 flex flex-col
          ${sidebarCollapsed ? "w-20" : "w-64"}
          w-4/5 max-w-xs md:max-w-none md:w-auto
        `}
        style={{ minWidth: 0 }}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-blue-100 dark:border-gray-800">
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
            <button
              className="md:hidden text-[#a99d6b] text-2xl"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              &times;
            </button>
          </div>
        </div>
        {/* Profile Section */}
        <div className={`flex flex-col items-center py-6 border-b border-blue-100 dark:border-gray-800 ${sidebarCollapsed ? "px-0" : "px-4"}`}>
          <div className="flex flex-col items-center w-full">
            <div className="bg-[#a99d6b] text-white rounded-full p-3 mb-2">
              <FaUser className="text-2xl" />
            </div>
            {!sidebarCollapsed && (
              <>
                <span className="block text-[#1E3A8A] dark:text-white font-semibold text-base text-center truncate w-full" title={username}>
                  {username}
                </span>
                <Link
                  to="/profile"
                  className="mt-2 text-xs text-[#a99d6b] hover:underline font-medium text-center"
                >
                  Update Profile
                </Link>
              </>
            )}
          </div>
        </div>
        <nav className="flex-1 px-1 sm:px-2 py-6 flex flex-col gap-2 min-w-0">
          <Link
            to="/dashboard"
            className={`flex items-center gap-3 px-2 sm:px-4 py-2 rounded-lg font-semibold text-[#1E3A8A] dark:text-white hover:bg-blue-50 dark:hover:bg-gray-800 transition ${sidebarCollapsed ? "justify-center px-2" : ""}`}
          >
            <FaBook className="text-lg" />
            {!sidebarCollapsed && <span className="truncate">Dashboard</span>}
          </Link>
          <Link
            to="/journal"
            className={`flex items-center gap-3 px-2 sm:px-4 py-2 rounded-lg font-semibold text-[#1E3A8A] dark:text-white hover:bg-blue-50 dark:hover:bg-gray-800 transition ${sidebarCollapsed ? "justify-center px-2" : ""}`}
          >
            <FaBook className="text-lg" />
            {!sidebarCollapsed && <span className="truncate">My Journals</span>}
          </Link>
          <Link
            to="/stats"
            className={`flex items-center gap-3 px-2 sm:px-4 py-2 rounded-lg font-semibold text-[#1E3A8A] dark:text-white hover:bg-blue-50 dark:hover:bg-gray-800 transition ${sidebarCollapsed ? "justify-center px-2" : ""}`}
          >
            <FaChartBar className="text-lg" />
            {!sidebarCollapsed && <span className="truncate">Analytics</span>}
          </Link>
          <Link
            to="/community"
            className={`flex items-center gap-3 px-2 sm:px-4 py-2 rounded-lg font-semibold text-[#1E3A8A] dark:text-white hover:bg-blue-50 dark:hover:bg-gray-800 transition ${sidebarCollapsed ? "justify-center px-2" : ""}`}
          >
            <FaUsers className="text-lg" />
            {!sidebarCollapsed && <span className="truncate">Community</span>}
          </Link>
          <Link
            to="/signals"
            className={`flex items-center gap-3 px-2 sm:px-4 py-2 rounded-lg font-semibold text-[#1E3A8A] dark:text-white hover:bg-blue-50 dark:hover:bg-gray-800 transition ${sidebarCollapsed ? "justify-center px-2" : ""}`}
          >
            <FaBullhorn className="text-lg" />
            {!sidebarCollapsed && <span className="truncate">Signal Rooms</span>}
          </Link>
          <Link
            to="/inbox"
            className={`flex items-center gap-3 px-2 sm:px-4 py-2 rounded-lg font-semibold text-[#1E3A8A] dark:text-white hover:bg-blue-50 dark:hover:bg-gray-800 transition ${sidebarCollapsed ? "justify-center px-2" : ""}`}
          >
            <FaInbox className="text-lg" />
            {!sidebarCollapsed && <span className="truncate">Inbox</span>}
          </Link>
        </nav>
        <div className={`px-2 sm:px-4 py-4 border-t border-blue-100 dark:border-gray-800 flex justify-center w-full`}>
          <button
            onClick={handleLogout}
            className="p-2 bg-[#a99d6b] text-white rounded-full shadow hover:bg-[#c2b77a] transition"
            title="Logout"
          >
            <FaSignOutAlt className="text-xl" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 ml-0 transition-all duration-300 ease-in-out">
        {/* Header */}
        <header className="flex items-center justify-between px-2 sm:px-4 md:px-6 py-3 sm:py-4 bg-white dark:bg-gray-900 border-b border-blue-100 dark:border-gray-800 shadow-sm sticky top-0 z-20 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              className="md:hidden text-[#a99d6b] text-lg sm:text-xl md:text-2xl"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <FaBars />
            </button>
            <h1
              className="font-bold text-[#1E3A8A] dark:text-white font-inter truncate"
              style={{
                fontSize: "clamp(1rem, 5vw, 2rem)", // Responsive font size
                lineHeight: 1.1,
                maxWidth: "60vw"
              }}
            >
              Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
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
            {/* Notifications */}
            <button
              className="relative p-2 sm:p-3 bg-blue-100 dark:bg-gray-800 text-[#a99d6b] rounded-full shadow hover:bg-blue-200 dark:hover:bg-gray-700 transition"
              title="Notifications"
              type="button"
            >
              <FaBell className="text-base sm:text-xl" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] sm:text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[18px] sm:min-w-[20px] text-center leading-none">
                  {notificationCount}
                </span>
              )}
            </button>
            {/* Inbox */}
            <button
              className="p-2 sm:p-3 bg-blue-100 dark:bg-gray-800 text-[#a99d6b] rounded-full shadow hover:bg-blue-200 dark:hover:bg-gray-700 transition"
              title="Inbox"
              type="button"
            >
              <FaInbox className="text-base sm:text-xl" />
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

        {/* Dashboard Content */}
        <main
          className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6 min-h-0"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {/* Recent Activity & Performance Overview */}
          <div className="grid gap-4 sm:gap-6 md:gap-8 grid-cols-1 lg:grid-cols-2 mb-12">
            {/* Recent Activity */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-2 sm:p-4 flex flex-col min-w-0">
              <h2 className="font-bold text-base sm:text-lg md:text-xl text-[#1E3A8A] dark:text-white mb-2 sm:mb-3">
                Recent Activity
              </h2>
              <div className="flex-1 overflow-auto">
                <div className="flex flex-col gap-2">
                  {/* Activity Item */}
                  <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-blue-50 dark:bg-gray-700 transition-all duration-200 hover:bg-blue-100 dark:hover:bg-gray-600">
                    <div className="flex-shrink-0">
                      <FaBook className="text-[#a99d6b] text-lg sm:text-2xl" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#1E3A8A] dark:text-white font-medium text-xs sm:text-sm truncate">
                        Reviewed journal entry
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 text-[10px] sm:text-xs truncate">
                        10 minutes ago
                      </p>
                    </div>
                  </div>
                  {/* Activity Item */}
                  <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-blue-50 dark:bg-gray-700 transition-all duration-200 hover:bg-blue-100 dark:hover:bg-gray-600">
                    <div className="flex-shrink-0">
                      <FaChartBar className="text-[#a99d6b] text-lg sm:text-2xl" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#1E3A8A] dark:text-white font-medium text-xs sm:text-sm truncate">
                        Analyzed trading statistics
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 text-[10px] sm:text-xs truncate">
                        30 minutes ago
                      </p>
                    </div>
                  </div>
                  {/* Activity Item */}
                  <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-blue-50 dark:bg-gray-700 transition-all duration-200 hover:bg-blue-100 dark:hover:bg-gray-600">
                    <div className="flex-shrink-0">
                      <FaBullhorn className="text-[#a99d6b] text-lg sm:text-2xl" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#1E3A8A] dark:text-white font-medium text-xs sm:text-sm truncate">
                        Received new trading signal
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 text-[10px] sm:text-xs truncate">
                        1 hour ago
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Overview */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-2 sm:p-4 flex flex-col min-w-0">
              <h2 className="font-bold text-base sm:text-lg md:text-xl text-[#1E3A8A] dark:text-white mb-2 sm:mb-4">
                Performance Overview
              </h2>
              <div className="flex-1 flex flex-col gap-2 sm:gap-4">
                {/* Performance Chart Placeholder */}
                <div className="h-24 sm:h-32 md:h-48 bg-blue-50 dark:bg-gray-700 rounded-lg flex items-center justify-center text-[#1E3A8A] dark:text-white font-semibold text-xs sm:text-sm">
                  Performance Chart
                </div>
                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-2 sm:gap-4 text-center">
                  <div className="bg-blue-50 dark:bg-gray-700 rounded-lg p-2 sm:p-4 shadow">
                    <p className="text-[#1E3A8A] dark:text-white font-bold text-base sm:text-lg">
                      +12.5%
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
                      Monthly Return
                    </p>
                  </div>
                  <div className="bg-blue-50 dark:bg-gray-700 rounded-lg p-2 sm:p-4 shadow">
                    <p className="text-[#1E3A8A] dark:text-white font-bold text-base sm:text-lg">
                      1.35
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
                      Sharpe Ratio
                    </p>
                  </div>
                  <div className="bg-blue-50 dark:bg-gray-700 rounded-lg p-2 sm:p-4 shadow">
                    <p className="text-[#1E3A8A] dark:text-white font-bold text-base sm:text-lg">
                      8
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
                      Winning Trades
                    </p>
                  </div>
                  <div className="bg-blue-50 dark:bg-gray-700 rounded-lg p-2 sm:p-4 shadow">
                    <p className="text-[#1E3A8A] dark:text-white font-bold text-base sm:text-lg">
                      2
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
                      Losing Trades
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="py-4 px-2 sm:px-6 bg-white dark:bg-gray-900 border-t border-blue-100 dark:border-gray-800 text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
            &copy; {currentYear} FXsnip. All rights reserved.
          </footer>
        </main>
      </div>
    </div>
  );
}