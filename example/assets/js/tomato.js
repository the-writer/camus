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
    var SIDEBAR_KEY = "tomato-sidebar-collapsed";

    // 恢复上次的目录折叠状态（仅桌面端生效，移动端仍默认隐藏）
    body.classList.toggle("tm-collapsed", read(SIDEBAR_KEY) === "1");

    function isMobile() {
        return media.matches;
    }

    function toggleSidebar() {
        if (isMobile()) {
            body.classList.toggle("tm-open");
            return;
        }
        var collapsed = body.classList.toggle("tm-collapsed");
        write(SIDEBAR_KEY, collapsed ? "1" : "0");
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

    // ── 章节目录：分卷 / 倒序 / 序号 ──
    var chaptersNav = document.getElementById("tm-chapters");
    var volumeBtn = document.getElementById("tm-volume-btn");
    var volumeMenu = document.getElementById("tm-volume-menu");
    var reverseBtn = document.getElementById("tm-reverse-btn");
    var indexBtn = document.getElementById("tm-index-btn");

    if (chaptersNav) {
        var items = [];
        chaptersNav.querySelectorAll(".tm-chapter").forEach(function (link, i) {
            items.push({
                title: link.textContent.trim(),
                href: link.getAttribute("href"),
                volume: link.getAttribute("data-volume") || "",
                volumeKey: link.getAttribute("data-volume-key") || "",
                current: link.classList.contains("tm-current"),
                index: i + 1
            });
        });

        var REVERSE_KEY = "tomato-reverse";
        var INDEX_KEY = "tomato-index";
        var NONE_VOLUME = "__none__";
        var reverse = read(REVERSE_KEY) === "1";
        var showIndex = read(INDEX_KEY) === "1";
        var volumeFilter = "";

        var volumes = [];
        var hasNoVolume = false;
        items.forEach(function (item) {
            if (!item.volumeKey) {
                hasNoVolume = true;
                return;
            }
            var exists = volumes.some(function (volume) {
                return volume.key === item.volumeKey;
            });
            if (!exists) {
                volumes.push({ key: item.volumeKey, label: item.volume });
            }
        });

        if (volumeBtn) {
            volumeBtn.hidden = volumes.length === 0 && !hasNoVolume;
        }

        function closeVolumeMenu() {
            if (!volumeMenu) {
                return;
            }
            volumeMenu.hidden = true;
            if (volumeBtn) {
                volumeBtn.setAttribute("aria-expanded", "false");
            }
        }

        function selectVolume(volume) {
            volumeFilter = volume;
            buildVolumeMenu();
            renderChapters();
            closeVolumeMenu();
            chaptersNav.scrollTop = 0;
        }

        function buildVolumeMenu() {
            if (!volumeMenu) {
                return;
            }

            volumeMenu.innerHTML = "";

            var all = document.createElement("a");
            all.className = "tm-volume-item" + (volumeFilter === "" ? " is-active" : "");
            all.textContent = "全部分卷";
            all.addEventListener("click", function () {
                selectVolume("");
            });
            volumeMenu.appendChild(all);

            if (hasNoVolume) {
                var none = document.createElement("a");
                none.className = "tm-volume-item" + (volumeFilter === NONE_VOLUME ? " is-active" : "");
                none.textContent = "无分卷";
                none.addEventListener("click", function () {
                    selectVolume(NONE_VOLUME);
                });
                volumeMenu.appendChild(none);
            }

            volumes.forEach(function (volume) {
                var item = document.createElement("a");
                item.className = "tm-volume-item" + (volumeFilter === volume.key ? " is-active" : "");
                item.textContent = volume.label;
                item.addEventListener("click", function () {
                    selectVolume(volume.key);
                });
                volumeMenu.appendChild(item);
            });
        }

        function renderChapters() {
            var list = items.filter(function (item) {
                if (volumeFilter === "") {
                    return true;
                }
                if (volumeFilter === NONE_VOLUME) {
                    return item.volumeKey === "";
                }
                return item.volumeKey === volumeFilter;
            });

            if (reverse) {
                list = list.slice().reverse();
            }

            chaptersNav.innerHTML = "";

            // 序号列宽：至少两位数字，随全书章节数增长，并预留 "." 的宽度。
            var indexDigits = Math.max(2, String(items.length).length);
            chaptersNav.style.setProperty("--tm-index-width", indexDigits + 1 + "ch");

            var lastVolume = null;
            list.forEach(function (item) {
                if (item.volumeKey && item.volumeKey !== lastVolume) {
                    var heading = document.createElement("div");
                    heading.className = "tm-volume-title";
                    heading.textContent = item.volume;
                    chaptersNav.appendChild(heading);
                }
                lastVolume = item.volumeKey;

                var link = document.createElement("a");
                link.className = "tm-chapter" + (item.current ? " tm-current" : "");
                link.href = item.href;
                link.setAttribute("data-volume", item.volume);
                link.setAttribute("data-volume-key", item.volumeKey);

                if (showIndex) {
                    var number = document.createElement("span");
                    number.className = "tm-index";
                    number.textContent = String(item.index) + ".";
                    link.appendChild(number);
                }

                var title = document.createElement("span");
                title.className = "tm-chapter-title";
                title.textContent = item.title;
                link.appendChild(title);

                chaptersNav.appendChild(link);
            });

            if (volumeFilter === "") {
                var current = chaptersNav.querySelector(".tm-chapter.tm-current");
                if (current) {
                    var navRect = chaptersNav.getBoundingClientRect();
                    var curRect = current.getBoundingClientRect();
                    if (curRect.top < navRect.top || curRect.bottom > navRect.bottom) {
                        var delta = (curRect.top - navRect.top) + chaptersNav.scrollTop;
                        chaptersNav.scrollTop = Math.max(
                            0,
                            delta - chaptersNav.clientHeight / 2 + current.offsetHeight / 2
                        );
                    }
                }
            }
        }

        function syncButtons() {
            if (reverseBtn) {
                reverseBtn.classList.toggle("is-active", reverse);
                reverseBtn.setAttribute("aria-pressed", reverse ? "true" : "false");
            }
            if (indexBtn) {
                indexBtn.classList.toggle("is-active", showIndex);
                indexBtn.setAttribute("aria-pressed", showIndex ? "true" : "false");
            }
        }

        if (volumeBtn) {
            volumeBtn.addEventListener("click", function (event) {
                event.stopPropagation();
                if (!volumeMenu) {
                    return;
                }
                if (volumeMenu.hidden) {
                    buildVolumeMenu();
                    volumeMenu.hidden = false;
                    volumeBtn.setAttribute("aria-expanded", "true");
                } else {
                    closeVolumeMenu();
                }
            });
        }

        document.addEventListener("click", function (event) {
            if (!volumeMenu || volumeMenu.hidden) {
                return;
            }
            if (volumeMenu.contains(event.target) || (volumeBtn && volumeBtn.contains(event.target))) {
                return;
            }
            closeVolumeMenu();
        });

        if (reverseBtn) {
            reverseBtn.addEventListener("click", function () {
                reverse = !reverse;
                write(REVERSE_KEY, reverse ? "1" : "0");
                syncButtons();
                renderChapters();
            });
        }

        if (indexBtn) {
            indexBtn.addEventListener("click", function () {
                showIndex = !showIndex;
                write(INDEX_KEY, showIndex ? "1" : "0");
                syncButtons();
                renderChapters();
            });
        }

        chaptersNav.addEventListener("click", function (event) {
            if (event.target.closest(".tm-chapter")) {
                closeMobileSidebar();
            }
        });

        syncButtons();
        buildVolumeMenu();
        renderChapters();
    } else {
        // 点击章节后关闭移动端侧边栏
        document.querySelectorAll(".tm-chapters .tm-chapter").forEach(function (link) {
            link.addEventListener("click", closeMobileSidebar);
        });
    }
})();
