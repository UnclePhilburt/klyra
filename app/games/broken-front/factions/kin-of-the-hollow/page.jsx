// Broken Front section. Canonical URL is /games/broken-front/factions/kin-of-the-hollow/; the old /factions/kin-of-the-hollow/ URL 301-redirects here.
import Page, { metadata as base } from "../../../../factions/kin-of-the-hollow/page";

export const metadata = { ...(base || {}), alternates: { ...((base && base.alternates) || {}), canonical: "https://klyra.lol/games/broken-front/factions/kin-of-the-hollow/" } };
export default Page;
