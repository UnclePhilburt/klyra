"use client";

import { useState } from "react";
import SiteNav from "../components/SiteNav";
import { supabaseKey, supabaseUrl } from "../site-data";

async function supabaseRequest(path, body) {
  const response = await fetch(`${supabaseUrl}${path}`, {
    method: "POST",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let payload = {};
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text };
    }
  }

  if (!response.ok) {
    throw new Error(
      payload.msg ||
        payload.message ||
        payload.error_description ||
        payload.error ||
        "Could not reach the account service."
    );
  }

  return payload;
}

export default function AccountPage() {
  const [callsign, setCallsign] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const setStatus = (text, bad = false) => {
    setMessage(text);
    setError(bad);
  };

  const createAccount = async (event) => {
    event.preventDefault();
    const cleanCallsign = callsign.trim();
    const cleanEmail = email.trim();

    if (!cleanCallsign || !cleanEmail || !password) {
      setStatus("Fill out callsign, email, and password first.", true);
      return;
    }

    setBusy(true);
    setStatus("Creating your account...");
    try {
      await supabaseRequest("/auth/v1/signup", {
        email: cleanEmail,
        password,
        data: {
          username: cleanCallsign,
          display_name: cleanCallsign,
        },
        email_redirect_to: "https://klyra.lol",
      });
      setStatus(
        "Account created. Check your email if a confirmation is waiting, then sign in from the launcher."
      );
    } catch (requestError) {
      setStatus(requestError.message || "Account creation failed.", true);
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setStatus("Enter your email first.", true);
      return;
    }

    setBusy(true);
    setStatus("Sending the reset email...");
    try {
      await supabaseRequest("/auth/v1/recover", {
        email: cleanEmail,
        redirect_to: "https://klyra.lol",
      });
      setStatus("Check your email for the reset link.");
    } catch (requestError) {
      setStatus(requestError.message || "Password reset failed.", true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="shell">
      <SiteNav />
      <section className="pageHero">
        <div>
          <p className="tag">Your callsign</p>
          <h1>Keep what you bring home.</h1>
          <p className="lead">
            Make an account here, then sign in from the launcher. The gear you
            extract stays in your stash for the next fight.
          </p>
        </div>
        <form className="accountCard" onSubmit={createAccount}>
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
            Create Account
          </button>
          <button
            className="button ghost full"
            disabled={busy}
            type="button"
            onClick={resetPassword}
          >
            Email me a password reset
          </button>
          <p className={error ? "formMessage error" : "formMessage"}>{message}</p>
        </form>
      </section>
    </main>
  );
}
