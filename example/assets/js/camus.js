(function () {
    "use strict";

    // 当前主题名由模板写入 body 的 data-camus-theme，运行时自动读取。
    var body = document.body;
    window.CAMUS_THEME = body ? (body.getAttribute("data-camus-theme") || "") : "";

    // tomato 主题开关：enabled=false 时直接隐藏对应按钮；
    // reverse / index 的 default 表示首次访问（无本地记录）时是否默认选中。
    // language.default 可为 "auto" / "en" / "zh"；"auto" 时按浏览器语言识别（zh* → 中文，其余 → 英文）。
    window.CAMUS_TOMATO = {
        volume: { enabled: true },
        month: { enabled: true },
        tag: { enabled: true },
        language: { enabled: true, default: "auto" },
        reverse: { enabled: true, default: false },
        index: { enabled: true, default: false },
        // persistent=true：桌面端目录常驻，可折叠并记忆状态；
        // persistent=false：隐藏折叠按钮，改由右侧目录按钮以模糊遮罩抽屉展开；
        // defaultVisible 仅在 persistent=true 时生效，表示首次访问是否显示目录。
        sidebar: { persistent: false, defaultVisible: true },
        font: {
            family: '"Noto Serif SC", "Source Han Serif SC", "Songti SC", STSong, Georgia, "Times New Roman", serif',
            size: 15
        }
    };

    // 除 default 外的主题在启用 html.pwa（模板输出 manifest）时注册 PWA Service Worker；
    // 从当前脚本路径推导站点根或 path_prefix。
    var pwaManifest = document.querySelector ? document.querySelector('link[rel="manifest"]') : null;
    if (pwaManifest && window.CAMUS_THEME && window.CAMUS_THEME !== "default" &&
        "serviceWorker" in navigator) {
        var script = document.currentScript;
        var scriptUrl = script && script.src ? script.src : "";
        var marker = "/js/camus.js";
        var markerIndex = scriptUrl.indexOf(marker);
        var root = markerIndex >= 0 ? scriptUrl.slice(0, markerIndex) : "";

        window.addEventListener("load", function () {
            navigator.serviceWorker.register(root + "/sw.js").catch(function () {
            });
        });
    }
})();
