import { useState } from "react";
import { FaUser, FaEnvelope, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { useTheme } from "../hooks/useTheme";
import { Link } from "react-router-dom";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [darkMode, setDarkMode] = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
    setSuccess(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.username || !form.email || !form.password || !form.confirm) {
      setError("Please fill in all fields.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setSuccess(true);
    setForm({ name: "", username: "", email: "", password: "", confirm: "" });
  };

  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white via-blue-50 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-2 py-8">
      <div className="w-full max-w-xs sm:max-w-sm md:max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-8 border border-[#a99d6b] flex flex-col items-center mx-auto">
        <h1 className="text-3xl md:text-4xl font-extrabold text-[#1E3A8A] dark:text-white mb-6 font-inter text-center">
          Create Account
        </h1>
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5">
          <div className="flex items-center border border-[#a99d6b] rounded-lg px-4 py-2 bg-transparent focus-within:ring-2 focus-within:ring-[#a99d6b]">
            <FaUser className="text-[#a99d6b] mr-3" />
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="Full Name"
              className="w-full bg-transparent outline-none text-gray-800 dark:text-gray-200"
            />
          </div>
          <div className="flex items-center border border-[#a99d6b] rounded-lg px-4 py-2 bg-transparent focus-within:ring-2 focus-within:ring-[#a99d6b]">
            <FaUser className="text-[#a99d6b] mr-3" />
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              required
              placeholder="Username"
              className="w-full bg-transparent outline-none text-gray-800 dark:text-gray-200"
            />
          </div>
          <div className="flex items-center border border-[#a99d6b] rounded-lg px-4 py-2 bg-transparent focus-within:ring-2 focus-within:ring-[#a99d6b]">
            <FaEnvelope className="text-[#a99d6b] mr-3" />
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
          <div className="flex items-center border border-[#a99d6b] rounded-lg px-4 py-2 bg-transparent focus-within:ring-2 focus-within:ring-[#a99d6b] relative">
            <FaLock className="text-[#a99d6b] mr-3" />
            <input
              type={showConfirm ? "text" : "password"}
              name="confirm"
              value={form.confirm}
              onChange={handleChange}
              required
              placeholder="Confirm Password"
              className="w-full bg-transparent outline-none text-gray-800 dark:text-gray-200 pr-8"
            />
            <button
              type="button"
              className="absolute right-3 text-[#a99d6b] focus:outline-none"
              tabIndex={-1}
              onClick={() => setShowConfirm((v) => !v)}
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              {showConfirm ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          {error && (
            <div className="text-red-600 text-center text-sm font-semibold">{error}</div>
          )}
          {success && (
            <div className="text-green-600 text-center text-sm font-semibold">
              Registration successful!
            </div>
          )}
          <button
            type="submit"
            className="bg-[#a99d6b] text-white font-bold py-2 px-6 rounded-lg shadow hover:bg-[#c2b77a] transition"
          >
            Register
          </button>
        </form>
        <div className="mt-6 text-center text-gray-600 dark:text-gray-300 text-sm">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-[#1E3A8A] dark:text-[#a99d6b] font-semibold hover:underline"
          >
            Login
          </Link>
        </div>
      </div>
    </section>
  );
}