// Broken Front section. Canonical URL is /games/broken-front/weapons/m4a1/; the old /weapons/m4a1/ URL 301-redirects here.
import Page, { metadata as base } from "../../../../weapons/m4a1/page";

export const metadata = { ...(base || {}), alternates: { ...((base && base.alternates) || {}), canonical: "https://klyra.lol/games/broken-front/weapons/m4a1/" } };
export default Page;
