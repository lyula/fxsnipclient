import Navbar from "./Navbar";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">{children}</main>
      {/* Footer will go here soon */}
    </div>
  );
}