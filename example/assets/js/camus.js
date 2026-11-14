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
            size: 14
        }
    };
})();
