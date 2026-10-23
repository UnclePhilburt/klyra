import RedlineViewer from "../RedlineViewer";
import { redlineCars } from "../../gamesData";

export const metadata = {
  title: "Vehicles · KLYRA: Redline",
  description: "Explore the KLYRA: Redline car models in 3D: open the panels, change paint and rims. In development.",
  alternates: { canonical: "https://klyra.lol/games/redline/vehicles/" },
};

export default function VehiclesPage() {
  return (
    <main className="rlPage rlSub">
      <header className="rlSubHead">
        <p className="rlDev"><i aria-hidden="true" />In development</p>
        <h1>Vehicles</h1>
        <p className="rlLead">Every Redline car model, in 3D. Open the panels, swap paint and rims. Work in progress.</p>
      </header>
      <RedlineViewer cars={redlineCars} />
    </main>
  );
}
