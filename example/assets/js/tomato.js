(function () {
    "use strict";

    var root = document.documentElement;
    var body = document.body;
    var FONT_KEY = "tomato-font-size";
    var THEME_KEY = "tomato-theme";
    var FONT_MIN = 16;
    var FONT_MAX = 40;
    var FONT_DEFAULT = 16;

    function read(key) {
        try {
            return window.localStorage.getItem(key);
        } catch (e) {
            return null;
        }
    }

    function write(key, value) {
        try {
            window.localStorage.setItem(key, value);
        } catch (e) {
            /* storage 不可用时忽略 */
        }
    }

    // ── 夜间模式 ──
    var themeBtn = document.getElementById("tm-theme");
    var themeIcon = document.getElementById("tm-theme-icon");
    var themeLabel = document.getElementById("tm-theme-label");
    var themeMedia = window.matchMedia
        ? window.matchMedia("(prefers-color-scheme: dark)")
        : { matches: false, addEventListener: null };

    function currentMode() {
        var mode = root.getAttribute("data-theme-mode");
        return mode === "dark" || mode === "light" || mode === "auto" ? mode : "auto";
    }

    function effectiveTheme(mode) {
        if (mode === "auto") {
            return themeMedia.matches ? "dark" : "light";
        }
        return mode;
    }

    function applyMode(mode) {
        var theme = effectiveTheme(mode);
        root.setAttribute("data-theme", theme);
        root.setAttribute("data-theme-mode", mode);

        if (themeIcon) {
            themeIcon.textContent = mode === "dark" ? "☾" : mode === "auto" ? "◐" : "☀";
        }
        if (themeLabel) {
            themeLabel.textContent = mode === "dark" ? "夜间" : mode === "auto" ? "自动" : "白天";
        }
        if (themeBtn) {
            themeBtn.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
        }
    }

    var storedTheme = read(THEME_KEY);
    applyMode(storedTheme === "dark" || storedTheme === "light" || storedTheme === "auto" ? storedTheme : currentMode());

    if (themeBtn) {
        themeBtn.addEventListener("click", function () {
            var mode = currentMode();
            var next = mode === "auto" ? "light" : mode === "light" ? "dark" : "auto";
            applyMode(next);
            write(THEME_KEY, next);
        });
    }

    // 自动模式跟随系统深浅色变化
    if (themeMedia.addEventListener) {
        themeMedia.addEventListener("change", function () {
            if (currentMode() === "auto") {
                applyMode("auto");
            }
        });
    }

    // ── 字号 ──
    var range = document.getElementById("tm-font-range");
    var minus = document.getElementById("tm-font-minus");
    var plus = document.getElementById("tm-font-plus");

    function clamp(value) {
        if (isNaN(value)) {
            return FONT_DEFAULT;
        }
        return Math.min(FONT_MAX, Math.max(FONT_MIN, Math.round(value)));
    }

    function applyFont(size) {
        var value = clamp(size);
        root.style.setProperty("--tm-font-size", value + "px");
        if (range) {
            range.value = String(value);
        }
        return value;
    }

    var storedFont = parseInt(read(FONT_KEY), 10);
    applyFont(isNaN(storedFont) ? FONT_DEFAULT : storedFont);

    function changeFont(delta) {
        var current = parseInt(range ? range.value : read(FONT_KEY), 10);
        var next = applyFont(clamp(current) + delta);
        write(FONT_KEY, String(next));
    }

    if (minus) {
        minus.addEventListener("click", function () {
            changeFont(-1);
        });
    }
    if (plus) {
        plus.addEventListener("click", function () {
            changeFont(1);
        });
    }
    if (range) {
        range.addEventListener("input", function () {
            write(FONT_KEY, String(applyFont(parseInt(range.value, 10))));
        });
    }

    // ── 侧边栏显示 / 隐藏 ──
    var menuBtn = document.getElementById("tm-menu");
    var overlay = document.getElementById("tm-overlay");
    var media = window.matchMedia("(max-width: 900px)");

    function isMobile() {
        return media.matches;
    }

    function toggleSidebar() {
        if (isMobile()) {
            body.classList.toggle("tm-open");
            return;
        }
        body.classList.toggle("tm-collapsed");
    }

    function closeMobileSidebar() {
        if (isMobile()) {
            body.classList.remove("tm-open");
        }
    }

    if (menuBtn) {
        menuBtn.addEventListener("click", toggleSidebar);
    }
    if (overlay) {
        overlay.addEventListener("click", closeMobileSidebar);
    }

    if (media.addEventListener) {
        media.addEventListener("change", function () {
            body.classList.remove("tm-open");
        });
    }

    // 点击章节后关闭移动端侧边栏
    document.querySelectorAll(".tm-chapters .tm-chapter").forEach(function (link) {
        link.addEventListener("click", closeMobileSidebar);
    });

    // 当前章节滚动到可见区域
    var current = document.querySelector(".tm-chapter.tm-current");
    if (current) {
        var container = current.closest(".tm-chapters");
        if (container) {
            var offset = current.offsetTop - container.clientHeight / 2;
            container.scrollTop = Math.max(0, offset);
        }
    }
})();
