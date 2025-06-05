import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import TimeTracker from "./pages/TimeTracker";
import Projects from "./pages/Projects";
import Reports from "./pages/Reports";
import LandingPage from "./pages/LandingPage";

function App() {
  return (
    <Router>
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Navbar />
          <main className="p-6 overflow-y-auto">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/tracker" element={<TimeTracker />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/landingPage" element={<LandingPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
