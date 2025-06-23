import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import PublicLayout from "./components/layout/PublicLayout";
import PrivateLayout from "./components/layout/PrivateLayout";
import Landing from "./pages/Landing";
import About from "./pages/About";
import News from "./pages/News";
import Markets from "./pages/Markets";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import Register from "./pages/Register"; // Add this import

function Placeholder({ title }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <h1 className="text-3xl font-bold text-blue-900 dark:text-white mb-4">{title}</h1>
      <p className="text-gray-600 dark:text-gray-300">This is the {title} page.</p>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/about" element={<About />} />
          <Route path="/news" element={<News />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/markets" element={<Markets />} />
        </Route>
        <Route path="/login" element={<Login />} /> {/* Independent */}
        <Route path="/register" element={<Register />} /> {/* Independent */}
        <Route element={<PrivateLayout />}>
          <Route path="/dashboard" element={<Placeholder title="Dashboard" />} />
          <Route path="/tsr" element={<Placeholder title="TSR" />} />
          <Route path="/stats" element={<Placeholder title="Stats" />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;