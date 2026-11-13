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

    function setStatus(text) {
        status.textContent = text;
    }

    function loadIndex() {
        var url = window.CAMUS_SEARCH_URL || "/search.gz";
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
                    if (fields.length < 3) {
                        return;
                    }
                    var record = {
                        title: fields[0],
                        url: fields[1],
                        content: fields.slice(2).join("\t")
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

        results.forEach(function (record) {
            var item = document.createElement("li");
            item.className = "search-result";

            var link = document.createElement("a");
            link.href = record.url;
            link.textContent = record.title;

            var meta = document.createElement("span");
            meta.className = "search-result-url";
            meta.textContent = record.url;

            item.appendChild(link);
            item.appendChild(meta);
            list.appendChild(item);
        });

        if (!results.length) {
            var empty = document.createElement("li");
            empty.className = "search-result-empty";
            empty.textContent = "暂无搜索结果";
            list.appendChild(empty);
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
            list.textContent = "";
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
                list.textContent = "";
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

    if (form) {
        form.addEventListener("submit", function (event) {
            event.preventDefault();
            search();
        });
    }

    input.addEventListener("input", function () {
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
            search();
        });
    }

    loadIndex();
})();
