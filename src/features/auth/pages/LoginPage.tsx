import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { signIn } from "../api/auth";
import { useAuth } from "../../../app/providers/AuthProvider";

export default function LoginPage() {
  const navigate = useNavigate();

  const { session, profile, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <p>Загрузка...</p>;

  if (session && profile) {
    return (
      <Navigate
        to={profile.role === "manager" ? "/objects" : "/my-tasks"}
        replace
      />
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setError("");
      setSubmitting(true);

      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка входа");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main>
      <h1>Вход в систему</h1>

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" disabled={submitting}>
          {submitting ? "Входим..." : "Войти"}
        </button>

        {error && <p>{error}</p>}
      </form>
    </main>
  );
}
