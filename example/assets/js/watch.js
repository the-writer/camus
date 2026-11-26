(function () {
    "use strict";

    // 监听模式控制面板：右下角闪电悬浮球 + 悬浮控制面板。
    // 只在 camus -W（监听模式）下由构建器注入到页面中。

    var script = document.currentScript;
    var scriptUrl = script && script.src ? script.src : "";
    var marker = "/js/watch.js";
    var markerIndex = scriptUrl.indexOf(marker);
    if (markerIndex < 0) {
        return;
    }

    // 接口根地址：从脚本自身地址推导，支持站点挂在子路径下。
    var apiBase = scriptUrl.slice(0, markerIndex);

    var STYLE_ID = "camus-watch-style";
    var POLL_INTERVAL = 1000;

    var state = {
        connected: false,
        // 已知的 HTML 构建序号，首次拿到状态时作为基线，不触发刷新
        htmlSeq: null,
        // 面板是否展开
        opened: false,
        // 等待构建完成（用户点击“立即构建”后）
        building: false,
        // 上一次状态
        status: null
    };

    function el(id) {
        return document.getElementById(id);
    }

    function formatBytes(bytes) {
        if (!bytes || bytes <= 0) {
            return "-";
        }

        var units = ["B", "KB", "MB", "GB"];
        var value = bytes;
        var unit = 0;
        while (value >= 1024 && unit < units.length - 1) {
            value = value / 1024;
            unit++;
        }

        return (unit === 0 ? value : value.toFixed(1)) + " " + units[unit];
    }

    function formatSeconds(seconds) {
        if (!seconds || seconds <= 0) {
            return "-";
        }

        return seconds < 10 ? seconds.toFixed(2) + "s" : seconds.toFixed(1) + "s";
    }

    function formatTime(text) {
        return text && text !== "-" ? text : "尚未构建";
    }

    function request(method, path, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open(method, apiBase + path, true);
        xhr.setRequestHeader("Cache-Control", "no-store");
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) {
                return;
            }

            if (xhr.status < 200 || xhr.status >= 300) {
                callback(null);
                return;
            }

            var data = null;
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

        var style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = [
            ":root {",
            "  --camus-watch-accent: #f5a623;",
            "  --camus-watch-bg: rgba(28, 28, 32, 0.94);",
            "  --camus-watch-fg: #f2f2f5;",
            "  --camus-watch-muted: #a0a0aa;",
            "  --camus-watch-border: rgba(255, 255, 255, 0.14);",
            "  --camus-watch-radius: 12px;",
            "  --camus-watch-gap: 8px;",
            "}",
            ".camus-watch-ball {",
            "  position: fixed; right: 18px; bottom: 18px; z-index: 2147483000;",
            "  width: 46px; height: 46px; border-radius: 50%;",
            "  display: flex; align-items: center; justify-content: center;",
            "  font-size: 22px; line-height: 1; cursor: pointer;",
            "  color: #1b1b1f; background: var(--camus-watch-accent);",
            "  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.28);",
            "  border: none; user-select: none;",
            "}",
            ".camus-watch-ball:hover { filter: brightness(1.08); }",
            ".camus-watch-ball[hidden] { display: none; }",
            ".camus-watch-panel {",
            "  position: fixed; right: 18px; bottom: 76px; z-index: 2147483000;",
            "  width: 288px; padding: 14px; border-radius: var(--camus-watch-radius);",
            "  background: var(--camus-watch-bg); color: var(--camus-watch-fg);",
            "  border: 1px solid var(--camus-watch-border);",
            "  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.32);",
            "  font-size: 13px; line-height: 1.6;",
            "  font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", \"PingFang SC\",",
            "    \"Hiragino Sans GB\", \"Microsoft YaHei\", sans-serif;",
            "  backdrop-filter: blur(8px);",
            "}",
            ".camus-watch-panel[hidden] { display: none; }",
            ".camus-watch-title {",
            "  display: flex; align-items: center; justify-content: space-between;",
            "  font-weight: 600; font-size: 14px; margin-bottom: 10px;",
            "}",
            ".camus-watch-title span.sub {",
            "  font-weight: 400; font-size: 11px; color: var(--camus-watch-muted);",
            "}",
            ".camus-watch-row {",
            "  display: flex; justify-content: space-between; gap: var(--camus-watch-gap);",
            "  padding: 3px 0;",
            "}",
            ".camus-watch-row b { font-weight: 600; }",
            ".camus-watch-row .label { color: var(--camus-watch-muted); }",
            ".camus-watch-row .value { text-align: right; }",
            ".camus-watch-actions {",
            "  display: flex; flex-wrap: wrap; gap: var(--camus-watch-gap);",
            "  margin-top: 12px;",
            "}",
            ".camus-watch-actions button {",
            "  flex: 1 1 auto; min-width: 84px; padding: 7px 10px; cursor: pointer;",
            "  font-size: 13px; font-family: inherit;",
            "  color: var(--camus-watch-fg); background: rgba(255, 255, 255, 0.08);",
            "  border: 1px solid var(--camus-watch-border); border-radius: 8px;",
            "}",
            ".camus-watch-actions button:hover:not(:disabled) { background: rgba(255, 255, 255, 0.16); }",
            ".camus-watch-actions button:disabled { opacity: 0.45; cursor: not-allowed; }",
            ".camus-watch-actions button.primary {",
            "  color: #1b1b1f; background: var(--camus-watch-accent); border-color: transparent;",
            "}",
            ".camus-watch-hint {",
            "  margin-top: 8px; font-size: 11px; color: var(--camus-watch-muted);",
            "  word-break: break-all;",
            "}"
        ].join("\n");
        (document.head || document.documentElement).appendChild(style);
    }

    function createPanel() {
        var ball = document.createElement("button");
        ball.id = "camus-watch-ball";
        ball.className = "camus-watch-ball";
        ball.type = "button";
        ball.title = "Camus 监听控制台";
        ball.textContent = "⚡";

        var panel = document.createElement("div");
        panel.id = "camus-watch-panel";
        panel.className = "camus-watch-panel";
        panel.hidden = true;
        panel.innerHTML = [
            '<div class="camus-watch-title">',
            '  <span>Camus 监听控制台</span>',
            '  <span class="sub" id="camus-watch-version"></span>',
            "</div>",
            '<div class="camus-watch-row"><span class="label">HTML 构建</span>',
            '  <span class="value" id="camus-watch-html-time">-</span></div>',
            '<div class="camus-watch-row"><span class="label">HTML 耗时</span>',
            '  <span class="value" id="camus-watch-html-elapsed">-</span></div>',
            '<div class="camus-watch-row"><span class="label">内容数量</span>',
            '  <span class="value" id="camus-watch-articles">-</span></div>',
            '<div class="camus-watch-row"><span class="label">PDF 构建</span>',
            '  <span class="value" id="camus-watch-pdf-time">-</span></div>',
            '<div class="camus-watch-row"><span class="label">PDF 耗时</span>',
            '  <span class="value" id="camus-watch-pdf-elapsed">-</span></div>',
            '<div class="camus-watch-row"><span class="label">PDF 状态</span>',
            '  <span class="value" id="camus-watch-pdf-state">-</span></div>',
            '<div class="camus-watch-actions">',
            '  <button type="button" id="camus-watch-build" class="primary">立即构建</button>',
            '  <button type="button" id="camus-watch-pdf">立即重建 PDF</button>',
            "</div>",
            '<div class="camus-watch-actions">',
            '  <button type="button" id="camus-watch-view" disabled>查看 PDF</button>',
            "</div>",
            '<div class="camus-watch-hint" id="camus-watch-hint"></div>'
        ].join("");

        (document.body || document.documentElement).appendChild(ball);
        (document.body || document.documentElement).appendChild(panel);

        ball.addEventListener("click", function () {
            state.opened = !state.opened;
            panel.hidden = !state.opened;
        });

        el("camus-watch-build").addEventListener("click", function () {
            var button = el("camus-watch-build");
            button.disabled = true;
            button.textContent = "构建中…";
            state.building = true;
            request("POST", "/__camus/build", function () {
                // 状态由轮询更新，构建完成后按钮会自动恢复
            });
        });

        el("camus-watch-pdf").addEventListener("click", function () {
            var button = el("camus-watch-pdf");
            button.disabled = true;
            button.textContent = "PDF 构建中…";
            request("POST", "/__camus/pdf", function () {
                // 状态由轮询更新
            });
        });

        el("camus-watch-view").addEventListener("click", function () {
            request("POST", "/__camus/pdf/view", function (data) {
                if (!data || !data.ok || !data.url) {
                    setHint("PDF 暂不可用，请先重新构建 PDF");
                    return;
                }

                window.open(data.url, "_blank");
            });
        });
    }

    function setHint(text) {
        var hint = el("camus-watch-hint");
        if (hint) {
            hint.textContent = text || "";
        }
    }

    var PDF_STATE_TEXT = {
        idle: "空闲",
        running: "构建中",
        done: "已完成",
        failed: "失败"
    };

    function render(status) {
        state.status = status;
        state.connected = true;

        var html = status.html || {};
        var pdf = status.pdf || {};

        var version = el("camus-watch-version");
        if (version) {
            version.textContent = status.version ? "v" + status.version : "";
        }

        var htmlTime = el("camus-watch-html-time");
        if (htmlTime) {
            htmlTime.textContent = formatTime(html.time);
        }

        var htmlElapsed = el("camus-watch-html-elapsed");
        if (htmlElapsed) {
            htmlElapsed.textContent = formatSeconds(html.elapsed);
        }

        var articles = el("camus-watch-articles");
        if (articles) {
            var count = html.articles || 0;
            articles.textContent = count + " 篇 · " + formatBytes(html.bytes);
        }

        var pdfTime = el("camus-watch-pdf-time");
        if (pdfTime) {
            pdfTime.textContent = formatTime(pdf.time);
        }

        var pdfElapsed = el("camus-watch-pdf-elapsed");
        if (pdfElapsed) {
            pdfElapsed.textContent = formatSeconds(pdf.elapsed);
        }

        var pdfState = el("camus-watch-pdf-state");
        if (pdfState) {
            var text = PDF_STATE_TEXT[pdf.state] || pdf.state || "空闲";
            if (pdf.state === "done" && pdf.pages) {
                text += " · " + pdf.pages + " 页 · " + (pdf.articles || 0) + " 篇";
            }

            pdfState.textContent = text;
        }

        var buildButton = el("camus-watch-build");
        if (buildButton) {
            if (state.building) {
                buildButton.disabled = true;
                buildButton.textContent = "构建中…";
            } else {
                buildButton.disabled = false;
                buildButton.textContent = "立即构建";
            }
        }

        var pdfButton = el("camus-watch-pdf");
        if (pdfButton) {
            if (pdf.state === "running") {
                pdfButton.disabled = true;
                pdfButton.textContent = "PDF 构建中…";
            } else {
                pdfButton.disabled = false;
                pdfButton.textContent = "立即重建 PDF";
            }
        }

        var viewButton = el("camus-watch-view");
        if (viewButton) {
            viewButton.disabled = pdf.state !== "done";
        }

        if (pdf.state === "failed" && pdf.error) {
            setHint("PDF 构建失败：" + pdf.error);
        } else if (pdf.state === "done" && pdf.file) {
            setHint("PDF 文件：" + pdf.file);
        }
    }

    function renderOffline() {
        state.connected = false;

        var hint = el("camus-watch-hint");
        if (hint) {
            hint.textContent = "未连接到监听服务";
        }
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
        request("GET", "/__camus/status", function (status) {
            if (!status) {
                renderOffline();
                return;
            }

            var htmlSeq = (status.html && status.html.seq) || 0;
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

        // 刷新后恢复滚动位置
        window.addEventListener("load", function () {
            var offset = 0;
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
