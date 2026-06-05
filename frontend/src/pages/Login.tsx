// Login page: centered card with email/password form

import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../contexts/I18nContext";
import { apiUrl } from "../api";
import { AlertCircle, Globe } from "../components/Icons";

export default function Login() {
  const { login, loading } = useAuth();
  const { locale, t, setLocale } = useI18n();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const googleLoginError = sessionStorage.getItem("team2appGoogleLoginError");
    if (!googleLoginError) return;
    sessionStorage.removeItem("team2appGoogleLoginError");
    setError(googleLoginError);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError(t.login_error);
      return;
    }

    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch {
      setError(t.login_error);
    }
  }

  function handleGoogleLogin() {
    setError("");
    const callbackUrl = `${window.location.origin}/auth/google/callback`;
    window.location.assign(apiUrl("/auth/google/start", {
      frontend_redirect_uri: callbackUrl,
      return_to: "/",
    }));
  }

  async function handleQuickUserLogin() {
    setError("");
    try {
      await login("uzivatel1@email.com", "uzivatel1");
      navigate("/", { replace: true });
    } catch {
      setError(t.login_error);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-lang-toggle">
          <button
            className="lang-toggle"
            onClick={() => setLocale(locale === "cs" ? "en" : "cs")}
            title={t.language}
          >
            <Globe size={16} />
            <span>{locale === "cs" ? "CZ" : "EN"}</span>
          </button>
        </div>

        <div className="login-header">
          <span className="login-brand-icon">IoT</span>
          <h1 className="login-title">Team2App</h1>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="login-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              {t.email}
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="admin@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              {t.password}
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder={t.password_placeholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary login-btn"
            disabled={loading}
          >
            {loading ? t.loading : t.sign_in}
          </button>

          <div className="login-divider">
            <span>{locale === "cs" ? "nebo" : "or"}</span>
          </div>

          <button
            type="button"
            className="btn btn-outline login-btn"
            onClick={handleQuickUserLogin}
            disabled={loading}
          >
            {locale === "cs" ? "Přihlásit jako uzivatel1" : "Sign in as uzivatel1"}
          </button>

          <button
            type="button"
            className="btn btn-outline login-btn"
            onClick={handleGoogleLogin}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" className="google-icon">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {t.sign_in_google}
          </button>
        </form>
      </div>
    </div>
  );
}
