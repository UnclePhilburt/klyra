// Broken Front section. Canonical URL is /games/broken-front/weapons/; the old /weapons/ URL 301-redirects here.
import Page, { metadata as base } from "../../../weapons/page";

export const metadata = { ...(base || {}), alternates: { ...((base && base.alternates) || {}), canonical: "https://klyra.lol/games/broken-front/weapons/" } };
export default Page;
