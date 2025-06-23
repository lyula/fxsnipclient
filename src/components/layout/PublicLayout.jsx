import { Outlet } from "react-router-dom";
import PublicNavbar from "./PublicNavbar";
// import Footer from "./Footer";

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <PublicNavbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <Outlet />
      </main>
      {/* <Footer /> */}
    </div>
  );
}