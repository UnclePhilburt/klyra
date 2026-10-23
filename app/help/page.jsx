import Redirect from "../components/Redirect";

export const metadata = {
  title: "Help · KLYRA",
  robots: { index: false },
};

export default function HelpRedirect() {
  return <Redirect to="/support/#team" label="Help" />;
}
