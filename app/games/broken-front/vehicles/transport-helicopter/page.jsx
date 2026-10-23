// Broken Front section. Canonical URL is /games/broken-front/vehicles/transport-helicopter/; the old /vehicles/transport-helicopter/ URL 301-redirects here.
import Page, { metadata as base } from "../../../../vehicles/transport-helicopter/page";

export const metadata = { ...(base || {}), alternates: { ...((base && base.alternates) || {}), canonical: "https://klyra.lol/games/broken-front/vehicles/transport-helicopter/" } };
export default Page;
