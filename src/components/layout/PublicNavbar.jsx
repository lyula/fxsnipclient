import { useState } from "react";
import { Link, NavLink } from "react-router-dom";

export default function PublicNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="w-full bg-white dark:bg-gray-900 shadow-sm border-b border-blue-100 dark:border-gray-800 fixed top-0 left-0 z-30">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between w-full">
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
          <NavLink
            to="/"
            className={({ isActive }) =>
              `px-2 py-1 font-semibold rounded transition
              ${isActive ? "text-[#a99d6b] underline" : "text-[#1E3A8A] dark:text-white"}`
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/about"
            className={({ isActive }) =>
              `px-2 py-1 font-semibold rounded transition
              ${isActive ? "text-[#a99d6b] underline" : "text-[#1E3A8A] dark:text-white"}`
            }
          >
            About
          </NavLink>
          <NavLink
            to="/news"
            className={({ isActive }) =>
              `px-2 py-1 font-semibold rounded transition
              ${isActive ? "text-[#a99d6b] underline" : "text-[#1E3A8A] dark:text-white"}`
            }
          >
            News
          </NavLink>
          <NavLink
            to="/markets"
            className={({ isActive }) =>
              `px-2 py-1 font-semibold rounded transition
              ${isActive ? "text-[#a99d6b] underline" : "text-[#1E3A8A] dark:text-white"}`
            }
          >
            Markets
          </NavLink>
          <NavLink
            to="/contact"
            className={({ isActive }) =>
              `px-2 py-1 font-semibold rounded transition
              ${isActive ? "text-[#a99d6b] underline" : "text-[#1E3A8A] dark:text-white"}`
            }
          >
            Contact
          </NavLink>
          <NavLink
            to="/login"
            className={({ isActive }) =>
              `px-2 py-1 font-semibold rounded transition
              ${isActive ? "text-[#a99d6b] underline" : "text-[#1E3A8A] dark:text-white"}`
            }
          >
            Login
          </NavLink>
          <Link to="/register" className="ml-2 px-4 py-2 bg-[#a99d6b] text-white rounded-lg font-bold shadow hover:bg-[#c2b77a] transition">
            Register
          </Link>
        </div>
      </div>
      {/* Mobile Nav */}
      {open && (
        <div className="md:hidden fixed inset-0 bg-[#1E3A8A] dark:bg-gray-900 bg-opacity-95 flex flex-col items-end gap-3 px-6 pt-24 pb-8 z-10 transition-all w-full overflow-x-hidden">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `font-semibold text-lg px-2 py-2 rounded transition w-full text-right ${
                isActive ? "text-[#a99d6b]" : "text-white"
              }`
            }
            onClick={() => setOpen(false)}
          >
            Home
          </NavLink>
          <NavLink
            to="/about"
            className={({ isActive }) =>
              `font-semibold text-lg px-2 py-2 rounded transition w-full text-right ${
                isActive ? "text-[#a99d6b]" : "text-white"
              }`
            }
            onClick={() => setOpen(false)}
          >
            About
          </NavLink>
          <NavLink
            to="/news"
            className={({ isActive }) =>
              `font-semibold text-lg px-2 py-2 rounded transition w-full text-right ${
                isActive ? "text-[#a99d6b]" : "text-white"
              }`
            }
            onClick={() => setOpen(false)}
          >
            News
          </NavLink>
          <NavLink
            to="/markets"
            className={({ isActive }) =>
              `font-semibold text-lg px-2 py-2 rounded transition w-full text-right ${
                isActive ? "text-[#a99d6b]" : "text-white"
              }`
            }
            onClick={() => setOpen(false)}
          >
            Markets
          </NavLink>
          <NavLink
            to="/contact"
            className={({ isActive }) =>
              `font-semibold text-lg px-2 py-2 rounded transition w-full text-right ${
                isActive ? "text-[#a99d6b]" : "text-white"
              }`
            }
            onClick={() => setOpen(false)}
          >
            Contact
          </NavLink>
          <NavLink
            to="/login"
            className={({ isActive }) =>
              `font-semibold text-lg px-2 py-2 rounded transition w-full text-right ${
                isActive ? "text-[#a99d6b]" : "text-white"
              }`
            }
            onClick={() => setOpen(false)}
          >
            Login
          </NavLink>
          <Link
            to="/register"
            className="mt-2 font-bold text-lg text-[#a99d6b] bg-transparent px-2 py-2 rounded transition w-auto text-right shadow-none hover:underline"
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