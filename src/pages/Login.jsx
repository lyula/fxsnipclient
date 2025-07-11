import React, { useState, useMemo } from "react";
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useTheme } from "../hooks/useTheme";
import { loginUser } from "../utils/api";
import { jwtDecode } from "jwt-decode";
import { useAuth } from "../context/auth";
import usePWAInstallPrompt from "../hooks/usePWAInstallPrompt";
import { io } from "socket.io-client";
import { useDashboard } from "../context/dashboard";

export default function Login() {
  const { refreshUser, user } = useAuth();
  const { syncUserIdFromStorage } = useDashboard();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [dotCount, setDotCount] = useState(1);
  const navigate = useNavigate();
  const location = useLocation();
  const [darkMode, setDarkMode] = useTheme();
  const { deferredPrompt, isStandalone } = usePWAInstallPrompt();

  // Mobile detection logic
  const isMobile = useMemo(() => {
    const userAgentMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const screenSizeMobile = window.screen.width <= 768 || window.screen.height <= 768;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const mediaQueryMobile = window.matchMedia('(max-width: 768px)').matches;
    const hasOrientationAPI = 'orientation' in window;
    
    return userAgentMobile || (screenSizeMobile && isTouchDevice) || (mediaQueryMobile && isTouchDevice) || hasOrientationAPI;
  }, []);

  // Animate dots for "Logging in..."
  React.useEffect(() => {
    if (!loggingIn) return;
    const interval = setInterval(() => {
      setDotCount((d) => (d % 3) + 1);
    }, 400);
    return () => clearInterval(interval);
  }, [loggingIn]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError("Please enter both email and password.");
      return;
    }
    setError("");
    setLoggingIn(true);

    try {
      const result = await loginUser({ email: form.email, password: form.password });
      setLoggingIn(false);

      if (result.token) {
        localStorage.setItem("token", result.token);
        // Get userId from result or decode from token
        let userId = result.user?._id || result.user?.id;
        if (!userId) {
          try {
            const decoded = jwtDecode(result.token);
            userId = decoded?.id || decoded?._id || decoded?.userId;
          } catch {}
        }
        if (userId) {
          localStorage.setItem("userId", userId);
          syncUserIdFromStorage(); // <-- Update DashboardContext immediately
          // Emit user-online event immediately after setting userId
          const socketUrl = import.meta.env.VITE_SOCKET_URL;
          if (socketUrl) {
            const tempSocket = io(socketUrl, {
              auth: { token: result.token }
            });
            tempSocket.on("connect", () => {
              tempSocket.emit("user-online", { userId });
              tempSocket.disconnect(); // Disconnect after emitting
            });
          }
        }
        await refreshUser(); // fetch and set user profile
        // Determine where to redirect after login
        let redirectTo = "/dashboard";
        if (
          location.state &&
          location.state.from &&
          location.state.from.pathname &&
          location.state.from.pathname !== "/"
        ) {
          redirectTo = location.state.from.pathname;
        }
        let lastRoute = localStorage.getItem("lastDashboardRoute");
        // Never allow "/" as a valid dashboard route
        if (
          lastRoute &&
          lastRoute !== "/" &&
          redirectTo === "/dashboard"
        ) {
          redirectTo = lastRoute;
        }
        console.log("[LOGIN REDIRECT] redirectTo:", redirectTo, "location.state:", location.state, "lastRoute:", lastRoute);
        navigate(redirectTo, { replace: true });
      } else {
        setError(result.message || "Login failed.");
      }
    } catch (err) {
      setLoggingIn(false);
      setError(err.message || "Login failed.");
    }
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    }
  };

  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white via-blue-50 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pt-4 px-2 overflow-hidden">
      <div className="w-full max-w-xs sm:max-w-sm md:max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-8 border border-[#a99d6b] flex flex-col items-center mx-auto">
        <h1 className="text-3xl md:text-4xl font-extrabold text-[#1E3A8A] dark:text-white mb-6 font-inter text-center">
          Welcome Back
        </h1>
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5">
          <div className="flex items-center border border-[#a99d6b] rounded-lg px-4 py-2 bg-transparent focus-within:ring-2 focus-within:ring-[#a99d6b]">
            <FaUser className="text-[#a99d6b] mr-3" />
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="Email"
              className="w-full bg-transparent outline-none text-gray-800 dark:text-gray-200"
              disabled={loggingIn}
            />
          </div>
          <div className="flex items-center border border-[#a99d6b] rounded-lg px-4 py-2 bg-transparent focus-within:ring-2 focus-within:ring-[#a99d6b] relative">
            <FaLock className="text-[#a99d6b] mr-3" />
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              placeholder="Password"
              className="w-full bg-transparent outline-none text-gray-800 dark:text-gray-200 pr-8"
              disabled={loggingIn}
            />
            <button
              type="button"
              className="absolute right-3 text-[#a99d6b] focus:outline-none"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              disabled={loggingIn}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          {error && (
            <div className="text-red-600 text-center text-sm font-semibold">{error}</div>
          )}
          <button
            type="submit"
            className="bg-[#a99d6b] text-white font-bold py-2 px-6 rounded-lg shadow hover:bg-[#c2b77a] transition"
            disabled={loggingIn}
          >
            {loggingIn
              ? (
                <span>
                  Logging in{"." + ".".repeat(dotCount)}
                </span>
              )
              : "Login"}
          </button>
        </form>
        <div className="mt-6 text-center text-gray-600 dark:text-gray-300 text-sm">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-[#1E3A8A] dark:text-[#a99d6b] font-semibold hover:underline"
          >
            Register
          </Link>
        </div>
        {/* Remove the install app button from login page */}
        {/*
        {isMobile && !isStandalone && deferredPrompt && (
          <button
            className="mt-4 w-full bg-blue-600 text-white py-2 rounded"
            onClick={handleInstallClick}
          >
            Use Mobile App
          </button>
        )}
        */}
      </div>
    </section>
  );
}