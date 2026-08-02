/* ==========================================================================
   DockSync cookie consent (UK GDPR / PECR + EU GDPR)
   Google Consent Mode v2 + gated LinkedIn Insight Tag. No dependencies.

   INSTALL, one line, on every page:

     <script src="/consent-ds.js"></script>

   Place it immediately BEFORE the Google tag. That is the only rule. It is
   loaded synchronously on purpose: the consent defaults must be set before any
   Google tag runs, or tags fire before consent is known. The banner itself is
   built later, on DOMContentLoaded, so it never blocks rendering.

   ── THE LINKEDIN PIXEL ───────────────────────────────────────────────────
   This file loads the LinkedIn Insight Tag itself, and only after advertising
   consent is given. To use it:

     1. DELETE the hardcoded LinkedIn pixel from index.html (search "linkedin").
        Leaving it in place defeats the point: it would keep firing unasked.
     2. Leave LINKEDIN_PARTNER_ID below set to your partner ID.

   If you would rather drop LinkedIn advertising altogether, set
   LINKEDIN_PARTNER_ID to "" and delete the pixel. Then also remove the
   Advertising rows and section 4 from cookies.html.
   ─────────────────────────────────────────────────────────────────────────

   STYLING inherits DockSync's own CSS variables (--amber, --ink, --bg2, --disp,
   --body, --mono). Fallbacks match the values in your stylesheet, so it looks
   correct even on a page that somehow lacks them.

   COMPLIANCE NOTES, deliberate choices:
   - Nothing non-essential runs until consent. Defaults are denied.
   - Accept and Reject are identical in size, weight and colour on the first
     layer. Regulators have repeatedly ruled that a prominent Accept beside a
     faint or buried Reject is not valid consent.
   - No pre-ticked boxes. Every optional category starts off.
   - Not a cookie wall. The banner never blocks reading the page.
   - Do Not Track and Global Privacy Control are honoured as refusals.
   - Choice is stored with a timestamp and a version, and expires, so consent
     is refreshed rather than assumed forever.
   - Raising CONSENT_VERSION re-prompts everyone. Do that whenever the
     categories or the vendors behind them change.
   ========================================================================== */
(function () {
  "use strict";

  /* Safe against double inclusion. This flag MUST be set at parse time, not
     inside init(): both <script> tags would execute while the document is
     still parsing, so a guard that waits for DOMContentLoaded fires too late
     and you get two banners. */
  if (window.__dsConsentLoaded) return;
  window.__dsConsentLoaded = true;

  var COOKIE_NAME     = "pk_consent";   /* documented under this name in cookies.html */
  var CONSENT_VERSION = 1;
  var EXPIRY_DAYS     = 182;            /* ~6 months, then ask again */
  var POLICY_URL      = "/cookies.html";
  var LINKEDIN_PARTNER_ID = "9025874";  /* "" disables LinkedIn entirely */

  /* Category to Consent Mode signal mapping. security_storage is always
     granted: it covers anti-fraud and is strictly necessary. */
  var SIGNALS = {
    analytics:  ["analytics_storage"],
    ads:        ["ad_storage", "ad_user_data", "ad_personalization"],
    functional: ["functionality_storage", "personalization_storage"]
  };

  var CATEGORIES = [
    { id:"necessary", locked:true,
      name:"Strictly necessary",
      desc:"Needed for DockSync to work: signing in, session security, and remembering this cookie choice. These cannot be switched off." },
    { id:"analytics", locked:false,
      name:"Analytics",
      desc:"Google Analytics on this marketing website, to count visits and see which pages are useful. Aggregated, never linked to your account." },
    { id:"ads", locked:false,
      name:"Advertising",
      desc:"LinkedIn Insight Tag, to measure whether our LinkedIn advertising leads to trial sign-ups. Off unless you turn it on." },
    { id:"functional", locked:false,
      name:"Functional",
      desc:"Remembers preferences such as your default calendar view, so you do not reset them each visit." }
  ];

  /* ---------------- storage: first-party cookie, with a safe fallback ------ */
  function writeStore(value) {
    var json = JSON.stringify(value);
    try {
      var d = new Date();
      d.setTime(d.getTime() + EXPIRY_DAYS * 864e5);
      var secure = location.protocol === "https:" ? "; Secure" : "";
      document.cookie = COOKIE_NAME + "=" + encodeURIComponent(json) +
        "; expires=" + d.toUTCString() + "; path=/; SameSite=Lax" + secure;
      if (readStore()) return true;
    } catch (e) {}
    try { window.localStorage.setItem(COOKIE_NAME, json); return true; } catch (e) {}
    return false;
  }

  function readStore() {
    var raw = null;
    try {
      var m = document.cookie.match(new RegExp("(?:^|; )" + COOKIE_NAME + "=([^;]*)"));
      if (m) raw = decodeURIComponent(m[1]);
    } catch (e) {}
    if (!raw) { try { raw = window.localStorage.getItem(COOKIE_NAME); } catch (e) {} }
    if (!raw) return null;
    try {
      var v = JSON.parse(raw);
      if (!v || v.version !== CONSENT_VERSION) return null;
      return v;
    } catch (e) { return null; }
  }

  /* ---------------- Google Consent Mode v2 ---------------- */
  function gtagSafe() {
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== "function") {
      window.gtag = function () { window.dataLayer.push(arguments); };
    }
    return window.gtag;
  }

  /* ---------------- LinkedIn Insight Tag, consent-gated ---------------- */
  function loadLinkedIn() {
    if (!LINKEDIN_PARTNER_ID || window.__dsLiLoaded) return;
    window.__dsLiLoaded = true;
    window._linkedin_partner_id = LINKEDIN_PARTNER_ID;
    window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
    window._linkedin_data_partner_ids.push(LINKEDIN_PARTNER_ID);
    var s = document.createElement("script");
    s.type = "text/javascript";
    s.async = true;
    s.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
    (document.head || document.documentElement).appendChild(s);
  }

  function pushConsent(choices) {
    var g = gtagSafe(), payload = {};
    Object.keys(SIGNALS).forEach(function (cat) {
      SIGNALS[cat].forEach(function (sig) {
        payload[sig] = choices[cat] ? "granted" : "denied";
      });
    });
    payload.security_storage = "granted";
    g("consent", "update", payload);
    g("set", "ads_data_redaction", !choices.ads);
    window.dataLayer.push({
      event: "ds_consent_update",
      ds_consent_analytics:  !!choices.analytics,
      ds_consent_ads:        !!choices.ads,
      ds_consent_functional: !!choices.functional
    });
    if (choices.ads) loadLinkedIn();
  }

  function save(choices) {
    var record = {
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString(),
      choices: {
        necessary: true,
        analytics: !!choices.analytics,
        ads: !!choices.ads,
        functional: !!choices.functional
      }
    };
    writeStore(record);
    pushConsent(record.choices);
  }

  /* ---------------- styles: DockSync tokens with matching fallbacks ------- */
  var F_BODY = 'var(--body,"Barlow",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif)';
  var F_DISP = 'var(--disp,"Barlow Condensed",sans-serif)';
  var F_MONO = 'var(--mono,"JetBrains Mono",monospace)';
  var C_BG   = 'var(--bg,#ffffff)';
  var C_BG2  = 'var(--bg2,#f7f6f3)';
  var C_BDR  = 'var(--bdr,rgba(0,0,0,0.08))';
  var C_BDR2 = 'var(--bdr2,rgba(0,0,0,0.14))';
  var C_INK  = 'var(--ink,#111010)';
  var C_INK2 = 'var(--ink2,#3b3a37)';
  var C_INK3 = 'var(--ink3,#6a6860)';
  var C_INK4 = 'var(--ink4,#9a9790)';
  var C_AMB  = 'var(--amber,#e6920a)';
  var C_AMBH = 'var(--amberh,#f4a21e)';
  var R      = 'var(--r,6px)';
  var RL     = 'var(--rl,12px)';

  var CSS = [
    '.dsc,.dsc *{box-sizing:border-box}',
    '.dsc{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;font-family:'+F_BODY+';',
      'background:'+C_BG+';border-top:1px solid '+C_BDR+';box-shadow:0 -1px 24px rgba(0,0,0,.08);padding:18px 0}',
    '.dsc[hidden]{display:none}',
    '.dsc-in{width:100%;max-width:1140px;margin:0 auto;padding:0 28px;display:flex;gap:18px 28px;',
      'align-items:center;justify-content:space-between;flex-wrap:wrap}',
    '.dsc-tx{flex:1 1 28rem;min-width:0;margin:0;font-size:13.5px;line-height:1.65;color:'+C_INK3+'}',
    '.dsc-tx b{color:'+C_INK+';font-weight:600}',
    '.dsc-tx a{color:'+C_AMB+';text-decoration:underline;text-underline-offset:2px}',
    '.dsc-act{display:flex;gap:9px;align-items:center;flex-wrap:wrap}',
    /* Accept and Reject are intentionally identical: equal prominence. */
    '.dsc-b{font-family:'+F_DISP+';font-weight:700;font-size:13px;letter-spacing:.05em;text-transform:uppercase;',
      'cursor:pointer;border:none;border-radius:'+R+';padding:11px 20px;min-width:9rem;text-align:center;',
      'background:'+C_AMB+';color:#1a0900;transition:background .17s}',
    '.dsc-b:hover{background:'+C_AMBH+'}',
    '.dsc-lk{font-family:'+F_BODY+';font-size:13px;cursor:pointer;background:none;border:none;',
      'color:'+C_INK3+';text-decoration:underline;text-underline-offset:3px;padding:11px 6px}',
    '.dsc-lk:hover{color:'+C_INK+'}',
    /* preference centre */
    '.dsc-ov{position:fixed;inset:0;z-index:2147483001;background:rgba(13,14,14,.55);',
      'display:flex;align-items:center;justify-content:center;padding:16px}',
    '.dsc-ov[hidden]{display:none}',
    '.dsc-md{background:'+C_BG+';border-radius:'+RL+';max-width:36rem;width:100%;max-height:88vh;',
      'overflow-y:auto;padding:28px 30px;font-family:'+F_BODY+'}',
    '.dsc-md h2{font-family:'+F_DISP+';font-weight:800;font-size:26px;line-height:1.05;text-transform:uppercase;',
      'color:'+C_INK+';margin:0 0 8px}',
    '.dsc-md .dsc-intro{margin:0 0 22px;font-size:13.5px;line-height:1.65;color:'+C_INK3+'}',
    '.dsc-md .dsc-intro a{color:'+C_AMB+'}',
    '.dsc-cat{border-top:1px solid '+C_BDR+';padding:16px 0;display:flex;gap:16px;align-items:flex-start}',
    '.dsc-cat:last-of-type{border-bottom:1px solid '+C_BDR+'}',
    '.dsc-cat-t{margin:0;font-family:'+F_DISP+';font-weight:700;font-size:16px;text-transform:uppercase;color:'+C_INK+'}',
    '.dsc-cat-d{margin:4px 0 0;font-size:13px;line-height:1.6;color:'+C_INK3+'}',
    '.dsc-always{font-family:'+F_MONO+';font-size:10px;letter-spacing:.1em;text-transform:uppercase;',
      'color:'+C_INK4+';white-space:nowrap;padding-top:4px}',
    /* toggle */
    '.dsc-sw{position:relative;flex:none;width:46px;height:26px}',
    '.dsc-sw input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer}',
    '.dsc-sw span{position:absolute;inset:0;border-radius:999px;background:#cfccc5;transition:background .18s;pointer-events:none}',
    '.dsc-sw span::after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;',
      'background:#fff;transition:transform .18s;box-shadow:0 1px 3px rgba(0,0,0,.3)}',
    '.dsc-sw input:checked + span{background:'+C_AMB+'}',
    '.dsc-sw input:checked + span::after{transform:translateX(20px)}',
    '.dsc-sw input:focus-visible + span{outline:2px solid '+C_INK+';outline-offset:2px}',
    '.dsc-md-act{display:flex;gap:9px;flex-wrap:wrap;margin-top:22px}',
    '@media (max-width:620px){',
      '.dsc-in{flex-direction:column;align-items:stretch}',
      '.dsc-act{flex-direction:column;align-items:stretch}',
      '.dsc-b,.dsc-lk{width:100%}',
      '.dsc-md-act .dsc-b{width:100%}',
    '}',
    '@media (prefers-reduced-motion:reduce){.dsc-b,.dsc-sw span,.dsc-sw span::after{transition:none}}'
  ].join("");

  function injectCSS() {
    if (document.getElementById("dsc-css")) return;
    var s = document.createElement("style");
    s.id = "dsc-css";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ---------------- DOM ---------------- */
  var banner, modal, lastFocus;

  function buildBanner() {
    banner = document.createElement("section");
    banner.className = "dsc";
    banner.setAttribute("role", "region");
    banner.setAttribute("aria-label", "Cookie choices");
    banner.hidden = true;
    banner.innerHTML =
      '<div class="dsc-in">' +
        '<p class="dsc-tx"><b>Cookies on DockSync.</b> We use strictly necessary cookies to run the ' +
        'platform and keep you signed in. With your permission we would also like to use analytics and ' +
        'advertising cookies. Nothing optional is switched on until you choose, and declining changes ' +
        'nothing about how the product works. ' +
        '<a href="' + POLICY_URL + '">Cookies policy</a></p>' +
        '<div class="dsc-act">' +
          '<button class="dsc-b" type="button" data-dsc="accept">Accept all</button>' +
          '<button class="dsc-b" type="button" data-dsc="reject">Reject all</button>' +
          '<button class="dsc-lk" type="button" data-dsc="manage">Manage preferences</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(banner);
    banner.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-dsc]") : null;
      if (!b) return;
      var act = b.getAttribute("data-dsc");
      if (act === "accept") { save({ analytics:true,  ads:true,  functional:true  }); hideBanner(); }
      if (act === "reject") { save({ analytics:false, ads:false, functional:false }); hideBanner(); }
      if (act === "manage") openModal();
    });
  }

  function showBanner() { if (banner) banner.hidden = false; }
  function hideBanner() { if (banner) banner.hidden = true; }

  function buildModal() {
    modal = document.createElement("div");
    modal.className = "dsc-ov";
    modal.hidden = true;
    var rows = CATEGORIES.map(function (c) {
      var control = c.locked
        ? '<span class="dsc-always">Always on</span>'
        : '<label class="dsc-sw"><input type="checkbox" data-cat="' + c.id + '" ' +
          'aria-label="' + c.name + '"><span aria-hidden="true"></span></label>';
      return '<div class="dsc-cat"><div><p class="dsc-cat-t">' + c.name + '</p>' +
             '<p class="dsc-cat-d">' + c.desc + '</p></div>' + control + '</div>';
    }).join("");

    modal.innerHTML =
      '<div class="dsc-md" role="dialog" aria-modal="true" aria-labelledby="dsc-h">' +
        '<h2 id="dsc-h">Cookie preferences</h2>' +
        '<p class="dsc-intro">Choose what you are happy for us to use. You can change this at any time ' +
        'from the cookie settings link in the footer. Full detail is in the ' +
        '<a href="' + POLICY_URL + '">cookies policy</a>.</p>' +
        rows +
        '<div class="dsc-md-act">' +
          '<button class="dsc-b" type="button" data-dsc="save">Save preferences</button>' +
          '<button class="dsc-b" type="button" data-dsc="allow-all">Allow all</button>' +
          '<button class="dsc-lk" type="button" data-dsc="close">Cancel</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);

    modal.addEventListener("click", function (e) {
      if (e.target === modal) { closeModal(); return; }
      var b = e.target.closest ? e.target.closest("[data-dsc]") : null;
      if (!b) return;
      var act = b.getAttribute("data-dsc");
      if (act === "close") { closeModal(); return; }
      if (act === "allow-all") {
        setToggles({ analytics:true, ads:true, functional:true });
        save({ analytics:true, ads:true, functional:true });
      } else if (act === "save") {
        save(readToggles());
      }
      closeModal(); hideBanner();
    });

    modal.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { closeModal(); return; }
      if (e.key !== "Tab") return;
      var f = modal.querySelectorAll('button, input, a[href]');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  function readToggles() {
    var out = {};
    modal.querySelectorAll("input[data-cat]").forEach(function (i) {
      out[i.getAttribute("data-cat")] = i.checked;
    });
    return out;
  }
  function setToggles(choices) {
    modal.querySelectorAll("input[data-cat]").forEach(function (i) {
      i.checked = !!choices[i.getAttribute("data-cat")];
    });
  }

  function openModal() {
    var stored = readStore();
    setToggles(stored ? stored.choices : {});   /* never pre-ticked without prior consent */
    lastFocus = document.activeElement;
    modal.hidden = false;
    var first = modal.querySelector("button, input");
    if (first) first.focus();
  }
  function closeModal() {
    modal.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* ---------------- init ---------------- */
  function init() {
    injectCSS();
    buildBanner();
    buildModal();

    if (!readStore() && !optedOutByBrowser()) showBanner();

    document.addEventListener("click", function (e) {
      var t = e.target.closest ? e.target.closest("[data-cookie-settings]") : null;
      if (t) { e.preventDefault(); openModal(); }
    });

    window.dsConsent = { open: openModal, get: readStore };
  }

  /* ---- parse-time: defaults first, then replay any stored choice ----
     Both must happen before the Google tag runs, so they cannot wait for
     DOMContentLoaded. A returning visitor's consent therefore applies to the
     very first pageview rather than the second. */
  (function primeConsentMode() {
    var g = gtagSafe();
    g("consent", "default", {
      ad_storage:              "denied",
      ad_user_data:            "denied",
      ad_personalization:      "denied",
      analytics_storage:       "denied",
      functionality_storage:   "denied",
      personalization_storage: "denied",
      security_storage:        "granted",
      wait_for_update:         500
    });
    g("set", "ads_data_redaction", true);
    g("set", "url_passthrough", true);

    var stored = readStore();
    if (stored) pushConsent(stored.choices);
  })();

  /* ---- browser-level opt-out signals ----
     Global Privacy Control is the successor to Do Not Track and is treated as a
     legally valid opt-out in a growing number of jurisdictions. The cookies
     policy states that these signals are respected, so they are: everything
     optional stays denied and the banner is not shown. The visitor can still
     override this deliberately via the cookie settings link. */
  function optedOutByBrowser() {
    try {
      if (navigator.globalPrivacyControl === true) return true;
      var dnt = navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;
      return dnt === "1" || dnt === 1 || dnt === "yes";
    } catch (e) { return false; }
  }

  /* ---- DOM ready: build the UI only if a choice has not been made ---- */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }
})();
