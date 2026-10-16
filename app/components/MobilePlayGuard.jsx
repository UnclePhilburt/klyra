// The WebGL build is desktop-only. On phones and tablets (touch-primary pointer
// AND a mobile UA, incl. iPad presenting as Mac) every Play button and /play/
// link is hidden. Server HTML is the desktop state; this runs in <head> before
// paint, so there is no flash. Touchscreen desktops are not affected.
export default function MobilePlayGuard() {
  const code = `(function(){try{var n=navigator,ua=n.userAgent||"",d=n.userAgentData;var coarse=window.matchMedia&&matchMedia("(pointer: coarse)").matches;var mob=(d&&d.mobile)||/Android|iPhone|iPad|iPod|Mobile|Silk|Kindle|Tablet/i.test(ua)||(/Macintosh/.test(ua)&&n.maxTouchPoints>1);if(coarse&&mob)document.documentElement.classList.add("kxMobile");}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}