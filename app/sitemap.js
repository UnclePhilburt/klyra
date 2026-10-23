export const dynamic = "force-static";

const paths = ["/", "/features/", "/factions/", "/factions/the-regiment/", "/factions/kin-of-the-hollow/", "/factions/blackline-group/", "/arsenal/", "/weapons/", "/weapons/ak-74/", "/weapons/m4a1/", "/vehicles/", "/vehicles/attack-helicopter/", "/vehicles/transport-helicopter/", "/vehicles/m9-halberd-tank/", "/vehicles/transport-truck/", "/download/", "/roadmap/", "/community/", "/devlog/", "/support/", "/store/", "/account/", "/games/", "/news/", "/games/broken-front/", "/games/redline/", "/games/redline/features/", "/games/redline/pro/", "/games/redline/street/", "/games/redline/vehicles/", "/games/redline/media/", "/games/redline/roadmap/"];

export default function sitemap() {
  return paths.map((p) => ({ url: `https://klyra.lol${p}`, changeFrequency: "weekly", priority: p === "/" ? 1 : 0.7 }));
}