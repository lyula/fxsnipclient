import { useAuth } from "../../context/auth";

export default function DashboardHeader() {
  const { logout } = useAuth();

  return (
    <header className="bg-white dark:bg-gray-900 shadow flex items-center justify-between px-4 py-3">
      <h1 className="text-xl font-bold text-blue-900 dark:text-white tracking-tight">
        FXsnip Dashboard
      </h1>
      <button
        onClick={logout}
        className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 transition"
      >
        Logout
      </button>
    </header>
  );
}