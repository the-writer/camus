(function () {
    "use strict";

    var XOR_KEY = 0x5a;
    var MAX_RESULTS = 100;

    var input = document.getElementById("search-input");
    var form = document.getElementById("search-form");
    var regexBtn = document.getElementById("search-regex");
    var status = document.getElementById("search-status");
    var list = document.getElementById("search-results");

    if (!input || !status || !list) {
        return;
    }

    var records = [];
    var regexMode = false;
    var timer = null;
    var lastResults = null;
    var lastTotal = 0;

    function setStatus(text) {
        status.textContent = text;
    }

    function initialQuery() {
        try {
            return new URLSearchParams(window.location.search).get("q") || "";
        } catch (error) {
            return "";
        }
    }

    function initialRegexMode() {
        try {
            return new URLSearchParams(window.location.search).get("re") === "1";
        } catch (error) {
            return false;
        }
    }

    function syncUrl(query) {
        if (!window.history || !window.history.replaceState) {
            return;
        }

        try {
            var url = new URL(window.location.href);
            if (query) {
                url.searchParams.set("q", query);
            } else {
                url.searchParams.delete("q");
            }
            if (regexMode) {
                url.searchParams.set("re", "1");
            } else {
                url.searchParams.delete("re");
            }
            window.history.replaceState(null, "", url.toString());
        } catch (error) {
        }
    }

    function chapterIndex(url) {
        var index = window.CAMUS_CHAPTER_INDEX;
        if (!index || typeof index.enabled !== "function" || !index.enabled()) {
            return 0;
        }
        return index.get(url) || 0;
    }

    function renderEmpty(text) {
        lastResults = null;
        lastTotal = 0;
        list.textContent = "";

        var empty = document.createElement("li");
        empty.className = "search-result-empty";
        empty.textContent = text;
        list.appendChild(empty);
    }

    function loadIndex() {
        var url = window.CAMUS_SEARCH_URL;
        if (!url) {
            setStatus("搜索索引地址缺失");
            return;
        }
        setStatus("正在加载搜索索引...");

        fetch(url, { cache: "no-cache" })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("status=" + response.status);
                }
                return response.arrayBuffer();
            })
            .then(function (buffer) {
                var bytes = new Uint8Array(buffer);
                for (var i = 0; i < bytes.length; i++) {
                    bytes[i] ^= XOR_KEY;
                }

                if (!window.DecompressionStream) {
                    throw new Error("DecompressionStream not supported");
                }

                var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
                return new Response(stream).text();
            })
            .then(function (text) {
                records = [];
                text.split("\n").forEach(function (line) {
                    if (!line) {
                        return;
                    }
                    var fields = line.split("\t");
                    if (fields.length < 5) {
                        return;
                    }
                    var record = {
                        title: fields[0],
                        url: fields[1],
                        time: fields[2],
                        tags: fields[3] ? fields[3].split(",").filter(Boolean) : [],
                        content: fields.slice(4).join("\t")
                    };
                    record.haystack = (record.title + "\n" + record.content).toLowerCase();
                    records.push(record);
                });
                setStatus("");
                search();
            })
            .catch(function (error) {
                setStatus("搜索索引加载失败：" + error.message);
            });
    }

    function renderResults(results, total) {
        list.textContent = "";

        lastResults = results;
        lastTotal = total;

        results.forEach(function (record) {
            var item = document.createElement("li");
            item.className = "search-result";

            var number = chapterIndex(record.url);
            var link = document.createElement("a");
            link.href = record.url;
            link.textContent = number ? number + ". " + record.title : record.title;

            item.appendChild(link);

            var metaParts = [];
            if (record.time) {
                metaParts.push(record.time);
            }
            if (record.tags && record.tags.length) {
                metaParts.push(record.tags.join(" · "));
            }
            if (metaParts.length) {
                var meta = document.createElement("span");
                meta.className = "search-result-meta";
                meta.textContent = metaParts.join(" · ");
                item.appendChild(meta);
            }

            list.appendChild(item);
        });

        if (!results.length) {
            renderEmpty("暂无搜索结果");
            setStatus("");
        } else if (total > results.length) {
            setStatus("找到 " + total + " 条，仅显示前 " + results.length + " 条");
        } else {
            setStatus("找到 " + total + " 条");
        }
    }

    function search() {
        var query = input.value.trim();
        if (!query) {
            renderEmpty("输入关键词开始搜索");
            setStatus("");
            return;
        }

        if (!records.length) {
            return;
        }

        var matcher;
        if (regexMode) {
            try {
                matcher = new RegExp(query, "i");
            } catch (error) {
                renderEmpty("请输入有效的正则表达式");
                setStatus("正则表达式无效：" + error.message);
                return;
            }
        } else {
            var needle = query.toLowerCase();
            matcher = {
                test: function (text) {
                    return text.indexOf(needle) !== -1;
                }
            };
        }

        var results = [];
        var total = 0;
        for (var i = 0; i < records.length; i++) {
            var record = records[i];
            var matched = regexMode
                ? matcher.test(record.title + "\n" + record.content)
                : matcher.test(record.haystack);
            if (!matched) {
                continue;
            }

            total++;
            if (results.length < MAX_RESULTS) {
                results.push(record);
            }
        }

        renderResults(results, total);
    }

    input.value = initialQuery();
    regexMode = initialRegexMode();

    if (regexBtn && regexMode) {
        regexBtn.classList.add("is-active");
        regexBtn.setAttribute("aria-pressed", "true");
    }

    if (form) {
        form.addEventListener("submit", function (event) {
            event.preventDefault();
            syncUrl(input.value.trim());
            search();
        });
    }

    input.addEventListener("input", function () {
        syncUrl(input.value.trim());

        if (timer) {
            window.clearTimeout(timer);
        }
        timer = window.setTimeout(search, 120);
    });

    if (regexBtn) {
        regexBtn.addEventListener("click", function () {
            regexMode = !regexMode;
            regexBtn.classList.toggle("is-active", regexMode);
            regexBtn.setAttribute("aria-pressed", regexMode ? "true" : "false");
            syncUrl(input.value.trim());
            search();
        });
    }

    document.addEventListener("tomato-index-toggle", function () {
        if (lastResults) {
            renderResults(lastResults, lastTotal);
        }
    });

    loadIndex();
})();
