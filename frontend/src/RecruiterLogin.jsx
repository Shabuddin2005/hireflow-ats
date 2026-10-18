
import { useState } from "react";
import "./RecruiterLogin.css";

function RecruiterLogin({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(
        "https://hireflow-ats-backend.onrender.com/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email, password })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Login failed");
        return;
      }

      if (!data.token) {
        setMessage("Login failed: token was not returned.");
        return;
      }

      sessionStorage.setItem("token", data.token);
      onLoginSuccess();
    } catch (error) {
      setMessage("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="recruiter-login">
      <h2>HireFlow ATS</h2>
      <h3>Recruiter Login</h3>

      <form onSubmit={handleLogin}>
        <div>
          <label htmlFor="recruiter-email">Email</label>
          <input
            id="recruiter-email"
            type="email"    
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter recruiter email"
            autoComplete="username"
            required
          />
        </div>

        <div>
          <label htmlFor="recruiter-password">Password</label>
          <input
            id="recruiter-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            autoComplete="current-password"
            required
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>

        {message && <p role="alert">{message}</p>}
      </form>
    </div>
  );
}

export default RecruiterLogin;
