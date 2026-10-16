// The WebGL build is desktop-only. On phones and tablets (touch-primary pointer
// AND a mobile UA, incl. iPad presenting as Mac), every link to /play/ becomes a
// non-clickable "Desktop only" state. Server HTML is the desktop state; this
// runs in <head> before paint, so there is no flash and no hydration mismatch.
export default function MobilePlayGuard() {
  const code = `(function(){try{var n=navigator,ua=n.userAgent||"",d=n.userAgentData;var coarse=window.matchMedia&&matchMedia("(pointer: coarse)").matches;var mob=(d&&d.mobile)||/Android|iPhone|iPad|iPod|Mobile|Silk|Kindle|Tablet/i.test(ua)||(/Macintosh/.test(ua)&&n.maxTouchPoints>1);if(!(coarse&&mob))return;var r=document.documentElement;r.classList.add("kxMobile");var sel='a[href^="/play"]';function mark(){var a=document.querySelectorAll(sel);for(var i=0;i<a.length;i++){a[i].setAttribute("aria-disabled","true");a[i].setAttribute("tabindex","-1");a[i].setAttribute("title","Play in your browser on a computer.");}}function block(e){var t=e.target&&e.target.closest&&e.target.closest(sel);if(t){e.preventDefault();e.stopPropagation();}}document.addEventListener("click",block,true);document.addEventListener("DOMContentLoaded",function(){mark();new MutationObserver(mark).observe(document.body,{childList:true,subtree:true});});}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}