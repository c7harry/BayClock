import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import TimeTracker from "./pages/TimeTracker";
import Projects from "./pages/Projects";
import LandingPage from "./pages/LandingPage";
import CalendarPage from "./pages/Calendar";
import LoginPage from "./pages/LoginPage";
import AdminPanel from "./pages/AdminPanel";
import { supabase } from "./supabaseClient";
import { useEffect, useState } from "react";
import AllEntries from "./pages/AdminEntries";
import ResetPassword from "./pages/ResetPassword";
import UnifiedSidebar from "./components/UnifiedSidebar";
import Timesheet from "./pages/Timesheet";

// Helper: Protect routes by role
function ProtectedRoute({ children, allowedRoles }) {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function fetchRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        if (!ignore) setRole(profile?.role || null);
      }
      if (!ignore) setLoading(false);
    }
    fetchRole();

    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      setLoading(true);
      fetchRole();
    });

    return () => {
      ignore = true;
      listener?.subscription.unsubscribe();
    };
  }, []);

  if (loading) return <div style={{ minHeight: "100vh" }} />; // or a spinner

  if (!role || (allowedRoles && !allowedRoles.includes(role))) {
    // Not allowed, redirect to login or dashboard
    return <Navigate to={role === "admin" ? "/admin" : "/dashboard"} replace />;
  }

  return children;
}

function BackgroundWrapper({ children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        minWidth: "100vw",
        backgroundImage: "url('/Background.png')",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
        backgroundPosition: "center center",
      }}
    >
      {children}
    </div>
  );
}

function Layout({ children }) {
  const location = useLocation();
  const isLogin = location.pathname === "/login";
  const isLanding = location.pathname === "/" || location.pathname === "/landingPage";
  const isAdminPage =
    location.pathname.startsWith("/admin") ||
    location.pathname === "/projects" ||
    location.pathname === "/all-entries";
  const isProjectsPage = location.pathname === "/projects";
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function fetchRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        if (!ignore) setRole(profile?.role || null);
      }
      if (!ignore) setLoading(false);
    }
    fetchRole();

    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      setLoading(true);
      fetchRole();
    });

    return () => {
      ignore = true;
      listener?.subscription.unsubscribe();
    };
  }, []);

  if (isLanding || isLogin) {
    return <>{children}</>;
  }

  // Block rendering until role is known
  if (loading || !role) {
    return <div />; // or a spinner if you want
  }

  // Use UnifiedSidebar for both admin and user, passing the role
  return (
    <div className="flex h-screen w-screen max-w-full overflow-x-hidden">
      <UnifiedSidebar role={role} />
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
      <BackgroundWrapper>
        <Layout>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            {/* Admin-only route */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminPanel />
                </ProtectedRoute>
              }
            />
            <Route
              path="/all-entries"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AllEntries />
                </ProtectedRoute>
              }
            />
            {/* User-only routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={["user"]}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tracker"
              element={
                <ProtectedRoute allowedRoles={["user"]}>
                  <TimeTracker />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects"
              element={
                <ProtectedRoute allowedRoles={["user", "admin"]}>
                  <Projects />
                </ProtectedRoute>
              }
            />
            <Route
              path="/calendar"
              element={
                <ProtectedRoute allowedRoles={["user"]}>
                  <CalendarPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/timesheet"
              element={
                <ProtectedRoute allowedRoles={["user"]}>
                  <Timesheet />
                </ProtectedRoute>
              }
            />
            <Route path="/landingPage" element={<LandingPage />} />
            <Route
              path="/all-entries"
              element={
                <ProtectedRoute allowedRoles={["user", "admin"]}>
                  <AllEntries />
                </ProtectedRoute>
              }
            />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Routes>
        </Layout>
      </BackgroundWrapper>
    </Router>
  );
}

export default App;
