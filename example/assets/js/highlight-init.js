(function () {
    "use strict";

    // highlight.js 把 language-shell 当作 "Shell Session"（控制台交互），
    // 这里将常见的脚本写法 ```shell 统一按 bash 语法高亮。
    document.querySelectorAll("pre code.language-shell").forEach(function (code) {
        code.classList.remove("language-shell");
        code.classList.add("language-bash");
    });

    if (window.hljs) {
        window.hljs.highlightAll();
    }
})();
