/** 검색 시각화 iframe → 인쇄용 PNG. LLM HTML은 부모 DOM에 넣지 않는다. */

export const SEARCH_VIZ_SNAPSHOT_TYPE = "altsis-search-viz-snapshot";

/** data URL 최대 길이 (약 3MB) */
export const SEARCH_VIZ_SNAPSHOT_MAX = 3 * 1024 * 1024;

export const SEARCH_VIZ_SNAPSHOT_WAIT_MS = 800;

const TOKEN_RE = /^[a-f0-9]{16,64}$/i;
const PNG_PREFIX = "data:image/png";

/** JSON embedded in an inline script must not be able to close the script tag. */
export function serializeSearchVizRows(rows: unknown): string {
  return (JSON.stringify(rows) || "[]")
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function createSearchVizSnapshotToken(): string {
  const bytes = new Uint8Array(16);
  const webCrypto = globalThis.crypto;
  if (webCrypto && typeof webCrypto.getRandomValues === "function") {
    webCrypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function isPngDataUrl(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith(PNG_PREFIX) &&
    value.length > PNG_PREFIX.length &&
    value.length <= SEARCH_VIZ_SNAPSHOT_MAX
  );
}

export function readSearchVizSnapshotMessage(
  data: unknown,
  token: string
): { dataUrl: string } | { failed: true } | null {
  if (!token || !TOKEN_RE.test(token)) return null;
  if (!data || typeof data !== "object") return null;
  const msg = data as Record<string, unknown>;
  if (msg.type !== SEARCH_VIZ_SNAPSHOT_TYPE) return null;
  if (msg.token !== token) return null;
  if (msg.failed === true) return { failed: true };
  if (isPngDataUrl(msg.dataUrl)) return { dataUrl: msg.dataUrl };
  return null;
}

/**
 * render() 뒤에 iframe 안에서 실행. token은 hex만 허용한다.
 */
export function buildSearchVizSnapshotTailScript(token: string): string {
  if (!TOKEN_RE.test(token)) {
    throw new Error("invalid snapshot token");
  }
  const typeLit = JSON.stringify(SEARCH_VIZ_SNAPSHOT_TYPE);
  const tokenLit = JSON.stringify(token);
  return `
(function(){
  var TYPE=${typeLit};
  var TOKEN=${tokenLit};
  function send(payload){
    try { parent.postMessage(Object.assign({type:TYPE,token:TOKEN}, payload), "*"); }
    catch (e) {}
  }
  function fail(){ send({failed:true}); }
  function cloneStyled(el){
    var clone = el.cloneNode(true);
    function apply(src, dst){
      if (!src || !dst || src.nodeType !== 1 || dst.nodeType !== 1) return;
      try {
        var cs = getComputedStyle(src);
        var s = "";
        for (var i = 0; i < cs.length; i++) {
          var p = cs[i];
          s += p + ":" + cs.getPropertyValue(p) + ";";
        }
        dst.setAttribute("style", s);
      } catch (e) {}
      var a = src.children, b = dst.children;
      for (var j = 0; j < a.length && j < b.length; j++) apply(a[j], b[j]);
    }
    apply(el, clone);
    try {
      var srcC = el.querySelectorAll("canvas");
      var dstC = clone.querySelectorAll("canvas");
      for (var k = 0; k < srcC.length && k < dstC.length; k++) {
        try {
          var u = srcC[k].toDataURL("image/png");
          var imgEl = document.createElement("img");
          imgEl.setAttribute("src", u);
          imgEl.setAttribute("width", String(srcC[k].width || srcC[k].offsetWidth || 0));
          imgEl.setAttribute("height", String(srcC[k].height || srcC[k].offsetHeight || 0));
          if (dstC[k].parentNode) dstC[k].parentNode.replaceChild(imgEl, dstC[k]);
        } catch (e) {}
      }
    } catch (e) {}
    return clone;
  }
  function snap(){
    var el = document.getElementById("root") || document.body;
    if (!el) { fail(); return; }
    var w = Math.max(el.scrollWidth || 0, el.offsetWidth || 0, 320);
    var h = Math.max(el.scrollHeight || 0, el.offsetHeight || 0, 80);
    var clone;
    try { clone = cloneStyled(el); } catch (e) { fail(); return; }
    var xhtml;
    try { xhtml = new XMLSerializer().serializeToString(clone); } catch (e) { fail(); return; }
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'"><foreignObject width="100%" height="100%">'+xhtml+'</foreignObject></svg>';
    var img = new Image();
    img.onload = function(){
      try {
        var canvas = document.createElement("canvas");
        var scale = 2;
        canvas.width = Math.max(1, Math.round(w * scale));
        canvas.height = Math.max(1, Math.round(h * scale));
        var ctx = canvas.getContext("2d");
        if (!ctx) { fail(); return; }
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        var dataUrl = canvas.toDataURL("image/png");
        if (!dataUrl || dataUrl.indexOf("data:image/png") !== 0) { fail(); return; }
        send({dataUrl: dataUrl});
      } catch (e) { fail(); }
    };
    img.onerror = fail;
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }
  requestAnimationFrame(function(){ setTimeout(snap, 0); });
})();`;
}

export function waitForSearchVizSnapshot(
  isReady: () => boolean,
  timeoutMs = SEARCH_VIZ_SNAPSHOT_WAIT_MS
): Promise<void> {
  if (isReady()) return Promise.resolve();
  const started = Date.now();
  return new Promise((resolve) => {
    const tick = () => {
      if (isReady() || Date.now() - started >= timeoutMs) {
        resolve();
        return;
      }
      window.setTimeout(tick, 50);
    };
    window.setTimeout(tick, 50);
  });
}
