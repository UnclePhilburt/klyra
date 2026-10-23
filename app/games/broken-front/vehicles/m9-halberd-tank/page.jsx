// Broken Front section. Canonical URL is /games/broken-front/vehicles/m9-halberd-tank/; the old /vehicles/m9-halberd-tank/ URL 301-redirects here.
import Page, { metadata as base } from "../../../../vehicles/m9-halberd-tank/page";

export const metadata = { ...(base || {}), alternates: { ...((base && base.alternates) || {}), canonical: "https://klyra.lol/games/broken-front/vehicles/m9-halberd-tank/" } };
export default Page;
