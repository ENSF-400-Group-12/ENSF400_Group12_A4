import { useEffect } from "react";
import { Link } from "react-router-dom";

/**
 * Shared shell for forgot/reset password (and similar) screens: matches login/signup branding.
 */
export default function AuthShellCard({ title, subtext, children, status }) {
  useEffect(() => {
    document.body.classList.add("signup-page-open");
    return () => document.body.classList.remove("signup-page-open");
  }, []);

  return (
    <div className="auth-theme signup-page">
      <div className="auth-page-background" aria-hidden="true">
        <img src="/closetpic.png" alt="" />
      </div>
      <div className="signup-card">
        <div className="auth-logo-lockup">
          <img src="/ClosetAI-logo-transparent.png" alt="" className="auth-logo-icon" />
          <img src="/ClosetAI-transparent.png" alt="ClosetAI" className="auth-logo-wordmark" />
        </div>
        <h1>{title}</h1>
        <p className="signup-subtext">{subtext}</p>
        {children}
        {status ? (
          <output className="verify-note" aria-live="polite">{status}</output>
        ) : null}
        <p className="signup-text">
          <Link to="/">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
