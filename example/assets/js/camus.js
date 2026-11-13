(function () {
    "use strict";

    // 当前主题名由模板写入 body 的 data-camus-theme，运行时自动读取。
    var body = document.body;
    window.CAMUS_THEME = body ? (body.getAttribute("data-camus-theme") || "") : "";

    // tomato 主题开关：enabled=false 时直接隐藏对应按钮；
    // reverse / index 的 default 表示首次访问（无本地记录）时是否默认选中。
    window.CAMUS_TOMATO = {
        volume: { enabled: true },
        month: { enabled: true },
        tag: { enabled: true },
        language: { enabled: true, default: "en" },
        reverse: { enabled: true, default: false },
        index: { enabled: true, default: false },
        font: {
            family: '"Noto Serif SC", "Source Han Serif SC", "Songti SC", STSong, Georgia, "Times New Roman", serif',
            size: 14
        }
    };
})();
