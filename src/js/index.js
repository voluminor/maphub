let I18N = {};
const GENERATORS = [
    {id: "mfcg", href: "{{ADR_MFCG}}", img: "/img/pico_mfcg.png"},
    {id: "village", href: "{{ADR_VILLAGE}}", img: "/img/pico_village.png"},
    {id: "dwellings", href: "{{ADR_DWELLINGS}}", img: "/img/pico_dwellings.png"},
    {id: "cave", href: "{{ADR_CAVE}}", img: "/img/pico_cave.png"},
    {id: "viewer", href: "{{ADR_VIEWER}}", img: "/img/pico_viewer.png"}
];

function loadJSON(url, cb) {
    var xhr = null;
    try { xhr = new XMLHttpRequest(); }
    catch(e1){
        try { xhr = new ActiveXObject("Msxml2.XMLHTTP"); }
        catch(e2){
            try { xhr = new ActiveXObject("Microsoft.XMLHTTP"); }
            catch(e3){
                xhr = null;
                console.error("loadJSON", e1, e2, e3);
            }
        }
    }
    if (!xhr) { cb && cb(new Error("XHR not supported")); return; }

    xhr.onreadystatechange = function(){
        if (xhr.readyState !== 4) return;

        var ok = (xhr.status >= 200 && xhr.status < 300) || xhr.status === 0;
        if (!ok) { cb && cb(new Error("HTTP " + xhr.status)); return; }

        try {
            var data = JSON.parse(xhr.responseText);
            cb && cb(null, data);
        } catch(err) {
            cb && cb(err);
        }
    };

    try {
        xhr.open("GET", url, true);
        xhr.send(null);
    } catch(e) {
        cb && cb(e);
    }
}

function loadLanguages(cb) {
    loadJSON("/languages.json", function(err, data){
        if (!err && data) I18N = data;
        cb && cb(err);
    });
}

function $(id){ return document.getElementById(id); }

function on(el, evt, fn) {
    if (!el) return;
    if (el.addEventListener) el.addEventListener(evt, fn, false);
    else if (el.attachEvent) el.attachEvent("on" + evt, fn);
}

function text(el, value) {
    if (!el) return;
    el.textContent = value;
    if (typeof el.textContent === "undefined") el.innerText = value;
}

function setHtml(el, value) {
    if (!el) return;
    el.innerHTML = value;
}

var toastSeq = 0;

function ensureToastHost() {
    var host = $("toastHost");
    if (host) return host;
    host = document.createElement("div");
    host.id = "toastHost";
    host.className = "toast-host";
    host.setAttribute("aria-live", "polite");
    host.setAttribute("aria-atomic", "true");
    if (document.body) document.body.appendChild(host);
    return host;
}

function removeToast(toastEl) {
    if (!toastEl) return;
    try {
        if (toastEl.__timer) {
            clearTimeout(toastEl.__timer);
            toastEl.__timer = null;
        }
    } catch(e) {}
    if (toastEl.parentNode) toastEl.parentNode.removeChild(toastEl);
}

function showToast(kind, message, title, timeoutMs) {
    if (!message) return;

    var host = ensureToastHost();
    if (!host) return;

    while (host.childNodes && host.childNodes.length >= 3) {
        removeToast(host.firstChild);
    }

    var t = I18N[currentLang] || I18N.en || null;
    var ui = (t && t.ui) ? t.ui : {};
    var closeLabel = ui.close || "Close";

    var toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("data-kind", kind || "info");
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.setAttribute("data-toast-id", String(++toastSeq));

    var body = document.createElement("div");
    body.className = "toast-body";

    if (title) {
        var strong = document.createElement("strong");
        strong.appendChild(document.createTextNode(title));
        body.appendChild(strong);
        body.appendChild(document.createElement("br"));
    }

    body.appendChild(document.createTextNode(message));

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "toast-close";
    closeBtn.setAttribute("aria-label", closeLabel);
    closeBtn.appendChild(document.createTextNode("×"));
    on(closeBtn, "click", function(){ removeToast(toast); });

    toast.appendChild(body);
    toast.appendChild(closeBtn);
    host.appendChild(toast);

    var ms = (typeof timeoutMs === "number") ? timeoutMs : 6500;
    try {
        toast.__timer = setTimeout(function(){ removeToast(toast); }, ms);
    } catch(e) {}
}

function supportsObjectFit() {
    return ("objectFit" in document.documentElement.style);
}

function getQueryParam(name) {
    var q = window.location.search;
    if (!q || q.length < 2) return null;
    q = q.substring(1);
    var parts = q.split("&");
    for (var i=0; i<parts.length; i++) {
        var kv = parts[i].split("=");
        if (kv.length < 1) continue;
        var k = decodeURIComponent(kv[0] || "");
        if (k === name) {
            return decodeURIComponent((kv[1] || "").replace(/\+/g, " "));
        }
    }
    return null;
}

function safeLocalStorageGet(key) {
    try { return window.localStorage ? window.localStorage.getItem(key) : null; }
    catch(e){ return null; }
}
function safeLocalStorageSet(key, val) {
    try { if (window.localStorage) window.localStorage.setItem(key, val); }
    catch(e){  }
}

function getSupportedLangs() {
    var arr = [];
    for (var code in I18N) {
        if (I18N.hasOwnProperty(code)) arr.push(code);
    }
    return arr;
}

function normalizeLang(code) {
    if (!code) return null;
    code = ("" + code).toLowerCase();

    if (code.indexOf("-") > -1) code = code.split("-")[0];
    return code;
}

var LANG_KEY = "lang";
var currentLang = "en";
var lastFocus = null;
var modalCurrentGenId = null;

function renderLangSelect(selectEl, selectedCode) {
    if (!selectEl) return;

    while (selectEl.firstChild) selectEl.removeChild(selectEl.firstChild);

    var langs = getSupportedLangs();
    for (var i=0; i<langs.length; i++) {
        var code = langs[i];
        var opt = document.createElement("option");
        opt.value = code;
        opt.appendChild(document.createTextNode(I18N[code].__name || code));
        if (code === selectedCode) opt.selected = true;
        selectEl.appendChild(opt);
    }
}

function syncLangSelects(lang) {
    renderLangSelect($("langSelectHead"), lang);
    renderLangSelect($("langSelectFoot"), lang);
}

function applyTexts(lang) {
    var t = I18N[lang];
    if (!t) return;

    try { document.documentElement.setAttribute("lang", lang); } catch(e){}

    document.title = t.meta.title;
    var metaDesc = document.querySelector ? document.querySelector('meta[name="description"]') : null;
    if (metaDesc && metaDesc.setAttribute) metaDesc.setAttribute("content", t.meta.description);

    text($("skipLink"), t.ui.skip);

    text($("brandTitle"), t.ui.brandTitle);
    text($("brandSub"), t.ui.brandSub);
    text($("navGenerators"), t.ui.navGenerators);
    text($("navApi"), t.ui.navApi);
    text($("navCode"), t.ui.navCode);
    text($("navInspiration"), t.ui.navInspiration);
    text($("navFeedback"), t.ui.feedback);

    text($("langLabelHead"), t.ui.langLabel);

    text($("heroTitle"), t.ui.heroTitle);
    text($("heroText"), t.ui.heroText);
    text($("introTitle"), t.ui.introTitle);
    setHtml($("introBody"), t.introHtml);

    text($("generators"), t.ui.generatorsTitle);

    setHtml($("footerAbout"), t.ui.footerAbout);
    text($("footGitHub"), t.ui.navCode);
    text($("footSource"), t.ui.navInspiration);
    text($("footApi"), t.ui.navApi);
    text($("footFeedback"), t.ui.feedback);
    text($("langLabelFoot"), t.ui.langLabel);

    text($("compatTitle"), t.ui.compatTitle);
    text($("compatText"), t.ui.compatText);

    setHtml($("legalBlock"), t.ui.legalHtml);
    text($("copyrightOwner"), t.ui.copyrightOwner);

    text($("modalCloseTop"), t.ui.close);
    text($("modalCloseBottom"), t.ui.close);
    text($("modalFeaturesTitle"), t.ui.modalFeatures);
    text($("modalHotkeysTitle"), t.ui.modalHotkeys);
    text($("modalOpen"), t.ui.open);
    text($("modalNewTab"), t.ui.newTab);

    updatePwaInstallUI();
}

function clearNode(el) {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
}

function buildThumb(imgSrc, href, ariaLabel) {
    var a = document.createElement("a");
    a.className = "thumb";
    a.href = href;
    a.setAttribute("aria-label", ariaLabel);

    var inner = document.createElement("span");
    inner.className = "thumb-inner";
    inner.setAttribute("data-thumb-bg", imgSrc);

    var img = document.createElement("img");
    img.src = imgSrc;
    img.alt = "";
    img.setAttribute("data-cover", "1");

    inner.appendChild(img);
    a.appendChild(inner);
    return a;
}

function buildButtonLink(cls, href, label, newTab) {
    var a = document.createElement("a");
    a.className = cls;
    a.href = href;
    a.appendChild(document.createTextNode(label));
    if (newTab) {
        a.target = "_blank";
        a.rel = "noopener";
    }
    return a;
}

function buildButton(cls, label) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = cls;
    b.appendChild(document.createTextNode(label));
    return b;
}

function renderCards(lang) {
    var t = I18N[lang];
    if (!t) return;

    var host = $("cards");
    clearNode(host);

    for (var i=0; i<GENERATORS.length; i++) {
        var g = GENERATORS[i];
        var gt = t.generators[g.id];

        var wrap = document.createElement("div");
        wrap.className = "card-wrap";

        var card = document.createElement("article");
        card.className = "card";
        card.setAttribute("data-gen-id", g.id);

        card.appendChild(buildThumb(g.img, g.href, (t.ui.open + ": " + gt.title)));

        var body = document.createElement("div");
        body.className = "card-body";

        var top = document.createElement("div");
        top.className = "card-top";

        var h3 = document.createElement("h3");
        h3.appendChild(document.createTextNode(gt.title));

        var tag = document.createElement("span");
        tag.className = "tag";
        tag.appendChild(document.createTextNode(gt.tag));

        top.appendChild(h3);
        top.appendChild(tag);

        var p = document.createElement("p");
        p.className = "short";
        p.appendChild(document.createTextNode(gt.short));

        var actions = document.createElement("div");
        actions.className = "actions";

        actions.appendChild(buildButtonLink("btn primary", g.href, t.ui.open, false));
        actions.appendChild(buildButtonLink("btn", g.href, t.ui.newTab, true));

        var detailsBtn = buildButton("btn", t.ui.details);
        (function(genId){
            on(detailsBtn, "click", function(){
                openModal(genId);
            });
        })(g.id);
        actions.appendChild(detailsBtn);

        body.appendChild(top);
        body.appendChild(p);
        body.appendChild(actions);

        card.appendChild(body);
        wrap.appendChild(card);
        host.appendChild(wrap);
    }

    applyObjectFitFallback();
}

function applyObjectFitFallback() {
    if (supportsObjectFit()) return;

    var host = $("cards");
    if (!host) return;

    var imgs = host.getElementsByTagName("img");
    for (var i=0; i<imgs.length; i++) {
        var img = imgs[i];
        if (!img || !img.getAttribute) continue;
        if (!img.getAttribute("data-cover")) continue;

        var parent = img.parentNode;
        if (parent && parent.getAttribute) {
            var bg = parent.getAttribute("data-thumb-bg");
            if (bg) {
                parent.style.backgroundImage = "url('" + bg + "')";
                img.style.display = "none";
            }
        }
    }
}

function openModal(genId) {
    var t = I18N[currentLang];
    if (!t) return;

    var gt = t.generators[genId];
    if (!gt) return;

    modalCurrentGenId = genId;
    lastFocus = document.activeElement;

    text($("modalTitle"), gt.title);
    text($("modalTag"), gt.tag);

    var descHost = $("modalDesc");
    clearNode(descHost);
    for (var i=0; i<gt.desc.length; i++) {
        var p = document.createElement("p");
        p.appendChild(document.createTextNode(gt.desc[i]));
        descHost.appendChild(p);
    }

    var featHost = $("modalFeatures");
    clearNode(featHost);
    for (var j=0; j<gt.features.length; j++) {
        var li = document.createElement("li");
        li.appendChild(document.createTextNode(gt.features[j]));
        featHost.appendChild(li);
    }

    var hkHost = $("modalHotkeys");
    clearNode(hkHost);

    var hkTitle = document.createElement("h4");
    hkTitle.appendChild(document.createTextNode(gt.hotkeysTitle));
    hkHost.appendChild(hkTitle);

    var ul = document.createElement("ul");
    ul.className = "keys";

    for (var k=0; k<gt.hotkeys.length; k++) {
        var item = gt.hotkeys[k];

        var row = document.createElement("li");
        row.className = "keyrow";

        var keysWrap = document.createElement("span");

        if (item.k && typeof item.k !== "string" && item.k.length) {
            for (var z=0; z<item.k.length; z++) {
                var kb = document.createElement("span");
                kb.className = "kbd";
                kb.appendChild(document.createTextNode(item.k[z]));
                keysWrap.appendChild(kb);
            }
        } else {
            var kb2 = document.createElement("span");
            kb2.className = "kbd";
            kb2.appendChild(document.createTextNode(item.k));
            keysWrap.appendChild(kb2);
        }

        var desc = document.createElement("span");
        desc.className = "kdesc";
        desc.appendChild(document.createTextNode(item.d));

        row.appendChild(keysWrap);
        row.appendChild(desc);
        ul.appendChild(row);
    }

    hkHost.appendChild(ul);

    var url = null;
    for (var n=0; n<GENERATORS.length; n++) {
        if (GENERATORS[n].id === genId) { url = GENERATORS[n].href; break; }
    }
    if (!url) url = "#";

    $("modalOpen").href = url;
    $("modalNewTab").href = url;

    var ov = $("modalOverlay");
    ov.style.display = "block";
    ov.setAttribute("aria-hidden", "false");

    try { $("modalCloseTop").focus(); } catch(e){}
}

function closeModal() {
    var ov = $("modalOverlay");
    ov.style.display = "none";
    ov.setAttribute("aria-hidden", "true");
    modalCurrentGenId = null;

    if (lastFocus && lastFocus.focus) {
        try { lastFocus.focus(); } catch(e){}
    }
}

function isClickOutsideModal(evt) {
    var target = evt.target || evt.srcElement;
    if (!target) return false;
    if (target.id === "modalOverlay") return true;
    return false;
}

function getDefaultLang() {
    if (I18N && I18N.en) return "en";
    for (var c in I18N) {
        if (I18N.hasOwnProperty(c)) return c;
    }
    return null;
}

function setLanguage(lang, source) {
    if (!lang) return;
    if (!I18N[lang]) return;

    currentLang = lang;

    safeLocalStorageSet(LANG_KEY, lang);

    syncLangSelects(lang);
    applyTexts(lang);
    renderCards(lang);
}

function initLanguage() {
    var fromQuery = normalizeLang(getQueryParam("lang"));
    if (fromQuery && I18N[fromQuery]) {
        setLanguage(fromQuery, "query");
        return;
    }

    var saved = normalizeLang(safeLocalStorageGet(LANG_KEY));
    if (saved && I18N[saved]) {
        setLanguage(saved, "storage");
        return;
    }

    var d = getDefaultLang();
    if (d) setLanguage(d, "default");
}

function boot() {
    text($("year"), (new Date()).getFullYear());

    var d = getDefaultLang() || "en";
    syncLangSelects(d);

    on($("langSelectHead"), "change", function(){
        var v = normalizeLang(this.value);
        if (I18N[v]) setLanguage(v, "ui");
    });
    on($("langSelectFoot"), "change", function(){
        var v = normalizeLang(this.value);
        if (I18N[v]) setLanguage(v, "ui");
    });

    on($("modalCloseTop"), "click", closeModal);
    on($("modalCloseBottom"), "click", closeModal);

    on($("modalOverlay"), "click", function(evt){
        if (isClickOutsideModal(evt)) closeModal();
    });

    on(document, "keydown", function(evt){
        evt = evt || window.event;
        var key = evt.key || evt.keyCode;
        if (key === "Escape" || key === "Esc" || key === 27) {
            var ov = $("modalOverlay");
            if (ov && ov.style.display === "block") closeModal();
        }
    });

    initLanguage();

}

var PWA = {
    inited: false,
    installed: false,
    isIOS: false,
    supportsInstallPrompt: false,
    deferredPrompt: null,
    btn: null,
    hint: null
};

function isStandaloneMode() {
    try {
        return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
    } catch(e) {
        return false;
    }
}

function updatePwaInstallUI() {
    if (!PWA.btn) return;

    var t = I18N[currentLang] || I18N.en || null;
    var ui = (t && t.ui) ? t.ui : {};

    if (PWA.installed || isStandaloneMode()) {
        PWA.btn.hidden = true;
        PWA.btn.setAttribute("aria-disabled", "true");
        if (PWA.hint) {
            PWA.hint.hidden = true;
            text(PWA.hint, "");
        }
        return;
    }

    PWA.btn.hidden = false;

    if (PWA.isIOS) {
        text(PWA.btn, ui.pwaInstallIOS || ui.pwaInstall || "Install");
        PWA.btn.setAttribute("aria-disabled", "false");
        if (PWA.hint) {
            if (ui.pwaInstallIOSHint) {
                PWA.hint.hidden = false;
                text(PWA.hint, ui.pwaInstallIOSHint);
            } else {
                PWA.hint.hidden = true;
                text(PWA.hint, "");
            }
        }
        return;
    }

    text(PWA.btn, ui.pwaInstall || "Install");

    if (PWA.deferredPrompt) {
        PWA.btn.setAttribute("aria-disabled", "false");
        if (PWA.hint) {
            PWA.hint.hidden = true;
            text(PWA.hint, "");
        }
        return;
    }

    PWA.btn.setAttribute("aria-disabled", "true");
    var msg = PWA.supportsInstallPrompt ? (ui.pwaInstallUnavailable || "") : (ui.pwaInstallUnsupported || ui.pwaInstallUnavailable || "");
    if (PWA.hint) {
        if (msg) {
            PWA.hint.hidden = false;
            text(PWA.hint, msg);
        } else {
            PWA.hint.hidden = true;
            text(PWA.hint, "");
        }
    }
}

function onPwaInstallClick() {
    if (!PWA.btn) return;

    var t = I18N[currentLang] || I18N.en || null;
    var ui = (t && t.ui) ? t.ui : {};

    if (PWA.installed || isStandaloneMode()) {
        PWA.btn.hidden = true;
        if (PWA.hint) PWA.hint.hidden = true;
        return;
    }

    if (PWA.isIOS) {
        showToast("info", ui.pwaInstallIOSToast || ui.pwaInstallIOSHint || "");
        return;
    }

    if (PWA.deferredPrompt) {
        var dp = PWA.deferredPrompt;
        PWA.deferredPrompt = null;
        updatePwaInstallUI();
        try { dp.prompt(); } catch(e) {}
        try {
            Promise.resolve(dp.userChoice).catch(function(){}).then(function(){
                updatePwaInstallUI();
            });
        } catch(e) {
            updatePwaInstallUI();
        }
        return;
    }

    var msg = PWA.supportsInstallPrompt ? (ui.pwaInstallUnavailable || "") : (ui.pwaInstallUnsupported || ui.pwaInstallUnavailable || "");
    if (msg) showToast("warn", msg);
    if (PWA.hint) PWA.hint.hidden = false;
}

function initPwaInstall() {
    if (PWA.inited) return;
    PWA.inited = true;

    PWA.btn = $("pwaInstallBtn");
    PWA.hint = $("pwaInstallHint");
    if (!PWA.btn) return;

    PWA.isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent || "");
    try { PWA.supportsInstallPrompt = ("onbeforeinstallprompt" in window); } catch(e) { PWA.supportsInstallPrompt = false; }

    on(window, "beforeinstallprompt", function(e){
        try { e.preventDefault(); } catch(err) {}
        PWA.deferredPrompt = e;
        updatePwaInstallUI();
    });

    on(window, "appinstalled", function(){
        PWA.installed = true;
        PWA.deferredPrompt = null;
        updatePwaInstallUI();
    });

    on(PWA.btn, "click", onPwaInstallClick);

    updatePwaInstallUI();
}

function init() {
    loadLanguages(function(err){ boot(); initPwaInstall(); });
}

if (document.readyState === "loading")
    on(document, "DOMContentLoaded", init); else init();
