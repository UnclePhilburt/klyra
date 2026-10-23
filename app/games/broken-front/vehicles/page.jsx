// Broken Front section. Canonical URL is /games/broken-front/vehicles/; the old /vehicles/ URL 301-redirects here.
import Page, { metadata as base } from "../../../vehicles/page";

export const metadata = { ...(base || {}), alternates: { ...((base && base.alternates) || {}), canonical: "https://klyra.lol/games/broken-front/vehicles/" } };
export default Page;
