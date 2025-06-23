import { useState } from "react";
import { Link, NavLink } from "react-router-dom";

export default function PublicNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="w-full bg-white dark:bg-gray-900 shadow-sm border-b border-blue-100 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="text-2xl font-extrabold text-[#1E3A8A] dark:text-white font-inter">
          FXsnip
        </Link>
        {/* Hamburger */}
        <button
          className="md:hidden ml-auto flex flex-col justify-center items-center w-10 h-10 focus:outline-none relative z-20"
          onClick={() => setOpen((v) => !v)}
          aria-label="Open navigation"
        >
          {/* Hamburger/X icon */}
          <span
            className={`block w-7 h-0.5 bg-[#a99d6b] mb-1 transition-all duration-200 ${
              open ? "rotate-45 translate-y-2" : ""
            }`}
          />
          <span
            className={`block w-7 h-0.5 bg-[#a99d6b] mb-1 transition-all duration-200 ${
              open ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block w-7 h-0.5 bg-[#a99d6b] transition-all duration-200 ${
              open ? "-rotate-45 -translate-y-2" : ""
            }`}
          />
        </button>
        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-6 ml-auto">
          <NavLink to="/about" className="navlink" activeclassname="active">About</NavLink>
          <NavLink to="/news" className="navlink" activeclassname="active">News</NavLink>
          <NavLink to="/markets" className="navlink" activeclassname="active">Markets</NavLink>
          <NavLink to="/contact" className="navlink" activeclassname="active">Contact</NavLink>
          <NavLink to="/login" className="navlink" activeclassname="active">Login</NavLink>
          <Link to="/register" className="ml-2 px-4 py-2 bg-[#a99d6b] text-white rounded-lg font-bold shadow hover:bg-[#c2b77a] transition">Register</Link>
        </div>
      </div>
      {/* Mobile Nav */}
      {open && (
        <div className="md:hidden fixed inset-0 bg-[#1E3A8A] dark:bg-gray-900 bg-opacity-95 flex flex-col items-end gap-3 px-8 pt-24 pb-8 z-10 transition-all">
          <NavLink
            to="/about"
            className="text-white font-semibold text-lg px-2 py-2 rounded hover:bg-[#a99d6b] hover:text-white transition w-full text-right"
            activeclassname="active"
            onClick={() => setOpen(false)}
          >
            About
          </NavLink>
          <NavLink
            to="/news"
            className="text-white font-semibold text-lg px-2 py-2 rounded hover:bg-[#a99d6b] hover:text-white transition w-full text-right"
            activeclassname="active"
            onClick={() => setOpen(false)}
          >
            News
          </NavLink>
          <NavLink
            to="/markets"
            className="text-white font-semibold text-lg px-2 py-2 rounded hover:bg-[#a99d6b] hover:text-white transition w-full text-right"
            activeclassname="active"
            onClick={() => setOpen(false)}
          >
            Markets
          </NavLink>
          <NavLink
            to="/contact"
            className="text-white font-semibold text-lg px-2 py-2 rounded hover:bg-[#a99d6b] hover:text-white transition w-full text-right"
            activeclassname="active"
            onClick={() => setOpen(false)}
          >
            Contact
          </NavLink>
          <NavLink
            to="/login"
            className="text-white font-semibold text-lg px-2 py-2 rounded hover:bg-[#a99d6b] hover:text-white transition w-full text-right"
            activeclassname="active"
            onClick={() => setOpen(false)}
          >
            Login
          </NavLink>
          <Link
            to="/register"
            className="mt-2 px-4 py-2 bg-[#a99d6b] text-white rounded-lg font-bold shadow hover:bg-[#c2b77a] transition w-full text-right"
            onClick={() => setOpen(false)}
          >
            Register
          </Link>
        </div>
      )}
    </nav>
  );
}

// Optionally, update your CSS for .active if needed:
// .active { text-decoration: underline;