"use client";

import { useEffect, useState } from "react";
import { macLauncher, windowsLauncher } from "../site-data";

const files = {
  windows: { href: windowsLauncher, label: "Download for Windows", other: "mac" },
  mac: { href: macLauncher, label: "Download for Mac", other: "windows" },
};

function detectComputer() {
  const ua = `${navigator.userAgent || ""} ${navigator.platform || ""}`;
  if (/Mac|iPhone|iPad/i.test(ua)) return "mac";
  return "windows";
}

export default function DownloadPanel() {
  const [computer, setComputer] = useState("windows");

  useEffect(() => {
    setComputer(detectComputer());
  }, []);

  const choice = files[computer];
  const otherName = choice.other === "mac" ? "Mac" : "Windows";

  return (
    <section className="pageHero downloadPage">
      <div className="downloadArt" aria-hidden="true" />
      <div className="downloadCopy">
        <p className="tag">Pre-alpha</p>
        <h1>Get on the front.</h1>
        <p className="lead">
          One download. Then you are in the fight with Ironclad, Timberwolf,
          and Vanguard.
        </p>
        <div className="actions">
          <a className="button huge" href={choice.href}>
            {choice.label}
          </a>
          <button className="textLink" type="button" onClick={() => setComputer(choice.other)}>
            Need it for {otherName}?
          </button>
        </div>
      </div>
      <div className="mission">
        <article>
          <span>01</span>
          <h3>Drop in</h3>
          <p>Pick Ironclad, Timberwolf, or Vanguard.</p>
        </article>
        <article>
          <span>02</span>
          <h3>Push</h3>
          <p>The battle zone moves. Trucks and helicopters keep it supplied.</p>
        </article>
        <article>
          <span>03</span>
          <h3>Come home</h3>
          <p>Sign in so the gear you extract is waiting next time.</p>
        </article>
      </div>
    </section>
  );
}
