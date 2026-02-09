(function () {
    if (!("serviceWorker" in navigator)) return;

    var hadController = !!navigator.serviceWorker.controller;

    function wasReloaded() {
        try { return sessionStorage.getItem("sw_reloaded_once") === "1"; } catch (_) { return false; }
    }

    function markReloaded() {
        try { sessionStorage.setItem("sw_reloaded_once", "1"); } catch (_) {}
    }

    function skipWaiting(w) {
        try { w && w.postMessage("SKIP_WAITING"); } catch (_) {}
    }

    function registerSW() {
        var swUrl = "/sw.js?v={{VERSION}}";
        var opts = { scope: "/" };
        try { opts.updateViaCache = "none"; } catch (_) {}

        navigator.serviceWorker
            .register(swUrl, opts)
            .then(function (reg) {
                if (reg.waiting && hadController) skipWaiting(reg.waiting);

                reg.addEventListener("updatefound", function () {
                    var w = reg.installing;
                    if (!w) return;

                    w.addEventListener("statechange", function () {
                        if (w.state !== "installed") return;
                        if (navigator.serviceWorker.controller) skipWaiting(w);
                    });
                });
            })
            .catch(function () {});
    }

    navigator.serviceWorker.addEventListener("controllerchange", function () {
        if (!hadController) return;
        if (wasReloaded()) return;
        markReloaded();
        location.reload();
    });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", registerSW, { once: true });
    } else {
        registerSW();
    }
})();
