import { useState } from "react";
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate, Link } from "react-router-dom";
import { useTheme } from "../hooks/useTheme";
import { loginUser } from "../utils/api";
import jwtDecode from "jwt-decode";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useTheme();

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

    const result = await loginUser({ email: form.email, password: form.password });

    if (result.token) {
      localStorage.setItem("token", result.token);
      navigate("/dashboard");
    } else {
      setError(result.message || "Login failed.");
    }
  };

  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white via-blue-50 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pt-20 px-2">
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
            />
            <button
              type="button"
              className="absolute right-3 text-[#a99d6b] focus:outline-none"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
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
          >
            Login
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
      </div>
    </section>
  );
}