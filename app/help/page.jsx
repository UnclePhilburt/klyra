import Redirect from "../components/Redirect";

export const metadata = {
  title: "Support Klyra · Klyra: Broken Front",
  robots: { index: false },
};

export default function HelpRedirect() {
  return <Redirect to="/support/#team" label="Help" />;
}
