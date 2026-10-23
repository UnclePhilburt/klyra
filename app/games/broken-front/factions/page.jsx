// Broken Front section. Canonical URL is /games/broken-front/factions/; the old /factions/ URL 301-redirects here.
import Page, { metadata as base } from "../../../factions/page";

export const metadata = { ...(base || {}), alternates: { ...((base && base.alternates) || {}), canonical: "https://klyra.lol/games/broken-front/factions/" } };
export default Page;
