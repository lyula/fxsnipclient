export default function Footer() {
  return (
    <footer className="w-full bg-[#1E3A8A] dark:bg-gray-900 text-white py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-2">
        <span className="text-sm tracking-wide">
          &copy; {new Date().getFullYear()} FXsnip. All rights reserved.
        </span>
        <span className="text-xs text-[#a99d6b] tracking-widest">
          Built with ❤️ for traders.
        </span>
      </div>
    </footer>
  );
}