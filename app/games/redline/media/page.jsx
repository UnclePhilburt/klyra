import { RedlineSubPage, CarGrid } from "../RlBits";

export const metadata = { title: "Media · KLYRA: Redline", description: "Work-in-progress KLYRA: Redline car renders.", alternates: { canonical: "https://klyra.lol/games/redline/media/" } };

export default function Media() {
  return (
    <RedlineSubPage className="" title="Media" lead="Work-in-progress car renders. No gameplay footage yet.">
      <CarGrid />
    </RedlineSubPage>
  );
}
