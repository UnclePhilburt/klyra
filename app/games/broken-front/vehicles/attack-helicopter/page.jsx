// Broken Front section. Canonical URL is /games/broken-front/vehicles/attack-helicopter/; the old /vehicles/attack-helicopter/ URL 301-redirects here.
import Page, { metadata as base } from "../../../../vehicles/attack-helicopter/page";

export const metadata = { ...(base || {}), alternates: { ...((base && base.alternates) || {}), canonical: "https://klyra.lol/games/broken-front/vehicles/attack-helicopter/" } };
export default Page;
