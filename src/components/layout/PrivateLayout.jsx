import { Outlet } from "react-router-dom";
import DashboardHeader from "./DashboardHeader";

export default function PrivateLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <DashboardHeader />
      <main className="flex-1 container mx-auto px-4 py-8">
        <Outlet />
      </main>
      {/* Add PrivateFooter here if needed */}
    </div>
  );
}