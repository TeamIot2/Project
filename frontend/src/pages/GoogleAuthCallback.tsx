import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../contexts/I18nContext";

function resolveReturnTo(rawValue: string | null): string {
  if (!rawValue || !rawValue.startsWith("/") || rawValue.startsWith("//") || rawValue.startsWith("/api/")) {
    return "/";
  }
  return rawValue;
}

function getGoogleErrorMessage(errorCode: string | null, isCs: boolean): string {
  if (errorCode === "google_oauth_not_configured") {
    return isCs
      ? "Google přihlášení zatím není nakonfigurované."
      : "Google sign-in is not configured yet.";
  }

  if (errorCode === "access_denied") {
    return isCs
      ? "Přihlášení přes Google bylo zrušeno."
      : "Google sign-in was cancelled.";
  }

  return isCs
    ? "Přihlášení přes Google se nepodařilo."
    : "Google sign-in failed.";
}

export default function GoogleAuthCallback() {
  const { completeTokenLogin } = useAuth();
  const { locale, t } = useI18n();
  const navigate = useNavigate();
  const [message, setMessage] = useState(t.loading);
  const isCs = locale === "cs";

  useEffect(() => {
    let cancelled = false;

    async function finishGoogleLogin() {
      const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const token = params.get("token");
      const error = params.get("error");
      const returnTo = resolveReturnTo(params.get("return_to"));

      window.history.replaceState(null, "", "/auth/google/callback");

      if (error || !token) {
        sessionStorage.setItem("team2appGoogleLoginError", getGoogleErrorMessage(error, isCs));
        navigate("/login", { replace: true });
        return;
      }

      try {
        setMessage(isCs ? "Dokončuji přihlášení přes Google..." : "Completing Google sign-in...");
        await completeTokenLogin(token);
        if (!cancelled) navigate(returnTo, { replace: true });
      } catch {
        sessionStorage.setItem("team2appGoogleLoginError", getGoogleErrorMessage("google_login_failed", isCs));
        if (!cancelled) navigate("/login", { replace: true });
      }
    }

    void finishGoogleLogin();

    return () => {
      cancelled = true;
    };
  }, [completeTokenLogin, isCs, navigate]);

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="loading-spinner" />
        <p className="text-secondary" style={{ textAlign: "center", marginTop: "1rem" }}>
          {message}
        </p>
      </div>
    </div>
  );
}
