import axios from "axios";
import { type FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { AuthSession } from "../types";

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@orga.com");
  const [password, setPassword] = useState("Password1!");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/tasks" replace />;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const { data } = await api.post<AuthSession>("/auth/login", { email, password });
      login(data);
      navigate("/tasks", { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError("Invalid email or password.");
      } else {
        setError("Could not sign in.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <form className="card login-card" onSubmit={onSubmit}>
        <h1>TaskHub Pro</h1>
        <p className="muted">Sign in to view tasks.</p>
        <label>
          Email
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
