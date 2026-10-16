// Login lives in localStorage, which is per-origin. www.klyra.lol served the
// same site as a separate origin, so a player signed in on klyra.lol looked
// signed out on www (and vice versa). Send everyone to the one canonical host
// before anything renders.
export default function CanonicalHost() {
  const code = `(function(){var h=location.hostname;if(h==="www.klyra.lol"){location.replace("https://klyra.lol"+location.pathname+location.search+location.hash);}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
