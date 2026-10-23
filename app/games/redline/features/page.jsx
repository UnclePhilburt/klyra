import { RedlineSubPage } from "../RlBits";

export const metadata = { title: "Features · KLYRA: Redline", description: "What KLYRA: Redline is being built around. In development.", alternates: { canonical: "https://klyra.lol/games/redline/features/" } };

const F = [
  ["Vehicle foundation", "Acceleration and braking, automatic and manual transmissions, engine RPM simulation, realistic engine audio, suspension and handling."],
  ["Cockpit and controls", "Vehicle cameras, speedometer and tachometer, keyboard and controller support."],
  ["Professional circuits", "Elevation changes, banked turns, bridges and track crossings, pit lanes, starting grids and lap timing."],
  ["Multiplayer racing", "Dedicated racing servers, lobbies, matchmaking, friends and parties, then back to the KLYRA Social Hub."],
  ["AI racing", "Racing lines, overtaking, collision avoidance and adjustable difficulty, filling empty grid positions."],
  ["Race modes", "Quick Race, Time Trial and Multiplayer Race are the targets for the first Redline Pro release."],
  ["Redline Street", "Urban environments, night racing, highway and sprint races, drifting, customization, performance upgrades and street reputation."],
  ["Real car models", "The cars in the Garage are the in-development game models, with opening panels."],
];

export default function RedlineFeatures() {
  return (
    <RedlineSubPage className="" title="Features" lead="What Redline is being built around. Everything here is planned. See the roadmap for the order.">
      <div className="rlFeatGrid">
        {F.map(([t, d], i) => (
          <article key={t} className="rlFeat"><span>{String(i + 1).padStart(2, "0")}</span><h2>{t}</h2><p>{d}</p></article>
        ))}
      </div>
    </RedlineSubPage>
  );
}
