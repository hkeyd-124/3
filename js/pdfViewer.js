/* =========================================================
   HackChem — PDF viewer  (js/pdfViewer.js)
   ---------------------------------------------------------
   WHY THIS EXISTS
   Safari iOS renders ONLY THE FIRST PAGE of a PDF embedded in
   an <iframe>, and refuses to scroll to the later pages. That
   is a WebKit limitation, not a CSS bug — no stylesheet can
   fix it. This module renders every page to a <canvas> with
   PDF.js, so the whole document scrolls on every browser.

   HOW IT PLUGS IN
   js/lessonEngine.js calls window.hcPdfViewer.render(el, src)
   for tools of type "pdf", and keeps its original <iframe> as
   a fallback when this module is absent or declines. Nothing
   else in the engine is touched.

   SELF-CONTAINED
   Injects its own scoped CSS (.hcpv-*). Adds no global CSS,
   renames no id/class, and never reads or writes engine state
   (score, answers, progress, certificate). Presentation only.

   TOOLS
   zoom out / zoom in / page indicator / bookmark list / download.

   BOOKMARKS
   Up to MAX_BOOKMARKS (10) per document, stored as a JSON array
   under "hcpv:bookmarks:<src>". A bookmark created by an older
   build (single integer under "hcpv:bookmark:<src>") is adopted
   on first read, so nothing a student already saved is lost.
   ========================================================= */

(function () {
  "use strict";

  /* Pinned version — never "latest", so a CDN release cannot
     silently change behaviour under us. */
  var PDFJS_VERSION = "3.11.174";
  var CDN_BASE = "https://cdn.jsdelivr.net/npm/pdfjs-dist@" + PDFJS_VERSION + "/";
  var LIB_URL = CDN_BASE + "build/pdf.min.js";
  var WORKER_URL = CDN_BASE + "build/pdf.worker.min.js";

  var MIN_SCALE = 0.4;
  var MAX_SCALE = 3.0;
  var SCALE_STEP = 0.15;

  /* Multi-bookmark key (JSON array). */
  var BOOKMARK_PREFIX = "hcpv:bookmarks:";
  /* Legacy single-bookmark key (plain integer) — read once, then
     migrated into the array form above. */
  var LEGACY_PREFIX = "hcpv:bookmark:";
  var MAX_BOOKMARKS = 10;

  var libPromise = null;

  /* ---------------------------------------------------------
     Lazy-load PDF.js once per page load.
     --------------------------------------------------------- */
  function loadLib() {
    if (libPromise) return libPromise;

    libPromise = new Promise(function (resolve, reject) {
      if (window.pdfjsLib) {
        resolve(window.pdfjsLib);
        return;
      }

      var s = document.createElement("script");
      s.src = LIB_URL;
      s.async = true;

      s.onload = function () {
        if (!window.pdfjsLib) {
          reject(new Error("pdfjsLib not exposed"));
          return;
        }
        try {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URL;
        } catch (e) {
          /* worker is optional — pdf.js falls back to main thread */
        }
        resolve(window.pdfjsLib);
      };

      s.onerror = function () {
        reject(new Error("pdf.js failed to load"));
      };

      document.head.appendChild(s);
    });

    return libPromise;
  }

  /* ---------------------------------------------------------
     Scoped styles. Injected once, prefixed .hcpv- so they can
     never collide with the lesson UI or the engine's inline
     styles.
     --------------------------------------------------------- */
  var STYLE_ID = "hcpv-style";

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    var css = [
      ".hcpv{position:relative;display:flex;flex-direction:column;height:100%;min-height:0;background:#525659;font-family:Arial,sans-serif;}",
      ".hcpv-bar{display:flex;align-items:center;gap:6px;flex:0 0 auto;padding:6px 8px;background:#fafafa;border-bottom:1px solid #ddd;overflow-x:auto;-webkit-overflow-scrolling:touch;}",
      ".hcpv-btn{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;min-width:34px;min-height:34px;padding:0 9px;border:1px solid #ccc;border-radius:7px;background:#fff;color:#222;font-size:15px;line-height:1;cursor:pointer;text-decoration:none;box-sizing:border-box;}",
      ".hcpv-btn:hover{background:#f0f0f0;}",
      ".hcpv-btn:active{background:#e4e4e4;}",
      ".hcpv-btn[disabled]{opacity:.4;cursor:default;}",
      ".hcpv-btn.is-on{background:#30B0A4;border-color:#30B0A4;color:#fff;}",
      ".hcpv-zoom{flex:0 0 auto;min-width:46px;text-align:center;font-size:12px;color:#333;}",
      ".hcpv-page{flex:0 0 auto;font-size:12px;color:#555;white-space:nowrap;}",
      ".hcpv-spacer{flex:1 1 auto;min-width:4px;}",
      ".hcpv-clear{display:none;}",
      ".hcpv-clear.is-on{display:inline-flex;}",
      /* bookmark strip — wraps instead of scrolling sideways, so a
         phone never grows a horizontal scrollbar */
      ".hcpv-marks{display:none;flex:0 0 auto;flex-wrap:wrap;align-items:center;gap:6px;padding:6px 8px;background:#eef7f6;border-bottom:1px solid #cfe6e3;}",
      ".hcpv-marks.is-on{display:flex;}",
      ".hcpv-marks-lbl{flex:0 0 auto;font-size:11px;color:#1a7f76;font-weight:700;letter-spacing:.02em;}",
      ".hcpv-chip{flex:0 0 auto;display:inline-flex;align-items:center;gap:2px;padding:0 3px 0 9px;min-height:30px;border:1px solid #30B0A4;border-radius:15px;background:#fff;color:#1a7f76;font-size:12px;line-height:1;cursor:pointer;box-sizing:border-box;}",
      ".hcpv-chip:hover{background:#e2f4f2;}",
      ".hcpv-chip:focus-visible{outline:2px solid #30B0A4;outline-offset:1px;}",
      ".hcpv-chip-n{font-weight:700;white-space:nowrap;}",
      ".hcpv-chip-x{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;font-size:12px;color:#7a8b89;}",
      ".hcpv-chip-x:hover{background:#f6d9d9;color:#b3261e;}",
      ".hcpv-toast{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);background:rgba(0,0,0,.82);color:#fff;font-size:12px;padding:7px 13px;border-radius:16px;pointer-events:none;z-index:5;white-space:nowrap;}",
      ".hcpv-scroll{flex:1 1 auto;min-height:0;overflow:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:8px 0;}",
      ".hcpv-pages{display:flex;flex-direction:column;align-items:center;gap:8px;}",
      ".hcpv-page-box{position:relative;background:#fff;box-shadow:0 1px 5px rgba(0,0,0,.4);line-height:0;}",
      ".hcpv-page-box canvas{display:block;max-width:100%;height:auto;}",
      ".hcpv-msg{padding:18px 14px;color:#fff;font-size:13px;line-height:1.6;text-align:center;}",
      ".hcpv-msg a{color:#8fd6ff;}",
      ".hcpv-loading{padding:14px;color:#fff;font-size:13px;text-align:center;}"
    ].join("");

    var el = document.createElement("style");
    el.id = STYLE_ID;
    el.appendChild(document.createTextNode(css));
    document.head.appendChild(el);
  }

  /* ---------------------------------------------------------
     Bookmark persistence (per document src) — up to 10 pages.
     --------------------------------------------------------- */

  /* Normalise anything into a clean, sorted, de-duplicated,
     capped array of page numbers. */
  function normalise(list) {
    var out = [];
    (list || []).forEach(function (n) {
      var v = parseInt(n, 10);
      if (isFinite(v) && v > 0 && out.indexOf(v) === -1) out.push(v);
    });
    out.sort(function (a, b) { return a - b; });
    return out.slice(0, MAX_BOOKMARKS);
  }

  function readBookmarks(src) {
    try {
      var raw = window.localStorage.getItem(BOOKMARK_PREFIX + src);
      if (raw) {
        var arr = JSON.parse(raw);
        if (Array.isArray(arr)) return normalise(arr);
      }

      /* BACKWARD COMPAT — a bookmark saved by an earlier build was a
         single integer under the old key. Adopt it (and rewrite it in
         the new format) so the student does not lose it. */
      var legacy = window.localStorage.getItem(LEGACY_PREFIX + src);
      var n = legacy ? parseInt(legacy, 10) : NaN;
      if (isFinite(n) && n > 0) {
        var migrated = normalise([n]);
        writeBookmarks(src, migrated);
        return migrated;
      }

      return [];
    } catch (e) {
      return [];
    }
  }

  function writeBookmarks(src, list) {
    try {
      var clean = normalise(list);
      if (clean.length) {
        window.localStorage.setItem(BOOKMARK_PREFIX + src, JSON.stringify(clean));
      } else {
        window.localStorage.removeItem(BOOKMARK_PREFIX + src);
      }
      /* the legacy key is superseded — never leave a stale copy */
      window.localStorage.removeItem(LEGACY_PREFIX + src);
    } catch (e) {
      /* private mode / storage disabled — bookmark is a nicety */
    }
  }

  /* ---------------------------------------------------------
     render(container, src) -> boolean
     Returns true when this module took over the container.
     Returns false so the caller can fall back to its <iframe>.
     --------------------------------------------------------- */
  function render(container, src) {
    if (!container || !src) return false;

    injectStyles();

    container.innerHTML = "";

    var root = document.createElement("div");
    root.className = "hcpv";

    var bar = document.createElement("div");
    bar.className = "hcpv-bar";

    var btnOut = mkBtn("\u2212", "Thu nh\u1ecf");
    var zoomLabel = document.createElement("span");
    zoomLabel.className = "hcpv-zoom";
    zoomLabel.textContent = "100%";
    var btnIn = mkBtn("+", "Ph\u00f3ng to");

    var pageLabel = document.createElement("span");
    pageLabel.className = "hcpv-page";
    pageLabel.textContent = "\u2013 / \u2013";

    var spacer = document.createElement("span");
    spacer.className = "hcpv-spacer";

    var btnMark = mkBtn("\uD83D\uDD16", "\u0110\u00e1nh d\u1ea5u trang");
    var btnClear = mkBtn("\u2715", "B\u1ecf t\u1ea5t c\u1ea3 \u0111\u00e1nh d\u1ea5u");
    btnClear.className = "hcpv-btn hcpv-clear";

    var btnDown = document.createElement("a");
    btnDown.className = "hcpv-btn";
    btnDown.setAttribute("href", src);
    btnDown.setAttribute("download", "");
    btnDown.setAttribute("title", "T\u1ea3i v\u1ec1");
    btnDown.textContent = "\u2B07";

    bar.appendChild(btnOut);
    bar.appendChild(zoomLabel);
    bar.appendChild(btnIn);
    bar.appendChild(pageLabel);
    bar.appendChild(spacer);
    bar.appendChild(btnMark);
    bar.appendChild(btnClear);
    bar.appendChild(btnDown);

    /* bookmark strip — sits directly under the toolbar */
    var marks = document.createElement("div");
    marks.className = "hcpv-marks";

    var scroll = document.createElement("div");
    scroll.className = "hcpv-scroll";

    var pages = document.createElement("div");
    pages.className = "hcpv-pages";

    var loading = document.createElement("div");
    loading.className = "hcpv-loading";
    loading.textContent = "\u0110ang t\u1ea3i PDF\u2026";

    scroll.appendChild(pages);
    scroll.appendChild(loading);

    root.appendChild(bar);
    root.appendChild(marks);
    root.appendChild(scroll);
    container.appendChild(root);

    /* ---- state ---- */
    var pdfDoc = null;
    var scale = 1;
    var fitScale = 1;
    var boxes = [];        /* {el, canvas, page, rendered} */
    var renderToken = 0;   /* invalidates in-flight renders on zoom */
    var currentPage = 1;
    var markList = [];     /* cached bookmark pages for this document */

    function mkBtn(label, title) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "hcpv-btn";
      b.textContent = label;
      b.setAttribute("title", title);
      return b;
    }

    function fail(err) {
      loading.remove();
      var msg = document.createElement("div");
      msg.className = "hcpv-msg";
      msg.innerHTML =
        "Kh\u00f4ng hi\u1ec3n th\u1ecb \u0111\u01b0\u1ee3c PDF trong khung n\u00e0y.<br>" +
        '<a href="' + src + '" target="_blank" rel="noopener">M\u1edf PDF trong tab m\u1edbi</a>';
      scroll.appendChild(msg);
      if (window.console && console.warn) {
        console.warn("[hcPdfViewer] render failed:", err);
      }
    }

    function toast(text) {
      var t = document.createElement("div");
      t.className = "hcpv-toast";
      t.textContent = text;
      root.appendChild(t);
      setTimeout(function () {
        if (t.parentNode) t.parentNode.removeChild(t);
      }, 1600);
    }

    /* ---- zoom ---- */
    function applyScale(next) {
      scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
      zoomLabel.textContent = Math.round((scale / fitScale) * 100) + "%";
      btnOut.disabled = scale <= MIN_SCALE + 1e-6;
      btnIn.disabled = scale >= MAX_SCALE - 1e-6;
      renderAll();
    }

    /* ---- render every page at the current scale ---- */
    function renderAll() {
      if (!pdfDoc) return;

      var token = ++renderToken;

      boxes.forEach(function (b) {
        b.rendered = false;
      });

      var chain = Promise.resolve();

      boxes.forEach(function (b) {
        chain = chain.then(function () {
          if (token !== renderToken) return null;
          return renderBox(b, token);
        });
      });

      chain.then(function () {
        if (token !== renderToken) return;
        loading.remove();
        updatePageLabel();
      });
    }

    function renderBox(b, token) {
      if (!b.page) return Promise.resolve();
      /* pdf.js 3.x getViewport() is synchronous */
      var viewport = b.page.getViewport({ scale: scale });
      var dpr = Math.min(window.devicePixelRatio || 1, 2);

      b.canvas.width = Math.floor(viewport.width * dpr);
      b.canvas.height = Math.floor(viewport.height * dpr);
      b.canvas.style.width = Math.floor(viewport.width) + "px";
      b.canvas.style.height = Math.floor(viewport.height) + "px";
      b.el.style.width = Math.floor(viewport.width) + "px";

      var ctx = b.canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      return b.page
        .render({ canvasContext: ctx, viewport: viewport })
        .promise.then(function () {
          if (token !== renderToken) return;
          b.rendered = true;
        })
        .catch(function () {
          /* a single page failing must not kill the document */
        });
    }

    /* ---- current page tracking ---- */
    function updatePageLabel() {
      if (!boxes.length) return;
      var top = scroll.getBoundingClientRect().top;
      var best = 1;
      var bestDist = Infinity;

      boxes.forEach(function (b, i) {
        var d = Math.abs(b.el.getBoundingClientRect().top - top);
        if (d < bestDist) {
          bestDist = d;
          best = i + 1;
        }
      });

      currentPage = best;
      pageLabel.textContent = best + " / " + boxes.length;
      syncMarkBtn();
    }

    function scrollToPage(n) {
      var b = boxes[n - 1];
      if (!b) return;
      scroll.scrollTop +=
        b.el.getBoundingClientRect().top - scroll.getBoundingClientRect().top;
      updatePageLabel();
    }

    /* ---- bookmarks (multi, max 10) ---- */

    /* Light update: only the toolbar button, no chip rebuild.
       Called on every scroll, so it must stay cheap. */
    function syncMarkBtn() {
      var on = markList.indexOf(currentPage) !== -1;
      if (on) {
        btnMark.classList.add("is-on");
        btnMark.setAttribute("title", "B\u1ecf \u0111\u00e1nh d\u1ea5u trang " + currentPage);
      } else {
        btnMark.classList.remove("is-on");
        btnMark.setAttribute("title", "\u0110\u00e1nh d\u1ea5u trang " + currentPage);
      }
      btnMark.textContent = markList.length
        ? "\uD83D\uDD16 " + markList.length
        : "\uD83D\uDD16";
    }

    /* Full refresh: reload from storage, rebuild the chip strip. */
    function refreshMarks() {
      markList = readBookmarks(src);

      if (markList.length) {
        btnClear.classList.add("is-on");
      } else {
        btnClear.classList.remove("is-on");
      }

      marks.innerHTML = "";

      if (!markList.length) {
        marks.classList.remove("is-on");
        syncMarkBtn();
        return;
      }

      marks.classList.add("is-on");

      var lbl = document.createElement("span");
      lbl.className = "hcpv-marks-lbl";
      lbl.textContent = "\u0110\u00e1nh d\u1ea5u (" + markList.length + "/" + MAX_BOOKMARKS + ")";
      marks.appendChild(lbl);

      markList.forEach(function (n) {
        var chip = document.createElement("span");
        chip.className = "hcpv-chip";
        chip.setAttribute("role", "button");
        chip.setAttribute("tabindex", "0");
        chip.setAttribute("title", "\u0110\u1ebfn trang " + n);

        var num = document.createElement("span");
        num.className = "hcpv-chip-n";
        num.textContent = "\uD83D\uDCCC " + n;

        var x = document.createElement("span");
        x.className = "hcpv-chip-x";
        x.textContent = "\u2715";
        x.setAttribute("title", "X\u00f3a \u0111\u00e1nh d\u1ea5u trang " + n);

        chip.appendChild(num);
        chip.appendChild(x);

        function go() {
          scrollToPage(n);
        }

        chip.addEventListener("click", go);
        chip.addEventListener("keydown", function (ev) {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            go();
          }
        });

        x.addEventListener("click", function (ev) {
          ev.stopPropagation();
          ev.preventDefault();
          writeBookmarks(
            src,
            markList.filter(function (p) { return p !== n; })
          );
          refreshMarks();
        });

        marks.appendChild(chip);
      });

      syncMarkBtn();
    }

    /* toolbar 🔖 — toggle a bookmark on the page currently in view */
    btnMark.addEventListener("click", function () {
      var i = markList.indexOf(currentPage);

      if (i !== -1) {
        writeBookmarks(
          src,
          markList.filter(function (p) { return p !== currentPage; })
        );
      } else {
        if (markList.length >= MAX_BOOKMARKS) {
          toast("T\u1ed1i \u0111a " + MAX_BOOKMARKS + " \u0111\u00e1nh d\u1ea5u");
          return;
        }
        writeBookmarks(src, markList.concat([currentPage]));
      }

      refreshMarks();
    });

    /* toolbar ✕ — clear every bookmark for this document */
    btnClear.addEventListener("click", function () {
      writeBookmarks(src, []);
      refreshMarks();
    });

    btnOut.addEventListener("click", function () {
      applyScale(scale - SCALE_STEP);
    });

    btnIn.addEventListener("click", function () {
      applyScale(scale + SCALE_STEP);
    });

    scroll.addEventListener("scroll", updatePageLabel, { passive: true });

    /* ---- boot ---- */
    loadLib()
      .then(function (pdfjsLib) {
        return pdfjsLib.getDocument(src).promise;
      })
      .then(function (doc) {
        pdfDoc = doc;

        /* fit the first page to the container width */
        return doc.getPage(1).then(function (p1) {
          var unscaled = p1.getViewport({ scale: 1 });
          var avail = scroll.clientWidth - 16;
          fitScale = avail > 0 ? avail / unscaled.width : 1;
          scale = fitScale;

          for (var i = 1; i <= doc.numPages; i++) {
            var box = document.createElement("div");
            box.className = "hcpv-page-box";
            var canvas = document.createElement("canvas");
            box.appendChild(canvas);
            pages.appendChild(box);
            boxes.push({ el: box, canvas: canvas, page: null, rendered: false });
          }

          /* resolve page proxies lazily, in order */
          var chain = Promise.resolve();
          boxes.forEach(function (b, idx) {
            chain = chain.then(function () {
              return doc.getPage(idx + 1).then(function (pg) {
                b.page = pg;
              });
            });
          });

          return chain.then(function () {
            zoomLabel.textContent = "100%";
            btnOut.disabled = scale <= MIN_SCALE + 1e-6;
            btnIn.disabled = scale >= MAX_SCALE - 1e-6;
            refreshMarks();
            renderAll();

            /* resume at the earliest bookmark, if any */
            if (markList.length) {
              var first = markList[0];
              setTimeout(function () {
                scrollToPage(first);
              }, 120);
            }
          });
        });
      })
      .catch(fail);

    return true;
  }

  window.hcPdfViewer = {
    render: render,
    version: PDFJS_VERSION,
    maxBookmarks: MAX_BOOKMARKS
  };
})();
