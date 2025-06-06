import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import TimeTracker from "./pages/TimeTracker";
import Projects from "./pages/Projects";
import Reports from "./pages/Reports";
import LandingPage from "./pages/LandingPage";

function Layout({ children }) {
  const location = useLocation();
  const isLanding = location.pathname === "/" || location.pathname === "/landingPage";
  if (isLanding) {
    return <>{children}</>;
  }
  return (
    <div className="flex h-screen w-screen max-w-full overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="p-6 overflow-y-auto min-w-0">{children}</main>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tracker" element={<TimeTracker />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/landingPage" element={<LandingPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
