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

  return (
    <div className="min-h-screen flex bg-gradient-to-b from-white via-blue-50 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
      {/* Sidebar */}
      <aside
        className={`fixed z-30 inset-y-0 left-0 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 md:static md:inset-0 transition-all duration-300 ease-in-out bg-white dark:bg-gray-900 border-r border-blue-100 dark:border-gray-800 flex flex-col
        ${sidebarCollapsed ? "w-20" : "w-64"}`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-blue-100 dark:border-gray-800">
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
        <nav className="flex-1 px-2 py-6 flex flex-col gap-2">
          <Link
            to="/dashboard"
            className={`flex items-center gap-3 px-4 py-2 rounded-lg font-semibold text-[#1E3A8A] dark:text-white hover:bg-blue-50 dark:hover:bg-gray-800 transition ${sidebarCollapsed ? "justify-center px-2" : ""}`}
          >
            <FaBook className="text-lg" />
            {!sidebarCollapsed && "Dashboard"}
          </Link>
          <Link
            to="/journal"
            className={`flex items-center gap-3 px-4 py-2 rounded-lg font-semibold text-[#1E3A8A] dark:text-white hover:bg-blue-50 dark:hover:bg-gray-800 transition ${sidebarCollapsed ? "justify-center px-2" : ""}`}
          >
            <FaBook className="text-lg" />
            {!sidebarCollapsed && "My Journals"}
          </Link>
          <Link
            to="/stats"
            className={`flex items-center gap-3 px-4 py-2 rounded-lg font-semibold text-[#1E3A8A] dark:text-white hover:bg-blue-50 dark:hover:bg-gray-800 transition ${sidebarCollapsed ? "justify-center px-2" : ""}`}
          >
            <FaChartBar className="text-lg" />
            {!sidebarCollapsed && "Analytics"}
          </Link>
          <Link
            to="/community"
            className={`flex items-center gap-3 px-4 py-2 rounded-lg font-semibold text-[#1E3A8A] dark:text-white hover:bg-blue-50 dark:hover:bg-gray-800 transition ${sidebarCollapsed ? "justify-center px-2" : ""}`}
          >
            <FaUsers className="text-lg" />
            {!sidebarCollapsed && "Community"}
          </Link>
          <Link
            to="/signals"
            className={`flex items-center gap-3 px-4 py-2 rounded-lg font-semibold text-[#1E3A8A] dark:text-white hover:bg-blue-50 dark:hover:bg-gray-800 transition ${sidebarCollapsed ? "justify-center px-2" : ""}`}
          >
            <FaBullhorn className="text-lg" />
            {!sidebarCollapsed && "Signal Rooms"}
          </Link>
          <Link
            to="/inbox"
            className={`flex items-center gap-3 px-4 py-2 rounded-lg font-semibold text-[#1E3A8A] dark:text-white hover:bg-blue-50 dark:hover:bg-gray-800 transition ${sidebarCollapsed ? "justify-center px-2" : ""}`}
          >
            <FaInbox className="text-lg" />
            {!sidebarCollapsed && "Inbox"}
          </Link>
        </nav>
        <div className={`px-4 py-4 border-t border-blue-100 dark:border-gray-800 flex justify-center`}>
          {sidebarCollapsed ? (
            <button
              onClick={handleLogout}
              className="p-2 bg-[#a99d6b] text-white rounded-full shadow hover:bg-[#c2b77a] transition"
              title="Logout"
            >
              <FaSignOutAlt className="text-xl" />
            </button>
          ) : (
            <span className="block text-[#1E3A8A] dark:text-white font-semibold text-sm text-center w-full truncate" title={userEmail}>
              {userEmail}
            </span>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col min-h-screen ml-0 transition-all duration-300 ease-in-out`}
      >
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-900 border-b border-blue-100 dark:border-gray-800 shadow-sm sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden text-[#a99d6b] text-2xl"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <FaBars />
            </button>
            <h1 className="text-2xl font-bold text-[#1E3A8A] dark:text-white font-inter">
              Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              className="p-3 bg-blue-100 dark:bg-gray-800 text-[#a99d6b] rounded-full shadow hover:bg-blue-200 dark:hover:bg-gray-700 transition"
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              onClick={() => setDarkMode((v) => !v)}
              type="button"
            >
              {darkMode ? <FaSun className="text-xl" /> : <FaMoon className="text-xl" />}
            </button>
            {/* Notifications */}
            <button
              className="relative p-3 bg-blue-100 dark:bg-gray-800 text-[#a99d6b] rounded-full shadow hover:bg-blue-200 dark:hover:bg-gray-700 transition"
              title="Notifications"
              type="button"
            >
              <FaBell className="text-xl" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center leading-none">
                  {notificationCount}
                </span>
              )}
            </button>
            {/* Inbox */}
            <button
              className="p-3 bg-blue-100 dark:bg-gray-800 text-[#a99d6b] rounded-full shadow hover:bg-blue-200 dark:hover:bg-gray-700 transition"
              title="Inbox"
              type="button"
            >
              <FaInbox className="text-xl" />
            </button>
            {/* Logout */}
            <button
              onClick={handleLogout}
              className="p-3 bg-[#a99d6b] text-white rounded-full shadow hover:bg-[#c2b77a] transition"
              title="Logout"
              type="button"
            >
              <FaSignOutAlt className="text-xl" />
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 p-2 md:p-6">
          <div className="grid gap-6 md:gap-8 grid-cols-1 md:grid-cols-3 mb-12">
            <Link
              to="/journal"
              className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 md:p-6 flex flex-col items-center border-2 border-[#a99d6b] hover:scale-105 transition-transform"
            >
              <FaBook className="text-3xl text-[#a99d6b] mb-3" />
              <h2 className="font-bold text-xl text-[#1E3A8A] dark:text-white mb-2">My Journals</h2>
              <p className="text-gray-600 dark:text-gray-300 text-center text-sm">
                View, edit, and reflect on your trading journals.
              </p>
              <span className="mt-4 inline-block px-6 py-2 bg-[#a99d6b] text-white rounded-lg font-bold shadow hover:bg-[#c2b77a] transition">
                Go to Journals
              </span>
            </Link>
            <Link
              to="/stats"
              className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 md:p-6 flex flex-col items-center border-2 border-[#a99d6b] hover:scale-105 transition-transform"
            >
              <FaChartBar className="text-3xl text-[#a99d6b] mb-3" />
              <h2 className="font-bold text-xl text-[#1E3A8A] dark:text-white mb-2">Analytics</h2>
              <p className="text-gray-600 dark:text-gray-300 text-center text-sm">
                Visualize your performance and trading edge.
              </p>
              <span className="mt-4 inline-block px-6 py-2 bg-[#a99d6b] text-white rounded-lg font-bold shadow hover:bg-[#c2b77a] transition">
                View Analytics
              </span>
            </Link>
            <Link
              to="/community"
              className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 md:p-6 flex flex-col items-center border-2 border-[#a99d6b] hover:scale-105 transition-transform"
            >
              <FaUsers className="text-3xl text-[#a99d6b] mb-3" />
              <h2 className="font-bold text-xl text-[#1E3A8A] dark:text-white mb-2">Community</h2>
              <p className="text-gray-600 dark:text-gray-300 text-center text-sm">
                Connect with other traders and view public journals.
              </p>
              <span className="mt-4 inline-block px-6 py-2 bg-[#a99d6b] text-white rounded-lg font-bold shadow hover:bg-[#c2b77a] transition">
                Explore Community
              </span>
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}