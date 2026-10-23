// Broken Front section. Canonical URL is /games/broken-front/vehicles/transport-truck/; the old /vehicles/transport-truck/ URL 301-redirects here.
import Page, { metadata as base } from "../../../../vehicles/transport-truck/page";

export const metadata = { ...(base || {}), alternates: { ...((base && base.alternates) || {}), canonical: "https://klyra.lol/games/broken-front/vehicles/transport-truck/" } };
export default Page;
