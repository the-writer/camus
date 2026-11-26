(function () {
    "use strict";

    // 监听模式控制面板：可拖动的闪电悬浮球 + 悬浮控制面板。
    // 只在 camus -W（监听模式）下由构建器注入到页面中。

    // ==========================================================================
    // 常量
    // ==========================================================================

    // 脚本地址中的标记：用于定位接口根地址（marker 之前的部分即接口根）
    const SCRIPT_MARKER = "/js/watch.js";
    // 注入样式的元素 ID
    const STYLE_ID = "camus-watch-style";
    // 状态轮询间隔（毫秒）
    const POLL_INTERVAL = 1000;
    // 悬浮球位置在 localStorage 中的存储键
    const BALL_POSITION_KEY = "camus-watch-ball-position";
    // 拖动判定阈值（像素）：位移超过该值视为拖动而非点击
    const DRAG_THRESHOLD = 4;
    // 脚本侧兜底间距：读取 CSS 变量 --camus-watch-gap 失败时使用
    const FALLBACK_GAP = 8;

    // 面板 DOM 元素 ID
    const ID = {
        ball: "camus-watch-ball",
        panel: "camus-watch-panel",
        version: "camus-watch-version",
        htmlTime: "camus-watch-html-time",
        htmlElapsed: "camus-watch-html-elapsed",
        articles: "camus-watch-articles",
        pdfTime: "camus-watch-pdf-time",
        pdfElapsed: "camus-watch-pdf-elapsed",
        pdfState: "camus-watch-pdf-state",
        build: "camus-watch-build",
        pdf: "camus-watch-pdf",
        view: "camus-watch-view",
        hint: "camus-watch-hint"
    };

    // 面板文案
    const TEXT = {
        title: "Camus 监听控制台",
        labelHtmlBuild: "HTML 构建",
        labelHtmlElapsed: "HTML 耗时",
        labelArticles: "内容数量",
        labelPdfBuild: "PDF 构建",
        labelPdfElapsed: "PDF 耗时",
        labelPdfState: "PDF 状态",
        actionBuild: "立即构建",
        actionBuildRunning: "构建中…",
        actionPdf: "立即重建 PDF",
        actionPdfRunning: "PDF 构建中…",
        actionView: "查看 PDF",
        offline: "未连接到监听服务",
        pdfUnavailable: "PDF 暂不可用，请先重新构建 PDF",
        pdfFailed: "PDF 构建失败",
        pdfFile: "PDF 文件",
        notBuilt: "尚未构建",
        empty: "-"
    };

    // 面板接口路径
    const API = {
        status: "/__camus/status",
        build: "/__camus/build",
        pdf: "/__camus/pdf",
        pdfView: "/__camus/pdf/view"
    };

    // PDF 状态文案
    const PDF_STATE_TEXT = {
        idle: "空闲",
        running: "构建中",
        done: "已完成",
        failed: "失败"
    };

    // 单位与分隔符
    const UNIT = {
        bytes: ["B", "KB", "MB", "GB"],
        article: "篇",
        page: "页",
        separator: " · "
    };

    // 注入样式：颜色、圆角、阴影、间距、尺寸统一定义在 CSS 自定义属性中，脚本按需读取。
    const STYLE_TEXT = `
:root {
    --camus-watch-accent: #f5a623;
    --camus-watch-bg: rgba(28, 28, 32, 0.94);
    --camus-watch-fg: #f2f2f5;
    --camus-watch-muted: #a0a0aa;
    --camus-watch-border: rgba(255, 255, 255, 0.14);
    --camus-watch-radius: 12px;
    --camus-watch-gap: 8px;
}
.camus-watch-ball {
    position: fixed; right: 18px; bottom: 18px; z-index: 2147483000;
    width: 46px; height: 46px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 22px; line-height: 1; cursor: grab; touch-action: none;
    color: #1b1b1f; background: var(--camus-watch-accent);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.28);
    border: none; user-select: none;
}
.camus-watch-ball:hover { filter: brightness(1.08); }
.camus-watch-ball.camus-watch-dragging { cursor: grabbing; filter: brightness(1.08); }
.camus-watch-ball[hidden] { display: none; }
.camus-watch-panel {
    position: fixed; right: 18px; bottom: 76px; z-index: 2147483000;
    width: 288px; padding: 14px; border-radius: var(--camus-watch-radius);
    background: var(--camus-watch-bg); color: var(--camus-watch-fg);
    border: 1px solid var(--camus-watch-border);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.32);
    font-size: 13px; line-height: 1.6;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
        "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
    backdrop-filter: blur(8px);
}
.camus-watch-panel[hidden] { display: none; }
.camus-watch-title {
    display: flex; align-items: center; justify-content: space-between;
    font-weight: 600; font-size: 14px; margin-bottom: 10px;
}
.camus-watch-title span.sub {
    font-weight: 400; font-size: 11px; color: var(--camus-watch-muted);
}
.camus-watch-row {
    display: flex; justify-content: space-between; gap: var(--camus-watch-gap);
    padding: 3px 0;
}
.camus-watch-row b { font-weight: 600; }
.camus-watch-row .label { color: var(--camus-watch-muted); }
.camus-watch-row .value { text-align: right; }
.camus-watch-actions {
    display: flex; flex-wrap: wrap; gap: var(--camus-watch-gap);
    margin-top: 12px;
}
.camus-watch-actions button {
    flex: 1 1 0; min-width: 84px; padding: 7px 10px; cursor: pointer;
    font-size: 13px; font-family: inherit;
    color: var(--camus-watch-fg); background: rgba(255, 255, 255, 0.08);
    border: 1px solid var(--camus-watch-border); border-radius: 8px;
}
.camus-watch-actions button:hover:not(:disabled) { background: rgba(255, 255, 255, 0.16); }
.camus-watch-actions button:disabled { opacity: 0.45; cursor: not-allowed; }
.camus-watch-actions button.primary {
    color: #1b1b1f; background: var(--camus-watch-accent); border-color: transparent;
}
.camus-watch-hint {
    margin-top: 8px; font-size: 11px; color: var(--camus-watch-muted);
    word-break: break-all;
}
`;

    // 面板结构：文案与元素 ID 均取自常量，避免散落的字面量。
    const PANEL_HTML = `
<div class="camus-watch-title">
    <span>${TEXT.title}</span>
    <span class="sub" id="${ID.version}"></span>
</div>
<div class="camus-watch-row"><span class="label">${TEXT.labelHtmlBuild}</span>
    <span class="value" id="${ID.htmlTime}">${TEXT.empty}</span></div>
<div class="camus-watch-row"><span class="label">${TEXT.labelHtmlElapsed}</span>
    <span class="value" id="${ID.htmlElapsed}">${TEXT.empty}</span></div>
<div class="camus-watch-row"><span class="label">${TEXT.labelArticles}</span>
    <span class="value" id="${ID.articles}">${TEXT.empty}</span></div>
<div class="camus-watch-row"><span class="label">${TEXT.labelPdfBuild}</span>
    <span class="value" id="${ID.pdfTime}">${TEXT.empty}</span></div>
<div class="camus-watch-row"><span class="label">${TEXT.labelPdfElapsed}</span>
    <span class="value" id="${ID.pdfElapsed}">${TEXT.empty}</span></div>
<div class="camus-watch-row"><span class="label">${TEXT.labelPdfState}</span>
    <span class="value" id="${ID.pdfState}">${TEXT.empty}</span></div>
<div class="camus-watch-actions">
    <button type="button" id="${ID.build}" class="primary">${TEXT.actionBuild}</button>
    <button type="button" id="${ID.pdf}">${TEXT.actionPdf}</button>
</div>
<div class="camus-watch-actions">
    <button type="button" id="${ID.view}" disabled>${TEXT.actionView}</button>
</div>
<div class="camus-watch-hint" id="${ID.hint}"></div>
`;

    const script = document.currentScript;
    const scriptUrl = script && script.src ? script.src : "";
    const markerIndex = scriptUrl.indexOf(SCRIPT_MARKER);
    if (markerIndex < 0) {
        return;
    }

    // 接口根地址：从脚本自身地址推导，支持站点挂在子路径下。
    const apiBase = scriptUrl.slice(0, markerIndex);

    const state = {
        connected: false,
        // 已知的 HTML 构建序号，首次拿到状态时作为基线，不触发刷新
        htmlSeq: null,
        // 面板是否展开
        opened: false,
        // 等待构建完成（用户点击“立即构建”后）
        building: false,
        // 上一次状态
        status: null,
        // 悬浮球显式位置 {x, y}；null 表示使用样式中的默认右下角位置
        ballPosition: null
    };

    let ball = null;
    let panel = null;
    let drag = null;
    let suppressClick = false;

    function el(id) {
        return document.getElementById(id);
    }

    function clamp(value, min, max) {
        if (!Number.isFinite(value)) {
            return min;
        }

        return Math.min(Math.max(value, min), max);
    }

    // 读取 CSS 自定义属性，失败时回退到脚本侧默认值
    function readStyleValue(name, fallback) {
        try {
            const value = parseFloat(window.getComputedStyle(document.documentElement).getPropertyValue(name));
            return Number.isFinite(value) ? value : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function formatBytes(bytes) {
        if (!bytes || bytes <= 0) {
            return TEXT.empty;
        }

        const units = UNIT.bytes;
        let value = bytes;
        let unit = 0;
        while (value >= 1024 && unit < units.length - 1) {
            value = value / 1024;
            unit++;
        }

        const number = unit === 0 ? value : value.toFixed(1);
        return `${number} ${units[unit]}`;
    }

    function formatSeconds(seconds) {
        if (!seconds || seconds <= 0) {
            return TEXT.empty;
        }

        return seconds < 10 ? `${seconds.toFixed(2)}s` : `${seconds.toFixed(1)}s`;
    }

    function formatTime(text) {
        return text && text !== TEXT.empty ? text : TEXT.notBuilt;
    }

    function request(method, path, callback) {
        const xhr = new XMLHttpRequest();
        xhr.open(method, `${apiBase}${path}`, true);
        xhr.setRequestHeader("Cache-Control", "no-store");
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) {
                return;
            }

            if (xhr.status < 200 || xhr.status >= 300) {
                callback(null);
                return;
            }

            let data = null;
            try {
                data = JSON.parse(xhr.responseText);
            } catch (e) {
                data = null;
            }

            callback(data);
        };
        xhr.onerror = function () {
            callback(null);
        };
        xhr.send();
    }

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }

        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = STYLE_TEXT;
        (document.head || document.documentElement).appendChild(style);
    }

    // --------------------------------------------------------------------------
    // 悬浮球位置：localStorage 持久化，刷新后还原
    // --------------------------------------------------------------------------

    function loadBallPosition() {
        try {
            const raw = window.localStorage.getItem(BALL_POSITION_KEY);
            if (!raw) {
                return null;
            }

            const data = JSON.parse(raw);
            if (!data || !Number.isFinite(data.x) || !Number.isFinite(data.y)) {
                return null;
            }

            return { x: data.x, y: data.y };
        } catch (e) {
            // 隐私模式等场景下 localStorage 不可用
            return null;
        }
    }

    function saveBallPosition(position) {
        try {
            window.localStorage.setItem(BALL_POSITION_KEY, JSON.stringify(position));
        } catch (e) {
            // 忽略写入失败
        }
    }

    function applyBallPosition(x, y) {
        const maxLeft = Math.max(0, window.innerWidth - ball.offsetWidth);
        const maxTop = Math.max(0, window.innerHeight - ball.offsetHeight);

        ball.style.left = `${clamp(x, 0, maxLeft)}px`;
        ball.style.top = `${clamp(y, 0, maxTop)}px`;
        ball.style.right = "auto";
        ball.style.bottom = "auto";
    }

    function restoreBallPosition() {
        const saved = loadBallPosition();
        if (!saved) {
            return;
        }

        state.ballPosition = saved;
        applyBallPosition(saved.x, saved.y);
    }

    // 面板始终贴着悬浮球摆放，并保持在视口内
    function updatePanelPosition() {
        if (!panel || panel.hidden) {
            return;
        }

        const gap = readStyleValue("--camus-watch-gap", FALLBACK_GAP);
        const ballRect = ball.getBoundingClientRect();
        const panelRect = panel.getBoundingClientRect();

        let top = ballRect.top - panelRect.height - gap;
        if (top < gap) {
            top = ballRect.bottom + gap;
        }
        top = clamp(top, gap, Math.max(gap, window.innerHeight - panelRect.height - gap));

        const left = clamp(
            ballRect.left,
            gap,
            Math.max(gap, window.innerWidth - panelRect.width - gap)
        );

        panel.style.left = `${left}px`;
        panel.style.top = `${top}px`;
        panel.style.right = "auto";
        panel.style.bottom = "auto";
    }

    function togglePanel() {
        state.opened = !state.opened;
        panel.hidden = !state.opened;
        updatePanelPosition();
    }

    // --------------------------------------------------------------------------
    // 拖动
    // --------------------------------------------------------------------------

    function onPointerDown(event) {
        if (event.button !== undefined && event.button !== 0) {
            return;
        }

        suppressClick = false;

        const rect = ball.getBoundingClientRect();
        drag = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top,
            moved: false
        };

        if (typeof ball.setPointerCapture === "function") {
            try {
                ball.setPointerCapture(event.pointerId);
            } catch (e) {
                // 指针捕获失败时退化为普通事件流
            }
        }
    }

    function onPointerMove(event) {
        if (!drag || event.pointerId !== drag.pointerId) {
            return;
        }

        if (!drag.moved) {
            const dx = Math.abs(event.clientX - drag.startX);
            const dy = Math.abs(event.clientY - drag.startY);
            if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) {
                return;
            }

            drag.moved = true;
            ball.classList.add("camus-watch-dragging");
        }

        applyBallPosition(event.clientX - drag.offsetX, event.clientY - drag.offsetY);
        updatePanelPosition();
    }

    function onPointerUp(event) {
        if (!drag || event.pointerId !== drag.pointerId) {
            return;
        }

        const moved = drag.moved;
        drag = null;
        ball.classList.remove("camus-watch-dragging");

        if (typeof ball.releasePointerCapture === "function") {
            try {
                ball.releasePointerCapture(event.pointerId);
            } catch (e) {
                // 忽略释放失败
            }
        }

        if (!moved) {
            return;
        }

        // 拖动结束后紧接的 click 不再展开/收起面板
        suppressClick = true;

        const rect = ball.getBoundingClientRect();
        state.ballPosition = { x: rect.left, y: rect.top };
        saveBallPosition(state.ballPosition);
    }

    function createPanel() {
        ball = document.createElement("button");
        ball.id = ID.ball;
        ball.className = "camus-watch-ball";
        ball.type = "button";
        ball.title = TEXT.title;
        ball.textContent = "⚡";

        panel = document.createElement("div");
        panel.id = ID.panel;
        panel.className = "camus-watch-panel";
        panel.hidden = true;
        panel.innerHTML = PANEL_HTML;

        (document.body || document.documentElement).appendChild(ball);
        (document.body || document.documentElement).appendChild(panel);

        ball.addEventListener("pointerdown", onPointerDown);
        ball.addEventListener("pointermove", onPointerMove);
        ball.addEventListener("pointerup", onPointerUp);
        ball.addEventListener("pointercancel", onPointerUp);

        ball.addEventListener("click", function () {
            if (suppressClick) {
                suppressClick = false;
                return;
            }

            togglePanel();
        });

        el(ID.build).addEventListener("click", function () {
            const button = el(ID.build);
            button.disabled = true;
            button.textContent = TEXT.actionBuildRunning;
            state.building = true;
            request("POST", API.build, function () {
                // 状态由轮询更新，构建完成后按钮会自动恢复
            });
        });

        el(ID.pdf).addEventListener("click", function () {
            const button = el(ID.pdf);
            button.disabled = true;
            button.textContent = TEXT.actionPdfRunning;
            request("POST", API.pdf, function () {
                // 状态由轮询更新
            });
        });

        el(ID.view).addEventListener("click", function () {
            request("POST", API.pdfView, function (data) {
                if (!data || !data.ok || !data.url) {
                    setHint(TEXT.pdfUnavailable);
                    return;
                }

                window.open(data.url, "_blank");
            });
        });
    }

    function setHint(text) {
        const hint = el(ID.hint);
        if (hint) {
            hint.textContent = text || "";
        }
    }

    function render(status) {
        state.status = status;
        state.connected = true;

        const html = status.html || {};
        const pdf = status.pdf || {};

        const version = el(ID.version);
        if (version) {
            version.textContent = status.version ? `v${status.version}` : "";
        }

        const htmlTime = el(ID.htmlTime);
        if (htmlTime) {
            htmlTime.textContent = formatTime(html.time);
        }

        const htmlElapsed = el(ID.htmlElapsed);
        if (htmlElapsed) {
            htmlElapsed.textContent = formatSeconds(html.elapsed);
        }

        const articles = el(ID.articles);
        if (articles) {
            const count = html.articles || 0;
            articles.textContent = `${count} ${UNIT.article}${UNIT.separator}${formatBytes(html.bytes)}`;
        }

        const pdfTime = el(ID.pdfTime);
        if (pdfTime) {
            pdfTime.textContent = formatTime(pdf.time);
        }

        const pdfElapsed = el(ID.pdfElapsed);
        if (pdfElapsed) {
            pdfElapsed.textContent = formatSeconds(pdf.elapsed);
        }

        const pdfState = el(ID.pdfState);
        if (pdfState) {
            let text = PDF_STATE_TEXT[pdf.state] || pdf.state || PDF_STATE_TEXT.idle;
            if (pdf.state === "done" && pdf.pages) {
                text += `${UNIT.separator}${pdf.pages} ${UNIT.page}${UNIT.separator}${pdf.articles || 0} ${UNIT.article}`;
            }

            pdfState.textContent = text;
        }

        const buildButton = el(ID.build);
        if (buildButton) {
            if (state.building) {
                buildButton.disabled = true;
                buildButton.textContent = TEXT.actionBuildRunning;
            } else {
                buildButton.disabled = false;
                buildButton.textContent = TEXT.actionBuild;
            }
        }

        const pdfButton = el(ID.pdf);
        if (pdfButton) {
            if (pdf.state === "running") {
                pdfButton.disabled = true;
                pdfButton.textContent = TEXT.actionPdfRunning;
            } else {
                pdfButton.disabled = false;
                pdfButton.textContent = TEXT.actionPdf;
            }
        }

        const viewButton = el(ID.view);
        if (viewButton) {
            viewButton.disabled = pdf.state !== "done";
        }

        if (pdf.state === "failed" && pdf.error) {
            setHint(`${TEXT.pdfFailed}：${pdf.error}`);
        } else if (pdf.state === "done" && pdf.file) {
            setHint(`${TEXT.pdfFile}：${pdf.file}`);
        }
    }

    function renderOffline() {
        state.connected = false;
        setHint(TEXT.offline);
    }

    function reloadPage() {
        try {
            sessionStorage.setItem("camus-watch-scroll", String(window.scrollY || 0));
        } catch (e) {
            // 忽略隐私模式下的写入失败
        }

        window.location.reload();
    }

    function poll() {
        request("GET", API.status, function (status) {
            if (!status) {
                renderOffline();
                return;
            }

            const htmlSeq = (status.html && status.html.seq) || 0;
            if (state.htmlSeq === null) {
                // 首次拿到状态：建立基线，不触发刷新
                state.htmlSeq = htmlSeq;
                state.building = false;
            } else if (htmlSeq !== state.htmlSeq) {
                state.htmlSeq = htmlSeq;
                state.building = false;
                reloadPage();
                return;
            }

            render(status);
        });
    }

    function init() {
        injectStyle();
        createPanel();
        restoreBallPosition();

        // 视口尺寸变化时重新约束悬浮球位置与面板摆放
        window.addEventListener("resize", function () {
            if (state.ballPosition) {
                applyBallPosition(state.ballPosition.x, state.ballPosition.y);
            }

            updatePanelPosition();
        });

        // 刷新后恢复滚动位置
        window.addEventListener("load", function () {
            let offset = 0;
            try {
                offset = Number(sessionStorage.getItem("camus-watch-scroll") || 0);
                sessionStorage.removeItem("camus-watch-scroll");
            } catch (e) {
                offset = 0;
            }

            if (offset > 0) {
                window.scrollTo(0, offset);
            }
        });

        poll();
        window.setInterval(poll, POLL_INTERVAL);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
