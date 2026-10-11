"use client";

import { useEffect, useState } from "react";
import {
  callsignOf,
  memberSince,
  readSession,
  requestReset,
  restoreSession,
  signIn,
  signOut,
  signUp,
  updatePassword,
} from "../session";

function count(value) {
  return Number(value || 0).toLocaleString();
}

export default function AccountPage() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("signin");
  const [callsign, setCallsign] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    const apply = (next) => {
      if (!live) return;
      setSession(next || readSession());
    };

    const cached = readSession();
    if (cached) setSession(cached);

    restoreSession()
      .then((next) => apply(next))
      .finally(() => {
        if (live) setLoading(false);
      });

    const onSession = () => apply(readSession());
    window.addEventListener("klyra-session", onSession);
    return () => {
      live = false;
      window.removeEventListener("klyra-session", onSession);
    };
  }, []);

  const setStatus = (text, bad = false) => {
    setMessage(text);
    setError(bad);
  };

  const onSignIn = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const identifier = String(form.get("identifier") || email).trim();
    const nextPassword = String(form.get("password") || password);
    setEmail(identifier);
    if (!identifier || !nextPassword) {
      setStatus("Enter your callsign or email, and your password.", true);
      return;
    }
    setBusy(true);
    setStatus("Signing in...");
    try {
      const next = await signIn(identifier, nextPassword);
      setPassword("");
      setSession(next);
      setStatus("");
    } catch (requestError) {
      setStatus(requestError.message || "Sign in failed.", true);
    } finally {
      setBusy(false);
    }
  };

  const onCreate = async (event) => {
    event.preventDefault();
    const cleanCallsign = callsign.trim();
    if (!cleanCallsign || !email.trim() || !password) {
      setStatus("Fill out callsign, email, and password first.", true);
      return;
    }
    setBusy(true);
    setStatus("Creating your account...");
    try {
      const result = await signUp(cleanCallsign, email.trim(), password);
      setPassword("");
      if (result.session) {
        setSession(result.session);
        setStatus("");
      } else {
        setStatus("Account created. Check your email, then sign in.");
        setMode("signin");
      }
    } catch (requestError) {
      setStatus(requestError.message || "Account creation failed.", true);
    } finally {
      setBusy(false);
    }
  };

  const onReset = async () => {
    if (!email.trim()) {
      setStatus("Enter your email first.", true);
      return;
    }
    setBusy(true);
    setStatus("Sending the reset email...");
    try {
      await requestReset(email.trim());
      setStatus("Check your email for the reset link.");
    } catch (requestError) {
      setStatus(requestError.message || "Password reset failed.", true);
    } finally {
      setBusy(false);
    }
  };

  const onNewPassword = async (event) => {
    event.preventDefault();
    if (nextPassword.length < 8) {
      setStatus("Use at least 8 characters.", true);
      return;
    }
    setBusy(true);
    setStatus("Saving your password...");
    try {
      const next = await updatePassword(session, nextPassword);
      setNextPassword("");
      setSession(next);
      setStatus("Password updated.");
    } catch (requestError) {
      setStatus(requestError.message || "Could not update the password.", true);
    } finally {
      setBusy(false);
    }
  };

  const onSignOut = async () => {
    setBusy(true);
    await signOut(session);
    setSession(null);
    setMessage("");
    setBusy(false);
  };

  if (loading && !session) {
    return (
      <main>
        <section className="pageHero">
          <div>
            <p className="tag">Account</p>
            <h1>Opening your account.</h1>
          </div>
        </section>
      </main>
    );
  }

  if (session) {
    const name = callsignOf(session);
    const since = memberSince(session);
    const stats = session.stats;
    const record = stats
      ? [
          ["Wins", stats.wins],
          ["Losses", stats.losses],
          ["Kills", stats.kills],
          ["Deaths", stats.deaths],
          ["Revives", stats.revives],
        ]
      : [];

    return (
      <main>
        <section className="pageHero accountHome">
          <div>
            <p className="tag">Signed in</p>
            <h1>{name}</h1>
            <p className="lead">{session.user?.email}</p>
            <p className="quiet">
              {since ? `Member since ${since}. ` : ""}
              You are signed in. This callsign is the one the game uses. Gear
              you bring home stays here.
            </p>
            <div className="actions">
              <a className="button" href="/download/">
                Play
              </a>
              <button className="button ghost" type="button" disabled={busy} onClick={onSignOut}>
                Sign out
              </button>
            </div>
            <p className={error ? "formMessage error" : "formMessage"}>{message}</p>
          </div>

          <div className="dossier">
            {session.recovery ? (
              <form className="passwordBox" onSubmit={onNewPassword}>
                <p className="tag">New password</p>
                <label>
                  Password
                  <input
                    value={nextPassword}
                    onChange={(event) => setNextPassword(event.target.value)}
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </label>
                <button className="button full" disabled={busy} type="submit">
                  Save password
                </button>
              </form>
            ) : null}

            <p className="tag">Your record</p>
            {record.length > 0 ? (
              <div className="statGrid">
                {record.map(([label, value]) => (
                  <div key={label}>
                    <strong>{count(value)}</strong>
                    <span>{label}</span>
                  </div>
                ))}
                <div>
                  <strong>{count(stats.cash_earned)}</strong>
                  <span>Cash earned</span>
                </div>
                {session.stashCount != null ? (
                  <div>
                    <strong>{count(session.stashCount)}</strong>
                    <span>In your stash</span>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="quiet">Your record shows up after you fight.</p>
            )}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="pageHero">
        <div>
          <p className="tag">Your callsign</p>
          <h1>{mode === "create" ? "Make your name." : "Sign in."}</h1>
          <p className="lead">
            {mode === "create"
              ? "Create the account you will use in the game. Extracted gear stays on it."
              : "Sign in with your callsign or your email."}
          </p>
        </div>

        {mode === "create" ? (
          <form className="accountCard" onSubmit={onCreate}>
            <label>
              Callsign
              <input
                value={callsign}
                onChange={(event) => setCallsign(event.target.value)}
                autoComplete="nickname"
                maxLength={24}
                required
              />
            </label>
            <label>
              Email
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
                required
              />
            </label>
            <label>
              Password
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
            <button className="button full" disabled={busy} type="submit">
              Create account
            </button>
            <button
              className="textLink"
              disabled={busy}
              type="button"
              onClick={() => {
                setMode("signin");
                setMessage("");
              }}
            >
              I already have an account
            </button>
            <p className={error ? "formMessage error" : "formMessage"}>{message}</p>
          </form>
        ) : (
          <form className="accountCard" onSubmit={onSignIn}>
            <label>
              Callsign or email
              <input
                name="identifier"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onInput={(event) => setEmail(event.target.value)}
                type="text"
                autoComplete="username"
                required
              />
            </label>
            <label>
              Password
              <input
                name="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onInput={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
            <button className="button full" disabled={busy} type="submit">
              Sign in
            </button>
            <button className="textLink" disabled={busy} type="button" onClick={onReset}>
              Email me a password reset
            </button>
            <button
              className="textLink"
              disabled={busy}
              type="button"
              onClick={() => {
                setMode("create");
                setMessage("");
              }}
            >
              Create an account
            </button>
            <p className={error ? "formMessage error" : "formMessage"}>{message}</p>
          </form>
        )}
      </section>
    </main>
  );
}
