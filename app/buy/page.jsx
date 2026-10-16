import Redirect from "../components/Redirect";

export const metadata = {
  title: "Get Klyra · Klyra: Broken Front",
  robots: { index: false },
};

export default function StoreRedirect() {
  return <Redirect to="/support/#buy" label="The store" />;
}
