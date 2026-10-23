// Broken Front section. Canonical URL is /games/broken-front/weapons/ak-74/; the old /weapons/ak-74/ URL 301-redirects here.
import Page, { metadata as base } from "../../../../weapons/ak-74/page";

export const metadata = { ...(base || {}), alternates: { ...((base && base.alternates) || {}), canonical: "https://klyra.lol/games/broken-front/weapons/ak-74/" } };
export default Page;
