// Static-export-friendly redirect: meta refresh for no-JS, location.replace
// for everyone else (keeps any #hash the visitor arrived with).
export default function Redirect({ to, label }) {
  const code = `(function(){var h=location.hash;location.replace(${JSON.stringify(to)}+(h&&${JSON.stringify(!to.includes("#"))}?h:""));})();`;
  return (
    <main className="section" style={{ paddingTop: 140, minHeight: "60vh" }}>
      <meta httpEquiv="refresh" content={`0; url=${to}`} />
      <link rel="canonical" href={`https://klyra.lol${to.split("#")[0]}`} />
      <script dangerouslySetInnerHTML={{ __html: code }} />
      <p className="tag">Moved</p>
      <h1>{label} moved.</h1>
      <p><a className="button" href={to}>Continue</a></p>
    </main>
  );
}
