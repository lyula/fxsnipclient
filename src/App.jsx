import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import PublicLayout from "./components/layout/PublicLayout";
import PrivateLayout from "./components/layout/PrivateLayout";
import Landing from "./pages/Landing";
import About from "./pages/About";
import News from "./pages/News";
import Markets from "./pages/Markets";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Terms from "./pages/Terms";
import { useTheme } from "./hooks/useTheme"; // <-- Make sure this exists

function Placeholder({ title }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <h1 className="text-3xl font-bold text-blue-900 dark:text-white mb-4">{title}</h1>
      <p className="text-gray-600 dark:text-gray-300">This is the {title} page.</p>
    </div>
  );
}

function App() {
  const [darkMode] = useTheme();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  return (
    <Router>
      <Routes>
        {/* Terms page should be independent */}
        <Route path="/terms" element={<Terms />} />
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/about" element={<About />} />
          <Route path="/news" element={<News />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/markets" element={<Markets />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route element={<PrivateLayout />}>
          <Route path="/tsr" element={<Placeholder title="TSR" />} />
          <Route path="/stats" element={<Placeholder title="Stats" />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;