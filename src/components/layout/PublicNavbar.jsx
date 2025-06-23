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
          className="md:hidden ml-auto flex flex-col justify-center items-center w-10 h-10 focus:outline-none"
          onClick={() => setOpen((v) => !v)}
          aria-label="Open navigation"
        >
          <span className={`block w-7 h-0.5 bg-[#a99d6b] mb-1 transition-all duration-200`} />
          <span className={`block w-7 h-0.5 bg-[#a99d6b] mb-1 transition-all duration-200`} />
          <span className={`block w-7 h-0.5 bg-[#a99d6b] transition-all duration-200`} />
        </button>
        {/* Nav Links */}
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
        <div className="md:hidden px-4 pb-4 flex flex-col items-end gap-3 bg-white dark:bg-gray-900 shadow">
          <NavLink to="/about" className="navlink" activeclassname="active" onClick={() => setOpen(false)}>About</NavLink>
          <NavLink to="/news" className="navlink" activeclassname="active" onClick={() => setOpen(false)}>News</NavLink>
          <NavLink to="/markets" className="navlink" activeclassname="active" onClick={() => setOpen(false)}>Markets</NavLink>
          <NavLink to="/contact" className="navlink" activeclassname="active" onClick={() => setOpen(false)}>Contact</NavLink>
          <NavLink to="/login" className="navlink" activeclassname="active" onClick={() => setOpen(false)}>Login</NavLink>
          <Link to="/register" className="mt-2 px-4 py-2 bg-[#a99d6b] text-white rounded-lg font-bold shadow hover:bg-[#c2b77a] transition" onClick={() => setOpen(false)}>Register</Link>
        </div>
      )}
    </nav>
  );
}

// Add this to your CSS (e.g., index.css or tailwind config)
// .navlink { @apply text-[#1E3A8A] dark:text-white font-semibold px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-gray-800 transition; }
// .active { @apply underline text-[#a99d6b]; }