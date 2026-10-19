import React, { useState } from "react";
import { Eye, EyeOff, ArrowRight, ShieldCheck, Building2 } from "lucide-react";
import { api } from "../services/api";
import { ErrorBox } from "../components/Common";
export default function Auth({ onLogin, change = false, onLogout }) {
  const [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [next, setNext] = useState(""),
    [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [reset, setReset] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (change) {
        await api("/auth/change-password", {
          method: "PATCH",
          body: { currentPassword: password, newPassword: next },
        });
        await onLogout();
      } else {
        await api("/auth/login", {
          method: "POST",
          body: { username, password },
        });
        await onLogin();
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout">
      <aside className="auth-story">
        <div className="brand light">
          <span className="brand-mark">
            a<span>l</span>s
          </span>
          <div>
            ALS Infonet<small>CONNECTED. ORGANIZED. TOGETHER.</small>
          </div>
        </div>
        <div className="story-content">
          <div className="story-label">THE WAY WE WORK</div>
          <h1>
            Good relationships.
            <br />
            Great work.
          </h1>
          <p>
            One shared workspace for the people,
            <br />
            projects, and conversations that move us forward.
          </p>
          <div className="story-lines">
            <span />
            <span />
            <span />
          </div>
        </div>
        <footer>
          ALS Infonet · Internal workspace <ShieldCheck size={16} />
        </footer>
      </aside>
      <main className="auth-main">
        <div className="login-box">
          <div className="login-symbol">
            <Building2 size={25} />
          </div>
          <div className="eyebrow">ALS INFONET WORKSPACE</div>
          <h1>{change ? "Secure your account" : "Welcome back"}</h1>
          <p>
            {change
              ? "Change your temporary password to continue."
              : "Sign in to your account to get started."}
          </p>
          <ErrorBox message={error} />
          {reset ? (
            <div className="reset-info">
              <h3>Need a password reset?</h3>
              <p>
                Contact your CEO or system administrator through a verified
                private channel. They can issue an individual temporary
                credential. No password is sent to an unverified address.
              </p>
              <button onClick={() => setReset(false)}>Back to sign in</button>
            </div>
          ) : (
            <form onSubmit={submit}>
              {!change && (
                <label>
                  Email or username
                  <input
                    autoComplete="username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                  />
                </label>
              )}
              <label>
                {change ? "Temporary or current password" : "Password"}
                <div className="password-field">
                  <input
                    type={show ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    aria-label={show ? "Hide password" : "Show password"}
                    onClick={() => setShow(!show)}
                  >
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>
              {change && (
                <label>
                  New password
                  <input
                    aria-label="New password"
                    type="password"
                    minLength={14}
                    maxLength={72}
                    required
                    autoComplete="new-password"
                    value={next}
                    onChange={(e) => setNext(e.target.value)}
                  />
                  <small>
                    14–72 characters, including a letter and a number.
                  </small>
                </label>
              )}
              {!change && (
                <button
                  type="button"
                  className="text-button forgot"
                  onClick={() => setReset(true)}
                >
                  Forgot your password?
                </button>
              )}
              <button className="primary login-submit" disabled={busy}>
                {busy
                  ? "Please wait…"
                  : change
                    ? "Change password & sign out"
                    : "Sign in"}
                <ArrowRight size={17} />
              </button>
            </form>
          )}
          <div className="login-security">
            <ShieldCheck size={15} /> Secure access for authorized team members
          </div>
          {change && (
            <button className="text-button" onClick={onLogout}>
              Sign out
            </button>
          )}
        </div>
        <div className="auth-copyright">
          © {new Date().getFullYear()} ALS Infonet. All rights reserved.
        </div>
      </main>
    </div>
  );
}
