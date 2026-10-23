import Redirect from "../../components/Redirect";

export const metadata = { title: "KLYRA: Broken Front", robots: { index: false }, alternates: { canonical: "https://klyra.lol/" } };

export default function BrokenFrontAlias() {
  return <Redirect to="/" label="KLYRA: Broken Front" />;
}
