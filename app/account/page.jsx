"use client";

import { useEffect, useState } from "react";
import SupporterAccess from "../components/SupporterAccess";
import {
  callsignOf,
  memberSince,
  readSession,
  requestReset,
  restoreSession,
  signIn,
  signOut,
  signUp,
  updateCallsign,
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
  const [nextCallsign, setNextCallsign] = useState("");
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
    const enteredPassword = String(form.get("password") || password);
    setEmail(identifier);
    if (!identifier || !enteredPassword) {
      setStatus("Enter your callsign or email, and your password.", true);
      return;
    }
    setBusy(true);
    setStatus("Signing in...");
    try {
      const next = await signIn(identifier, enteredPassword);
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

  const onReset = async (address) => {
    const target = String(address || email).trim();
    if (!target) {
      setStatus("Enter your email first.", true);
      return;
    }
    setBusy(true);
    setStatus("Sending the reset email...");
    try {
      await requestReset(target);
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

  const onCallsign = async (event) => {
    event.preventDefault();
    setBusy(true);
    setStatus("Saving your callsign...");
    try {
      const next = await updateCallsign(session, nextCallsign);
      setNextCallsign("");
      setSession(next);
      setStatus("Callsign updated. You can sign in with it.");
    } catch (requestError) {
      setStatus(requestError.message || "Could not update the callsign.", true);
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

  if (session) {
    const name = callsignOf(session);
    const since = memberSince(session);
    const sinceRaw = session?.profile?.created_at || session?.user?.created_at;
    const sinceDate = sinceRaw ? new Date(sinceRaw) : null;
    const sinceShort = sinceDate && !Number.isNaN(sinceDate.getTime()) ? sinceDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";
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
    const accountEmail = session.user?.email || "";

    return (
      <main className="kxAcctPage">
        <section className="kxIntro kxAcctBanner" style={{ "--kx-bg": "url(/shots/trailer/heli-cabin.jpg)" }}>
          <div className="kxAcctId kxAcctIn">
            <span className="kxAcctEmblem" aria-hidden="true">
              <svg viewBox="0 0 64 64" width="100%" height="100%">
                <path d="M32 4 58 16v18c0 14-11 23-26 27C17 57 6 48 6 34V16Z" fill="none" stroke="currentColor" strokeWidth="2.5" />
                <path d="M18 30l14-8 14 8M18 39l14-8 14 8M18 48l14-8 14 8" fill="none" stroke="currentColor" strokeWidth="4" />
              </svg>
            </span>
            <p className="tag">KLYRA Account</p>
            <h1 className="kxCallsignTitle" title={name} style={{ "--len": Math.max(6, (name || "").length) }}>{name}</h1>
            <p className="kxAcctMeta">
              {sinceShort ? <><span>Member since {sinceShort}</span><i aria-hidden="true">·</i></> : null}
              <span>Pre-alpha</span>
              <span className="kxAcctSupporterTag">Supporter</span>
              <a className="kxAcctGetLink" href="/support/#buy">Get Supporter Edition &rarr;</a>
            </p>
          </div>          <p className="lead kxAcctIn" style={{ "--d": "80ms" }}>
            This is the same account on the website and in the game.<span className="kxDesktopCopy"> The browser version on the play page uses this sign-in. That build has degraded performance because it runs in a web browser.</span>
          </p>
          <p className={error ? "formMessage error" : "formMessage"}>{message}</p>
        </section>
        <div className="kxHazard" aria-hidden="true" />
        <section className="kxAcctBody">
          <div className="kxAcctGrid">
            <article className="kxAcctCard wide license kxAcctIn" id="license" style={{ "--d": "120ms" }}>
              <header>
                <p className="tag">Game license</p>
                <h2>Supporter Edition</h2>
              </header>
              <SupporterAccess />
            </article>

            <article className="kxAcctCard wide kxAcctIn" style={{ "--d": "180ms" }}>
              <header>
                <p className="tag">Your record</p>
                <h2>Service record</h2>
              </header>
              {record.length > 0 ? (
                <div className="kxAcctStats">
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
                <p>Your record shows up after you fight.</p>
              )}
            </article>

            <article className="kxAcctCard kxAcctIn" style={{ "--d": "240ms" }}>
              <header>
                <p className="tag">Profile settings</p>
                <h2>Callsign</h2>
              </header>
              <dl className="kxAcctFacts">
                <div><dt>Callsign</dt><dd className="kxCallsign">{name}</dd></div>
                <div><dt>Email</dt><dd className="kxCallsign">{accountEmail}</dd></div>
              </dl>
              <form onSubmit={onCallsign}>
                <label>
                  New callsign
                  <input
                    value={nextCallsign}
                    onChange={(event) => setNextCallsign(event.target.value)}
                    autoComplete="nickname"
                    minLength={3}
                    maxLength={24}
                    required
                  />
                </label>
                <button className="button" disabled={busy} type="submit">
                  Save callsign
                </button>
              </form>
            </article>

            <article className="kxAcctCard kxAcctIn" style={{ "--d": "300ms" }}>
              <header>
                <p className="tag">Account security</p>
                <h2>Password</h2>
              </header>
              {session.recovery ? (
                <>
                  <p>This link is from your email. Choose a new password.</p>
                  <form onSubmit={onNewPassword}>
                    <label>
                      New password
                      <input
                        value={nextPassword}
                        onChange={(event) => setNextPassword(event.target.value)}
                        type="password"
                        autoComplete="new-password"
                        minLength={8}
                        required
                      />
                    </label>
                    <button className="button" disabled={busy} type="submit">
                      Save password
                    </button>
                  </form>
                </>
              ) : (
                <p>Reset it from your email.</p>
              )}
              <div className="kxAcctActions">
                <button
                  className="button ghost"
                  disabled={busy || !accountEmail}
                  type="button"
                  onClick={() => onReset(accountEmail)}
                >
                  Email me a password reset
                </button>
                <button className="textLink kxAcctSignOut" disabled={busy} type="button" onClick={onSignOut}>
                  Sign out
                </button>
              </div>
            </article>

            <article className="kxAcctCard wide slim kxAcctIn" style={{ "--d": "360ms" }}>
              <p className="tag">Development stage</p>
              <h2>Pre-Alpha</h2>
              <p>The battlefield is still being built. What you download today can change.</p>
            </article>
          </div>
        </section>      </main>
    );
  }

  return (
    <main>
      <section className="pageHero kxIntro kxAcctAuth" style={{ "--kx-bg": "url(/shots/trailer/gunship.jpg)" }}>
        <div>
          <p className="tag">KLYRA Account</p>
          <h1>{mode === "create" ? "Make your name." : "Sign in."}</h1>
          <p className="lead">
            {mode === "create"
              ? "Create the account you will use on the website and in the game."
              : <>Sign in with your callsign or your email. This is the same account the game uses.<span className="kxDesktopCopy"> The browser version on the play page uses it too, with degraded performance because it runs in a web browser.</span></>}
          </p>
          {loading ? <p className="quiet">Restoring any saved sign-in...</p> : null}
        </div>

        {mode === "create" ? (
          <form className="accountCard kxAcctIn" style={{ "--d": "100ms" }} onSubmit={onCreate}>
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
          <form className="accountCard kxAcctIn" style={{ "--d": "100ms" }} onSubmit={onSignIn}>
            <label>
              Callsign or email
              <input
                name="identifier"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onInput={(event) => setEmail(event.target.value)}
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
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
            <button className="textLink" disabled={busy} type="button" onClick={() => onReset(email)}>
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
