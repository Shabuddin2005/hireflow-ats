
import { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
  useNavigate,
  useLocation,
} from "react-router-dom";

import "./App.css";
import Jobs from "./pages/jobs";
import RecruiterDashboard from "./pages/RecruiterDashboard";
import RecruiterLogin from "./RecruiterLogin";

function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isLoggedIn, setIsLoggedIn] = useState(
    Boolean(sessionStorage.getItem("token"))
  );

  function handleLoginSuccess() {
    setIsLoggedIn(true);
    navigate("/recruiter/dashboard", { replace: true });
  }

  function handleLogout() {
    sessionStorage.removeItem("token");
    setIsLoggedIn(false);
    navigate("/recruiter/login", { replace: true });
  }

  return (
    <div className="app">
      <header className="navbar">
        <h2>HireFlow ATS</h2>

        <nav>
          <Link to="/jobs">Find Jobs</Link>

          <Link to="/recruiter/dashboard">
  Recruiter Dashboard
</Link>

{isLoggedIn && (
  <button type="button" onClick={handleLogout}>
    Logout
  </button>
)}
        </nav>
      </header>

      <Routes>
        <Route
          path="/"
          element={<Navigate to="/jobs" replace />}
        />

        <Route path="/jobs" element={<Jobs />} />

        <Route
          path="/recruiter/login"
          element={
            isLoggedIn ? (
              <Navigate to="/recruiter/dashboard" replace />
            ) : (
              <RecruiterLogin
                onLoginSuccess={handleLoginSuccess}
              />
            )
          }
        />

        <Route
          path="/recruiter/dashboard"
          element={
            isLoggedIn ? (
              <RecruiterDashboard
                key={location.pathname}
                onLogout={handleLogout}
              />
            ) : (
              <Navigate to="/recruiter/login" replace />
            )
          }
        />

        <Route
          path="*"
          element={<Navigate to="/jobs" replace />}
        />
      </Routes>

      {location.pathname !== "/jobs" && (
        <footer id="about">
          <p>
            © 2026 HireFlow ATS | Applicant Tracking System
          </p>
        </footer>
      )}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
