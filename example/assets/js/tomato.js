(function () {
    "use strict";

    var root = document.documentElement;
    var body = document.body;
    var FONT_KEY = "tomato-font-size";
    var THEME_KEY = "tomato-theme";
    var FONT_MIN = 14;
    var FONT_MAX = 40;

    // 仅 tomato 主题读取 onload.js 中的开关；其它主题保持原有行为。
    var tomatoOptions = window.CAMUS_THEME === "tomato" ? window.CAMUS_TOMATO : null;
    var tomatoFont = tomatoOptions && tomatoOptions.font ? tomatoOptions.font : {};
    var configuredFontSize = parseInt(tomatoFont.size, 10);
    var FONT_DEFAULT = isNaN(configuredFontSize)
        ? 14
        : Math.min(FONT_MAX, Math.max(FONT_MIN, Math.round(configuredFontSize)));

    if (typeof tomatoFont.family === "string" && tomatoFont.family.trim() !== "") {
        root.style.setProperty("--tm-font-family", tomatoFont.family);
    }

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

    // ── 章节目录：分卷 / 时间 / 标签 / 倒序 / 序号 ──
    var chaptersNav = document.getElementById("tm-chapters");
    var volumeBtn = document.getElementById("tm-volume-btn");
    var volumeMenu = document.getElementById("tm-volume-menu");
    var monthBtn = document.getElementById("tm-month-btn");
    var monthMenu = document.getElementById("tm-month-menu");
    var tagBtn = document.getElementById("tm-tag-btn");
    var tagMenu = document.getElementById("tm-tag-menu");
    var reverseBtn = document.getElementById("tm-reverse-btn");
    var indexBtn = document.getElementById("tm-index-btn");

    function controlEnabled(name) {
        var item = tomatoOptions && tomatoOptions[name];
        return !item || item.enabled !== false;
    }

    function controlDefault(name) {
        var item = tomatoOptions && tomatoOptions[name];
        return !!(item && item.default);
    }

    function readToggle(key, fallback) {
        var value = read(key);
        if (value === "1") {
            return true;
        }
        if (value === "0") {
            return false;
        }
        return fallback;
    }

    if (chaptersNav) {
        var items = [];
        chaptersNav.querySelectorAll(".tm-chapter").forEach(function (link, i) {
            items.push({
                title: link.textContent.trim(),
                href: link.getAttribute("href"),
                volume: link.getAttribute("data-volume") || "",
                volumeKey: link.getAttribute("data-volume-key") || "",
                writeTime: parseInt(link.getAttribute("data-write-time"), 10) || 0,
                tags: (link.getAttribute("data-tags") || "").split(",").filter(Boolean),
                current: link.classList.contains("tm-current"),
                index: i + 1
            });
        });

        var REVERSE_KEY = "tomato-reverse";
        var INDEX_KEY = "tomato-index";
        var NONE_VOLUME = "__none__";
        var volumeEnabled = controlEnabled("volume");
        var monthEnabled = controlEnabled("month");
        var tagEnabled = controlEnabled("tag");
        var reverseEnabled = controlEnabled("reverse");
        var indexEnabled = controlEnabled("index");
        var reverse = reverseEnabled && readToggle(REVERSE_KEY, controlDefault("reverse"));
        var showIndex = indexEnabled && readToggle(INDEX_KEY, controlDefault("index"));
        var volumeFilter = "";
        var monthFilter = "";
        var tagFilter = "";

        // 供搜索页使用：按链接查询章节序号（序号开关关闭时返回 0）。
        var chapterIndexByHref = {};
        items.forEach(function (item) {
            chapterIndexByHref[item.href] = item.index;
        });
        window.CAMUS_CHAPTER_INDEX = {
            enabled: function () {
                return showIndex;
            },
            get: function (href) {
                return chapterIndexByHref[href] || 0;
            }
        };

        function pad2(value) {
            return String(value).padStart(2, "0");
        }

        function monthKey(timestamp) {
            var date = new Date(timestamp * 1000);
            return date.getUTCFullYear() + "-" + pad2(date.getUTCMonth() + 1);
        }

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

        var monthCounts = {};
        items.forEach(function (item) {
            if (item.writeTime > 0) {
                item.month = monthKey(item.writeTime);
                monthCounts[item.month] = (monthCounts[item.month] || 0) + 1;
            }
        });
        var months = Object.keys(monthCounts).sort().reverse().map(function (month) {
            return { key: month, count: monthCounts[month] };
        });
        var totalMonthItems = items.filter(function (item) {
            return !!item.month;
        }).length;

        var tagCounts = {};
        items.forEach(function (item) {
            var seen = {};
            item.tags.forEach(function (tag) {
                if (!tag || seen[tag]) {
                    return;
                }
                seen[tag] = true;
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        });
        var tags = Object.keys(tagCounts).sort(function (a, b) {
            if (tagCounts[b] !== tagCounts[a]) {
                return tagCounts[b] - tagCounts[a];
            }
            return a.localeCompare(b);
        }).map(function (tag) {
            return { key: tag, count: tagCounts[tag] };
        });
        var totalTagItems = items.filter(function (item) {
            return item.tags.length > 0;
        }).length;

        if (volumeBtn) {
            volumeBtn.hidden = !volumeEnabled || (volumes.length === 0 && !hasNoVolume);
        }
        if (monthBtn) {
            monthBtn.hidden = !monthEnabled || months.length === 0;
        }
        if (tagBtn) {
            tagBtn.hidden = !tagEnabled || tags.length === 0;
        }
        if (reverseBtn) {
            reverseBtn.hidden = !reverseEnabled;
        }
        if (indexBtn) {
            indexBtn.hidden = !indexEnabled;
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
            closeMonthMenu();
            closeTagMenu();
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

        function closeMonthMenu() {
            if (!monthMenu) {
                return;
            }
            monthMenu.hidden = true;
            if (monthBtn) {
                monthBtn.setAttribute("aria-expanded", "false");
            }
        }

        function closeTagMenu() {
            if (!tagMenu) {
                return;
            }
            tagMenu.hidden = true;
            if (tagBtn) {
                tagBtn.setAttribute("aria-expanded", "false");
            }
        }

        function selectMonth(month) {
            monthFilter = month;
            buildMonthMenu();
            renderChapters();
            closeMonthMenu();
            closeVolumeMenu();
            closeTagMenu();
            chaptersNav.scrollTop = 0;
        }

        function appendMonthItem(menu, label, value, count) {
            var item = document.createElement("a");
            item.className = "tm-volume-item tm-volume-item-split" + (monthFilter === value ? " is-active" : "");

            var text = document.createElement("span");
            text.className = "tm-volume-label";
            text.textContent = label;
            item.appendChild(text);

            var number = document.createElement("span");
            number.className = "tm-volume-count";
            number.textContent = String(count);
            item.appendChild(number);

            item.addEventListener("click", function () {
                selectMonth(value);
            });
            menu.appendChild(item);
        }

        function buildMonthMenu() {
            if (!monthMenu) {
                return;
            }

            monthMenu.innerHTML = "";
            appendMonthItem(monthMenu, "全部时间", "", totalMonthItems);
            months.forEach(function (month) {
                appendMonthItem(monthMenu, month.key, month.key, month.count);
            });
        }

        function selectTag(tag) {
            tagFilter = tag;
            buildTagMenu();
            renderChapters();
            closeTagMenu();
            closeVolumeMenu();
            closeMonthMenu();
            chaptersNav.scrollTop = 0;
        }

        function appendTagItem(menu, label, value, count) {
            var item = document.createElement("a");
            item.className = "tm-volume-item tm-volume-item-split" + (tagFilter === value ? " is-active" : "");

            var text = document.createElement("span");
            text.className = "tm-volume-label";
            text.textContent = label;
            item.appendChild(text);

            var number = document.createElement("span");
            number.className = "tm-volume-count";
            number.textContent = String(count);
            item.appendChild(number);

            item.addEventListener("click", function () {
                selectTag(value);
            });
            menu.appendChild(item);
        }

        function buildTagMenu() {
            if (!tagMenu) {
                return;
            }

            tagMenu.innerHTML = "";
            appendTagItem(tagMenu, "全部标签", "", totalTagItems);
            tags.forEach(function (tag) {
                appendTagItem(tagMenu, tag.key, tag.key, tag.count);
            });
        }

        function renderChapters() {
            var list = items.filter(function (item) {
                if (volumeFilter === NONE_VOLUME) {
                    if (item.volumeKey !== "") {
                        return false;
                    }
                } else if (volumeFilter !== "" && item.volumeKey !== volumeFilter) {
                    return false;
                }

                if (monthFilter !== "" && item.month !== monthFilter) {
                    return false;
                }

                if (tagFilter !== "" && item.tags.indexOf(tagFilter) === -1) {
                    return false;
                }

                return true;
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
                link.setAttribute("data-tip", item.title);
                link.setAttribute("data-volume", item.volume);
                link.setAttribute("data-volume-key", item.volumeKey);
                link.setAttribute("data-tags", item.tags.join(","));

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
                bindTip(link);
            });

            if (volumeFilter === "" && monthFilter === "" && tagFilter === "") {
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
                    closeMonthMenu();
                    closeTagMenu();
                    buildVolumeMenu();
                    volumeMenu.hidden = false;
                    volumeBtn.setAttribute("aria-expanded", "true");
                } else {
                    closeVolumeMenu();
                }
            });
        }

        if (monthBtn) {
            monthBtn.addEventListener("click", function (event) {
                event.stopPropagation();
                if (!monthMenu) {
                    return;
                }
                if (monthMenu.hidden) {
                    closeVolumeMenu();
                    closeTagMenu();
                    buildMonthMenu();
                    monthMenu.hidden = false;
                    monthBtn.setAttribute("aria-expanded", "true");
                } else {
                    closeMonthMenu();
                }
            });
        }

        if (tagBtn) {
            tagBtn.addEventListener("click", function (event) {
                event.stopPropagation();
                if (!tagMenu) {
                    return;
                }
                if (tagMenu.hidden) {
                    closeVolumeMenu();
                    closeMonthMenu();
                    buildTagMenu();
                    tagMenu.hidden = false;
                    tagBtn.setAttribute("aria-expanded", "true");
                } else {
                    closeTagMenu();
                }
            });
        }

        document.addEventListener("click", function (event) {
            if (volumeMenu && !volumeMenu.hidden &&
                !volumeMenu.contains(event.target) &&
                !(volumeBtn && volumeBtn.contains(event.target))) {
                closeVolumeMenu();
            }
            if (monthMenu && !monthMenu.hidden &&
                !monthMenu.contains(event.target) &&
                !(monthBtn && monthBtn.contains(event.target))) {
                closeMonthMenu();
            }
            if (tagMenu && !tagMenu.hidden &&
                !tagMenu.contains(event.target) &&
                !(tagBtn && tagBtn.contains(event.target))) {
                closeTagMenu();
            }
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
                document.dispatchEvent(new CustomEvent("tomato-index-toggle"));
            });
        }

        chaptersNav.addEventListener("click", function (event) {
            if (event.target.closest(".tm-chapter")) {
                closeMobileSidebar();
            }
        });

        syncButtons();
        buildVolumeMenu();
        buildMonthMenu();
        renderChapters();
    } else {
        // 点击章节后关闭移动端侧边栏
        document.querySelectorAll(".tm-chapters .tm-chapter").forEach(function (link) {
            link.addEventListener("click", closeMobileSidebar);
        });
    }

    // ── 自定义悬浮提示（替代系统 title） ──
    var tipEl = null;

    function ensureTip() {
        if (!tipEl) {
            tipEl = document.createElement("div");
            tipEl.className = "tm-tip";
            tipEl.setAttribute("role", "tooltip");
            tipEl.hidden = true;
            document.body.appendChild(tipEl);
        }
        return tipEl;
    }

    function hideTip() {
        if (tipEl) {
            tipEl.hidden = true;
        }
    }

    function showTip(target, text) {
        var tip = ensureTip();
        tip.textContent = text;
        tip.hidden = false;

        var rect = target.getBoundingClientRect();
        var width = tip.offsetWidth;
        var height = tip.offsetHeight;
        var margin = 8;

        var left = rect.left + rect.width / 2 - width / 2;
        left = Math.max(margin, Math.min(window.innerWidth - margin - width, left));

        var top = rect.bottom + margin;
        var placement = "bottom";
        if (top + height > window.innerHeight - margin && rect.top - margin - height >= margin) {
            top = rect.top - margin - height;
            placement = "top";
        }

        tip.style.left = Math.round(left) + "px";
        tip.style.top = Math.round(top) + "px";
        tip.setAttribute("data-placement", placement);
    }

    function isTruncated(target) {
        if (target.classList.contains("tm-book-sub")) {
            return target.classList.contains("is-clamped") || target.scrollHeight > target.clientHeight + 1;
        }

        var inner = target.querySelector(".tm-chapter-title, .tm-home-item-title");
        if (inner) {
            return inner.scrollWidth > inner.clientWidth + 1;
        }

        return target.scrollWidth > target.clientWidth + 1;
    }

    function bindTip(target) {
        if (!target || target.dataset.tipBound === "1") {
            return;
        }
        target.dataset.tipBound = "1";

        function open() {
            var text = target.getAttribute("data-tip") || "";
            if (text && isTruncated(target)) {
                showTip(target, text);
            }
        }

        target.addEventListener("mouseenter", open);
        target.addEventListener("mouseleave", hideTip);
        target.addEventListener("focus", open);
        target.addEventListener("blur", hideTip);
    }

    document.querySelectorAll("[data-tip]").forEach(bindTip);
    window.addEventListener("scroll", hideTip, true);
    window.addEventListener("resize", hideTip);

    // ── 封面模式下限制标题区域高度，超出时省略简介 ──
    function clampBookSubtitle() {
        var header = document.querySelector(".tm-book-cover");
        if (!header) {
            return;
        }

        var info = header.querySelector(".tm-book-info");
        var sub = info ? info.querySelector(".tm-book-sub") : null;
        if (!sub) {
            return;
        }

        sub.classList.remove("is-clamped");
        sub.style.display = "";
        sub.style.webkitBoxOrient = "";
        sub.style.webkitLineClamp = "";
        sub.style.overflow = "";

        var headerStyle = window.getComputedStyle(header);
        var padding =
            (parseFloat(headerStyle.paddingTop) || 0) + (parseFloat(headerStyle.paddingBottom) || 0);
        var maxHeight = header.clientHeight - padding;

        var infoRect = info.getBoundingClientRect();
        var subRect = sub.getBoundingClientRect();
        var subTop = subRect.top - infoRect.top;
        var style = window.getComputedStyle(sub);
        var lineHeight = parseFloat(style.lineHeight);
        if (!lineHeight) {
            lineHeight = parseFloat(style.fontSize) * 1.6;
        }

        var available = maxHeight - subTop;
        if (available <= 0) {
            sub.style.display = "none";
            return;
        }

        if (sub.scrollHeight <= available + 1) {
            return;
        }

        var lines = Math.max(1, Math.floor(available / lineHeight));
        sub.style.display = "-webkit-box";
        sub.style.webkitBoxOrient = "vertical";
        sub.style.webkitLineClamp = String(lines);
        sub.style.overflow = "hidden";
        sub.classList.add("is-clamped");
    }

    clampBookSubtitle();

    // ── 封面图路径解析（assets/ 内容会提升到输出根目录） ──
    document.querySelectorAll("img[data-cover]").forEach(function (img) {
        var raw = (img.getAttribute("data-cover") || "").trim();
        if (!raw) {
            return;
        }

        var src = raw;
        if (!/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(raw) && !/^data:/i.test(raw)) {
            var prefix = img.getAttribute("data-prefix") || "";
            var path = raw.replace(/^\.?\//, "").replace(/^assets\//, "");
            src = prefix + (path.charAt(0) === "/" ? path : "/" + path);
        }

        img.addEventListener("error", function () {
            var header = img.closest(".tm-book");
            img.remove();
            if (header) {
                header.classList.remove("tm-book-cover");
            }
        });

        img.src = src;
    });

    window.addEventListener("resize", clampBookSubtitle);

    // ── 复制当前文章链接 ──
    var copyBtn = document.getElementById("tm-copy-link");
    if (copyBtn) {
        var copyLabel = copyBtn.textContent;
        var copyTimer = null;

        var showCopyResult = function (text, ok) {
            copyBtn.textContent = text;
            copyBtn.classList.toggle("is-copied", ok);
            if (copyTimer) {
                window.clearTimeout(copyTimer);
            }
            copyTimer = window.setTimeout(function () {
                copyBtn.textContent = copyLabel;
                copyBtn.classList.remove("is-copied");
            }, 1600);
        };

        var fallbackCopy = function (url) {
            var area = document.createElement("textarea");
            area.value = url;
            area.setAttribute("readonly", "");
            area.style.position = "fixed";
            area.style.top = "-9999px";
            document.body.appendChild(area);
            area.select();

            var ok = false;
            try {
                ok = document.execCommand("copy");
            } catch (e) {
                ok = false;
            }
            document.body.removeChild(area);
            showCopyResult(ok ? "已复制" : "复制失败", ok);
        };

        copyBtn.addEventListener("click", function () {
            var url = window.location.href;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(url).then(function () {
                    showCopyResult("已复制", true);
                }).catch(function () {
                    fallbackCopy(url);
                });
                return;
            }

            fallbackCopy(url);
        });
    }

    // ── 友链 LOGO 路径解析（与封面图一致：绝对 URL 原样使用，相对路径拼 path_prefix） ──
    document.querySelectorAll("img[data-logo]").forEach(function (img) {
        var raw = (img.getAttribute("data-logo") || "").trim();
        if (!raw) {
            img.remove();
            return;
        }

        var src = raw;
        if (!/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(raw) && !/^data:/i.test(raw)) {
            var prefix = img.getAttribute("data-prefix") || "";
            var path = raw.replace(/^\.?\//, "").replace(/^assets\//, "");
            src = prefix + (path.charAt(0) === "/" ? path : "/" + path);
        }

        img.addEventListener("error", function () {
            img.remove();
        });
        img.src = src;
    });

    // ── 统计页折线图：读取年度统计表并绘制 ──
    function initStatsChart() {
        var line = document.getElementById("tm-chart-line");
        if (!line || !line.ownerSVGElement) {
            return;
        }

        var svg = line.ownerSVGElement;
        var grid = document.getElementById("tm-chart-grid");
        var area = document.getElementById("tm-chart-area");
        var dots = document.getElementById("tm-chart-dots");
        var axis = document.getElementById("tm-chart-axis");
        var empty = document.getElementById("tm-chart-empty");

        var data = [];
        document.querySelectorAll(".tm-stats-table tbody tr").forEach(function (row) {
            var cells = row.querySelectorAll("td");
            if (cells.length < 3) {
                return;
            }
            var year = (cells[0].textContent || "").trim();
            var articles = parseInt((cells[1].textContent || "").trim(), 10);
            var words = parseInt((cells[2].textContent || "").trim(), 10);
            if (!/^\d{4}$/.test(year) || !isFinite(articles) || !isFinite(words)) {
                return;
            }
            data.push({ year: year, articles: articles, words: words });
        });

        data.sort(function (a, b) {
            return Number(a.year) - Number(b.year);
        });

        if (!data.length) {
            svg.style.display = "none";
            if (empty) {
                empty.hidden = false;
            }
            return;
        }

        function svgNode(name, attrs) {
            var el = document.createElementNS("http://www.w3.org/2000/svg", name);
            Object.keys(attrs || {}).forEach(function (key) {
                el.setAttribute(key, attrs[key]);
            });
            return el;
        }

        function niceStep(raw) {
            if (raw <= 1) {
                return 1;
            }
            var pow = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
            var n = raw / pow;
            var step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
            return Math.max(1, step * pow);
        }

        function formatValue(value, metric) {
            if (metric === "words" && value >= 10000) {
                var wan = value / 10000;
                return (wan % 1 === 0 ? wan.toFixed(0) : wan.toFixed(1)) + "万";
            }
            return String(Math.round(value));
        }

        var width = 720;
        var height = 240;
        var pad = { top: 18, right: 20, bottom: 34, left: 44 };
        var plotW = width - pad.left - pad.right;
        var plotH = height - pad.top - pad.bottom;
        var baseY = pad.top + plotH;

        var toggles = document.querySelectorAll(".tm-chart-toggle");
        var metric = "articles";

        function metricValue(d) {
            return metric === "words" ? d.words : d.articles;
        }

        function xAt(i) {
            return data.length === 1 ? pad.left + plotW / 2 : pad.left + (i * plotW) / (data.length - 1);
        }

        function draw() {
            var maxValue = Math.max.apply(
                null,
                data.map(metricValue).concat([1])
            );
            var step = niceStep(maxValue / 4);
            var niceMax = step * 4;

            function yAt(value) {
                return pad.top + plotH - (value / niceMax) * plotH;
            }

            grid.textContent = "";
            axis.textContent = "";
            dots.textContent = "";

            for (var k = 0; k <= 4; k++) {
                var value = (niceMax / 4) * k;
                var y = yAt(value);
                grid.appendChild(svgNode("line", {
                    x1: pad.left,
                    y1: y,
                    x2: pad.left + plotW,
                    y2: y
                }));
                var label = svgNode("text", {
                    x: pad.left - 8,
                    y: y,
                    "text-anchor": "end",
                    "dominant-baseline": "middle"
                });
                label.textContent = formatValue(value, metric);
                axis.appendChild(label);
            }

            var labelEvery = Math.ceil(data.length / 12);
            var points = [];
            data.forEach(function (d, i) {
                var x = xAt(i);
                var y = yAt(metricValue(d));
                points.push(x + "," + y);

                var dot = svgNode("circle", { cx: x, cy: y, r: 3.5, class: "tm-chart-dot" });
                var title = svgNode("title", {});
                title.textContent = d.year + " 年：" +
                    (metric === "words" ? d.words + " 字" : d.articles + " 篇");
                dot.appendChild(title);
                dots.appendChild(dot);

                if (i % labelEvery === 0 || i === data.length - 1) {
                    var yearLabel = svgNode("text", {
                        x: x,
                        y: baseY + 20,
                        "text-anchor": "middle"
                    });
                    yearLabel.textContent = d.year;
                    axis.appendChild(yearLabel);
                }
            });

            line.setAttribute("points", points.join(" "));
            area.setAttribute(
                "points",
                [xAt(0) + "," + baseY].concat(points).concat([xAt(data.length - 1) + "," + baseY]).join(" ")
            );
        }

        function setMetric(next) {
            metric = next === "words" ? "words" : "articles";
            toggles.forEach(function (btn) {
                var active = btn.getAttribute("data-metric") === metric;
                btn.classList.toggle("is-active", active);
                btn.setAttribute("aria-pressed", active ? "true" : "false");
            });
            draw();
        }

        toggles.forEach(function (btn) {
            btn.addEventListener("click", function () {
                setMetric(btn.getAttribute("data-metric"));
            });
        });

        setMetric("articles");
    }

    initStatsChart();
})();
