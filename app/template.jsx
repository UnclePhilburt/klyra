// Re-mounts on every route change: a quick, subtle fade/slide-in.
export default function Template({ children }) {
  return <div className="kxPageIn">{children}</div>;
}
