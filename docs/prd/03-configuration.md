# 3. 配置系统

配置实现：`camus/src/yaml_config.h`、`camus/src/yaml_config.cpp`。主配置文件名固定为 `camus.yaml`（`config.h.in` 的 `CAMUS_CONF_NAME`），目录搬运与文本替换规则写在 `camus.yaml` 的 `build` 段（`build.transfer` / `build.env`），目录元信息来自各目录下的 `SUMMARY.md`（`CAMUS_SUMMARY_NAME`），默认主题/资源从平台数据目录读取（见 §8）。

## 3.1 配置文件与位置

| 文件/目录 | 位置 | 作用 | 是否持久 |
|---|---|---|---|
| `camus.yaml` | 运行时当前工作目录 | 主配置 | 是 |
| `SUMMARY.md` | 源目录及任意子目录 | 目录页元信息（`title`/`subtitle`/`description`/`cover`/`logo`），不参与文章渲染 | 是 |
| `theme/{name}/*.html` | 工作目录 | 本地主题覆盖 | 是 |
| `theme/pdf/{page.html,style.css,fonts.css}` | 工作目录 | 本地 PDF 模板/样式覆盖 | 是 |
| `assets/{css/style.css,js/camus.js,fonts/}` | 工作目录 | 本地静态资源覆盖；`-c` 最小复制目标 | 是 |
| `.camus/` | 工作目录 | `-c --full` 复制的完整资源（主题、PDF 模板、资源与示例模板） | 是 |
| `<数据目录>/` | macOS `~/Library/Application Support/Camus`；Linux `/var/lib/camus` | 默认主题、静态资源与示例模板（由安装包写入） | 是 |

- `build()` 先 `chdir(workdir)` 再 `reload()`，因此**构建时**配置从 `-w` 指定的工作目录读取。
- `check()` 同样先切到 `workdir` 再 `reload()`，因此 `-w <dir> --check` 读取的是该目录下的配置。
- 每次 `reload()` 重新读取 `camus.yaml` 并扫描各目录的 `SUMMARY.md`；热重载（watch）依赖此行为。

## 3.2 解析总则

- 根节点必须是映射，顶层直接包含 `sitemap`、`filename_case`、`auto_check_update`、`public_url`、`theme`、`pdf`、`html`、`friends` 等配置项，否则 `error::panic("config file parse failed")`（退出 127）。不再接受 `render` 嵌套段；出现时打印 WARN 并忽略其内容。
- `SUMMARY.md` 在目录扫描时跳过，不进入文章树。
- 字符串值会做 `trim_space`；`SUMMARY.md` 中 `title`/`subtitle`/`description` 的换行符替换为 `<br />`；`cover` / `logo` 只做 `trim_space`，保留原始路径。
- 源目录、资源目录与输出目录不再可配置：
  - 源目录固定按 `src` → `posts` 顺序探测，存在即使用，否则回退 `src`（随后若不存在则报错）；
  - 本地资源目录固定为 `./assets`，不存在时回退 `.camus/assets`，再回退数据目录的 `assets/`；
  - HTML 输出固定为 `./dist/html`，PDF 输出固定为 `./dist/pdf`。
- `html_engine` 固定为 `default`，`markdown_engine` 固定为 `cmark-gfm`，均不从配置读取。
- 路径在解析后转为绝对路径供内部使用；模板 JSON 中保留解析后的值（见 §3.7）。
- **环境变量注入**：所有标量配置项都可用环境变量覆盖，变量名为 `CAMUS_` + 配置路径（大写、层级与非法字符转为 `_`），例如 `pdf.page.size` → `CAMUS_PDF_PAGE_SIZE`、`pdf.engine` → `CAMUS_PDF_ENGINE`、`pdf.sort` → `CAMUS_PDF_SORT`、`html.copy_pdf` → `CAMUS_HTML_COPY_PDF`、`html.download_cover` → `CAMUS_HTML_DOWNLOAD_COVER`、`theme` → `CAMUS_THEME`。环境变量优先于 `camus.yaml` 中的值；即使配置文件中没有该键，也可注入已知标量项（`sitemap`、`filename_case`、`auto_check_update`、`public_url`、`theme`、`pdf.engine`、`pdf.page.size`、`pdf.page.margin`、`pdf.page.font_size`、`pdf.sort`、`html.copy_pdf`、`html.download_cover`）。为兼容旧配置，仍接受 `CAMUS_PDF_ENGINE`（对应旧 `pdf_engine`，与 `pdf.engine` 同名）与 `CAMUS_PDF_OPTIONS_PAGE_SIZE` / `CAMUS_PDF_OPTIONS_PAGE_MARGIN`（旧 `pdf_options.page.*`），新键优先。数组 / 列表字段（`html.build`、`pdf.build`、`friends`、`build` / `transfer` 及其元素字段）**不支持**注入。`-W` 监听模式仍会清空 `public_url`。

## 3.3 顶层配置字段

| 字段 | 类型 | 默认/必填 | 说明 | 代码位置 |
|---|---|---|---|---|
| `sitemap` | bool | 默认 `true` | 是否输出 `sitemap.xml` | `yaml_config.cpp` |
| `filename_case` | 字符串 | 默认 `keep` | `uuid` 时文章 `display_name` 生成 UUID 并输出到 `/s/<uuid>.html` 风格短链 | `yaml_config.cpp` |
| `auto_check_update` | 字符串 | 默认 `auto` | 构建启动时的更新策略：`auto` 下载并安装最新 release、`check-only` 仅检测并输出链接、`disable` 跳过；动作在后台线程（`std::thread`）中异步执行，不阻塞构建，退出时 join 并在未完成时打印等待提示；兼容旧布尔值 `true`/`false`（等价 `auto`/`disable`），非法值打印 WARN 并保持默认；`--dryrun` 下跳过；`-W` 多次重建只执行一次 | `yaml_config.cpp`、`writer.cpp`、`update.cpp` |
| `public_url` | 字符串 | 可选 | 站点对外访问地址，自动拆解为下方三项；可由 `CAMUS_PUBLIC_URL` 注入（优先级高于配置文件）；`-W` 监听模式下忽略（按空处理） | `yaml_config.cpp` `parse_public_url()` |
| `protocol` | 字符串（只读派生） | 默认 `https://` | `public_url` 的协议部分，含 `://` | 同上 |
| `domain_name` | 字符串（只读派生） | 空 | `public_url` 的域名部分（含端口，去除空格） | 同上 |
| `path_prefix` | 字符串（只读派生） | 空 | `public_url` 的路径部分，以 `/` 开头且不带尾斜杠 | 同上 |
| `theme` | 字符串 | 默认 `default` | 主题目录名 | `yaml_config.cpp` |
| `html` | 对象 | 可选 | HTML 输出配置：`build`（cmark-gfm 选项名数组，见 §3.4）、`copy_pdf`（bool，默认 `false`，为 `true` 时把最终 PDF 复制到 HTML 输出根目录）、`download_cover`（bool，默认 `false`，仅控制 HTML：为 `true` 时 HTML 图片（`logo`，未设置时回退 `cover`）使用下载到本地的文件；PDF 不受该项影响，始终在构建前强制下载远程 `cover`，下载失败中止构建） | `yaml_config.cpp`、`writer.cpp` |
| `markdown` | 字符串数组 | 可选（已弃用） | 兼容旧配置：等价于 `html.build`；存在 `html.build` 时被忽略。加载时输出 WARN 提示迁移 | `yaml_config.cpp` |
| `markdown_options` | 旧键 | 可选（已弃用） | 兼容旧配置：等价于 `html.build`；存在 `html` 或顶层 `markdown` 时被忽略。加载时输出 WARN 提示迁移 | `yaml_config.cpp` |
| `pdf` | 对象 | 可选 | PDF 配置：`engine`（字符串）、`build`（字符串数组）、`page`（`size` / `margin` / `font_size` / `meta`）、`toc.index`（默认 `false`）、`sort`（`file_first` / `dir_first` / `mixed`，默认 `file_first`），见 §3.3.1 | `yaml_config.cpp` |
| `pdf_engine` / `pdf_options` | 旧键 | 可选（已弃用） | 兼容旧配置：分别等价于 `pdf.engine` 与 `pdf.build` / `pdf.page`；存在顶层 `pdf` 时旧键被忽略。加载时输出 WARN 提示迁移 | `yaml_config.cpp` |

`public_url` 拆解规则（`parse_public_url()`）：

| 输入 | `protocol` | `domain_name` | `path_prefix` | `url`（归一化） |
|---|---|---|---|---|
| `https://the-writer.github.io/camus/` | `https://` | `the-writer.github.io` | `/camus` | `https://the-writer.github.io/camus` |
| `the-writer.github.io/camus` | `https://` | `the-writer.github.io` | `/camus` | `https://the-writer.github.io/camus` |
| `https://the-writer.github.io/` | `https://` | `the-writer.github.io` | 空 | `https://the-writer.github.io` |
| `http://localhost:8080/blog/` | `http://` | `localhost:8080` | `/blog` | `http://localhost:8080/blog` |

`public_url_conf::full_prefix()` = `protocol + domain_name + path_prefix`，用于绝对链接与 sitemap。

`public_url` 的取值优先级：环境变量 `CAMUS_PUBLIC_URL` > 配置文件非空值 > 空。环境变量用于 CI 等场景自动注入部署前缀（如 GitHub Pages 项目页 `https://<owner>.github.io/<repo>`），无需修改 `camus.yaml`。

`-W` 监听模式由本地服务访问，`public_url` 在解析后被清空（`path_prefix` 随之为空），构建产物使用根相对路径。

### 3.3.1 PDF 引擎、参数与排序

`pdf.engine` 非空且不为 `disable` 时构建末尾执行 PDF 生成（见 §6.10）；`disable` 不区分大小写并忽略首尾空格：

| 配置值 | macOS 解析 | Linux 解析 |
|---|---|---|
| `chromium` / `chrome` / `google-chrome` | `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`，其次 Chromium | `google-chrome`、`google-chrome-stable`、`chromium`、`chromium-browser`（按 PATH 查找） |
| `edge` / `msedge` / `microsoft-edge` | `/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge` | `microsoft-edge`、`microsoft-edge-stable`、`microsoft-edge-beta`（按 PATH 查找） |
| 含 `/` 的路径 | 直接作为可执行文件路径 | 同左 |

- `pdf.engine: disable` 表示显式禁用 PDF：不解析引擎、不产生 `dist/pdf` 内容，也不输出告警。
- 引擎找不到时输出 WARN 并跳过 PDF，不影响 HTML 构建。
- `pdf.build` 中的字符串原样作为启动参数；其中以 `--print-to-pdf` 开头的项只取第一个并统一重写，支持 `{{dest_dir}}` 占位符（占位符代表 PDF 输出目录 `./dist/pdf`）：
  - `--print-to-pdf=`：默认输出 `<dest_dir>/index.pdf`；
  - `--print-to-pdf={{dest_dir}}/docs/book.pdf`：输出到 `<dest_dir>/docs/book.pdf`；
  - `--print-to-pdf=book.pdf`：相对路径按 `<dest_dir>/book.pdf` 解析。
- `pdf.page.size` 与 `pdf.page.margin` 会生成 `@page { size: ...; margin: ...; }` 追加到打印样式末尾，作用于未命名页；默认 `A4` / `20mm 18mm`。同时追加 `@page cover { size: ...; margin: 0; }`，使封面命名页也使用配置的尺寸（边距保持 0）；`front` 命名页继承全局尺寸。取值同时作为 `pdf.page.size` / `pdf.page.margin` 提供给模板（见 §5.10）。
- `pdf.page.font_size` 为 PDF 正文字号，默认 `10pt`，**仅支持 `pt` 单位**（形如 `10pt` / `10.5pt`）；非法或非 pt 值输出 WARN 并回退默认。该值写入根 CSS 变量 `--pdf-font-size`，模板中的标题、代码、表格、页脚等字号均基于该变量按比例计算（见 §5.10）。
- `pdf.page.meta` 为字符串数组，可选值 `words`（字数）、`read-times`（阅读时长）、`created-time`（创建日期）；可任意组合或为空（不显示）。每一项会在 PDF 文章标题（`## 标题`）下自动插入一行 `pdf-article__meta` 信息，使用 ` · ` 分隔；空数组 / 未配置时不插入。`read-times` 显示整数分钟，不足 1 分钟时显示「小于1分钟」（英文语种为 `<1 min`），不输出小数。
- `pdf.toc.index` 默认 `false`；为 `true` 时目录页与书签大纲中的文章标题显示为 `1. 标题`、`2. 标题` 的序号格式，正文内标题不自动加序号。
- `pdf.sort` 控制 PDF 中同一层内文件与子目录的排列（同时影响正文、目录页与书签大纲），默认 `file_first`：

  | 取值 | 效果 |
  |---|---|
  | `file_first` | 先文件、后子目录；两组内部按相对路径字符串字典序升序 |
  | `dir_first` | 先子目录、后文件；两组内部按相对路径字符串字典序升序 |
  | `mixed` | 不区分文件 / 目录，完全按相对路径字符串字典序升序 |

  取值不区分大小写并忽略首尾空格；未知值输出 WARN 并回退 `file_first`。该顺序仅作用于 PDF，与 HTML 站点排序（目录优先、按 `write_time` 降序）互不影响。
- 未显式提供 `--headless` 时自动追加；始终追加临时 `--user-data-dir`（构建结束删除），避免污染用户浏览器配置。
- PDF 中间 HTML 使用 `theme/pdf/page.html` 模板、`theme/pdf/style.css` 样式与 `theme/pdf/fonts.css` 字体样式；字体文件放在站点 `assets/fonts/`，构建时复制到 `dist/pdf/assets/fonts/`。该目录不通过 `camus.yaml` 配置，查找顺序与可用模板变量见 §5.10、§8.3。

### 3.4 html.build 映射

Markdown 引擎固定为 `cmark-gfm`，解析器始终启用 `table` / `strikethrough` / `autolink` / `tasklist` 常用扩展；顶层 `html.build` 始终按本表解析；未知名会被收集用于展示但不产生标志位。`DEFAULT` 对应 `CMARK_OPT_DEFAULT`；Debug/RelWithDebInfo 构建默认追加 `SOURCEPOS`。旧键 `markdown` / `markdown_options` 仍被接受（输出弃用 WARN；`markdown` 在存在 `html.build` 时忽略，`markdown_options` 在存在 `html` 或 `markdown` 时忽略）。

| 配置名 | cmark 标志 |
|---|---|
| `SOURCEPOS` | `CMARK_OPT_SOURCEPOS` |
| `HARDBREAKS` | `CMARK_OPT_HARDBREAKS` |
| `UNSAFE` | `CMARK_OPT_UNSAFE` |
| `NOBREAKS` | `CMARK_OPT_NOBREAKS` |
| `NORMALIZE` | `CMARK_OPT_NORMALIZE` |
| `VALIDATE_UTF8` | `CMARK_OPT_VALIDATE_UTF8` |
| `SMART` | `CMARK_OPT_SMART` |
| `GITHUB_PRE_LANG` | `CMARK_OPT_GITHUB_PRE_LANG` |
| `LIBERAL_HTML_TAG` | `CMARK_OPT_LIBERAL_HTML_TAG` |
| `FOOTNOTES` | `CMARK_OPT_FOOTNOTES` |
| `STRIKETHROUGH_DOUBLE_TILDE` | `CMARK_OPT_STRIKETHROUGH_DOUBLE_TILDE` |
| `TABLE_PREFER_STYLE_ATTRIBUTES` | `CMARK_OPT_TABLE_PREFER_STYLE_ATTRIBUTES` |
| `FULL_INFO_STRING` | `CMARK_OPT_FULL_INFO_STRING` |

顶层配置 `html.build` 在模板 JSON 的 `camus.render.options` 会显示为 `"{数值}({名称1,名称2,...})"`（`yaml_config.cpp`），同时以 `camus.html.build` / `camus.html.copy_pdf` / `camus.html.download_cover` 暴露。

## 3.5 `build`（目录搬运 / 文本替换）与 `SUMMARY.md`（目录元信息）

### 3.5.1 `SUMMARY.md` 元信息

构建时会递归扫描源目录（含根目录）中的 `SUMMARY.md`，为对应目录生成 `route_conf`（序列化字段：`path`、`title`、`subtitle`、`description`、`cover`、`logo`、`transfers`；同时输出兼容旧模板的 `cover_image` 别名）。`SUMMARY.md` 本身不会作为文章渲染。

| 来源 | 说明 |
|---|---|
| Front Matter `title` | 目录显示名 / 页面标题 |
| Front Matter `subtitle` | 目录副标题 |
| Front Matter `description` | 目录描述 |
| Front Matter `cover` | PDF 封面图片路径（仅根目录 `SUMMARY.md` 生效）；支持 `http://` / `https://` 绝对 URL：PDF 在构建开始前下载到本地（失败则中止构建，退出 127）；相对路径以 `camus.yaml` 所在目录为起点，找不到时依次回退到源目录与站点 `assets` 目录 |
| Front Matter `cover_image` | 旧键，作为 `cover` 的别名兼容；`cover` 为空时才读取 |
| Front Matter `logo` | HTML 主题图片路径；未设置时 HTML 回退使用 `cover`（从而兼容旧键 `cover_image`） |
| 正文第一个 `# 标题` | `title` 缺失时的回退值 |
| 正文剩余内容 | `description` 缺失时的回退值 |

- Front Matter 使用 YAML 映射解析（`---` 包裹），非法 YAML 会打印 WARN 并忽略该段。
- 字段会 `trim_space`，内部换行替换为 `<br />`。
- 子路由未设置的 `title` / `subtitle` / `description` 继承根路由（`source_dir/SUMMARY.md`）的对应值；`cover` / `logo` 不继承。
- 根路由 `path` 固定为 `/`；根 `SUMMARY.md` 缺失时 `site` 默认为 `{path: "/", title: "A mysterious site"}`。
- 路由列表按 `path` 排序，根路由始终排在最前，保证 `route` 输出稳定。
- `path` 中包含 `private` 段的目录会被忽略并打印 WARN。

示例（`posts/introduction/SUMMARY.md`）：

```markdown
---
title: Well-known musicals
subtitle: Optional summary
---

1. Man of la Mancha
2. Mozart!
```

### 3.5.2 `build` 段（`transfer` / `env`）

`camus.yaml` 顶层 `build` 为映射，包含 `transfer`（搬运规则序列）与 `env`（文本替换键值对）：

```yaml
build:
  transfer:
    - path: /introduction
      transfers:
        - source: .
          target: /intro/Well-known
  env:
    site_name: Camus
```

兼容旧格式：顶层 `build` 直接为序列，或顶层键 `transfer`；优先级为 `build.transfer` > 顶层 `build` 序列 > 顶层 `transfer`。

`build.transfer` 每项字段：

| 字段 | 必填 | 说明 |
|---|---|---|
| `path` | 是 | 源目录路由路径；缺失时该项被忽略并打印 WARN |
| `transfers` | 否 | 必须为序列，否则跳过 |
| `transfers[].source` | 是 | 源路径；`.` 或 `/` 表示路由自身路径，否则拼接到路由路径下 |
| `transfers[].target` | 是 | 目标输出路径（作为该目录的外部路径） |

- 根路径 `/` 的 `transfers` 无效，出现时打印 WARN 并忽略。
- 每条 transfer 的 `source`/`target` 缺失或 `target` 为空时会被忽略并打印 WARN。
- transfer 的 `source` 会预先拼成完整源路径（`source: .` → 路由自身路径，否则 `路由路径/source`），因此 `source: 子目录` 可搬运路由下的子目录；搬运会作用于该目录的所有后代。
- `transfers` 会同时挂到同 `path` 的 `SUMMARY.md` 路由上，供模板 `route` 数据使用；没有 `SUMMARY.md` 的路径仍会参与搬运匹配，但不会出现在 `route` 列表中。
- 搬运匹配使用 `filesystem::path_equal(..., clean_check=true)`。

示例（旧格式仍可用）：

```yaml
build:
  - path: /introduction
    transfers:
      - source: .
        target: /intro/Well-known
```

`build.env` 文本替换规则：

| 项 | 说明 |
|---|---|
| 类型 | 键值映射；键与值均按 YAML 标量读取，值为 `null` 时按空串处理 |
| 占位形式 | 键统一转为大写 `KEY`，读取文件时把 `$KEY`、`${KEY}`、`$ENV_KEY`、`${env.key}` / `${env.KEY}` 无条件替换为对应值 |
| 作用范围 | 所有经由 `filesystem::read_file` 读取的文本内容（文章 Markdown、`SUMMARY.md`、主题 HTML、`assets` 文本等），在解析 Markdown / inja 渲染之前完成替换 |
| 优先级 | 按占位模式长度降序执行（`${KEY}` 先于 `$KEY`），避免短键抢占长键 |
| 异常项 | 非映射的 `env` 段、非标量的键或值会打印 WARN 并跳过 |
| 默认项 | `ASSETS_CDN` 始终参与替换；未在 `build.env` 中配置时按空串处理，用于替代已移除的 `cdn_url` / `with_cdn` |
| 重载 | 每次 `reload()` 重新设置替换表；未配置 `build.env` 时仅保留默认 `ASSETS_CDN` 空串 |

示例：`env: { site_name: Camus }` 会把文件中的 `$SITE_NAME`、`${SITE_NAME}`、`$ENV_SITE_NAME`、`${env.site_name}` 替换为 `Camus`；`env: { assets_cdn: https://cdn.example.com }` 会把 `${env.ASSETS_CDN}` 替换为该地址。

## 3.6 `friends` 段

友链为序列，每项字段均以 `as<std::string>()` 读取（缺字段会抛异常）：

| 字段 | 说明 |
|---|---|
| `title` | 站点标题 |
| `desc` | 简短描述 |
| `link_url` | 跳转地址 |
| `image_url` | 头像/图片地址 |

结果注入渲染数据 `friends` 数组，用于 `friends.html`。

## 3.7 模板可用配置数据（`conf_.json()`）

模板 JSON 由 `supplement_other_vars()` 组装（`yaml_config.cpp:20-90`）：

| 顶层键 | 结构 | 说明 |
|---|---|---|
| `camus` | 对象 | 兼容保留的聚合对象：`source_dir`、`assets_dir`、`site`、`sitemap`、`filename_case`、`auto_check_update`、`public_url`、`protocol`、`domain_name`、`path_prefix`、`render`、`pdf`、`friends`；`render.options` 为选项展示串 |
| `source_dir` | 字符串 | 解析后的源目录绝对路径（`src`→`posts` 探测） |
| `assets_dir` | 字符串 | 解析后的资源目录绝对路径 |
| `sitemap` | bool | 是否输出 `sitemap.xml` |
| `filename_case` | 字符串 | 输出文件名策略（`keep` / `uuid`） |
| `public_url` | 字符串 | 归一化后的站点对外地址 |
| `protocol` | 字符串 | `public_url` 的协议部分（`https://`） |
| `domain_name` | 字符串 | `public_url` 的域名部分 |
| `path_prefix` | 字符串 | `public_url` 的路径前缀 |
| `render` | 对象 | 模板兼容聚合对象（`theme_name`、`html_engine`、`markdown_engine`）；对应配置项在 `camus.yaml` 顶层，此对象仅用于模板数据 |
| `pdf` | 对象 | PDF 配置：`engine`、`build`、`page`（`size`/`margin`/`font_size`/`meta`）、`toc`（`index`）、`sort`（序列化为 `file_first` / `dir_first` / `mixed`）；PDF 模板中的 `pdf` 会被页面数据覆盖，见 §5.10 |
| `friends` | 数组 | 友情链接 |
| `site` | 对象 | 根路由（`path/title/subtitle/description/cover/logo/transfers`；另含兼容旧模板的 `cover_image` 别名，值为 HTML 实际使用的图片） |
| `route` | 数组 | 全部路由（继承后） |
| `git` | 对象 | `repo`、`branch`、`commit_hash` |
| `build` | 对象 | 见下表 |

`camus` 聚合对象在所有配置解析完成后生成，包含最终 `site`（根路由继承后）、`friends` 以及绝对路径形式的 `source_dir` / `assets_dir`。

`build` 对象字段（来源 `yaml_config.cpp:59-90`）：

| 字段 | 说明 |
|---|---|
| `basedir` | 解析配置时的当前目录 |
| `timestamp` | 当前 Unix 时间（毫秒，字符串） |
| `time` | 本地时间 `%Y-%m-%d %H:%M:%S` |
| `build_type` | CMake 构建类型 |
| `cmake_version` | CMake 版本 |
| `cxx_standard` | C++ 标准号（23） |
| `version` | 项目版本（`PROJECT_VERSION`，以 `docs/PRD.md` 项目表 / `CMakeLists.txt` 为准） |
| `version_major` | 主版本号（`PROJECT_VERSION_MAJOR`） |
| `compiler` | 编译器版本字符串 |
| `compiler_name` | 编译器名称（`clang` / `gcc` / `msvc` / `unknown`） |
| `powered_by` | 预渲染的页脚 HTML 片段（Home / Friends / Stats / GitHub 链接、版本号与编译器名称）；`pixel` 主题会在 Friends 右侧额外加入 Search 链接 |
| `powered_by_text` | 与 `powered_by` 对应的纯文本内容（`Home / Friends / [Search / ]Stats / GitHub` + `Powered by Camus v{version} built with {compiler}`），供 `title` 等属性使用 |

示例（inja）：

```html
<a href="{{ public_url }}">Site</a>
<a href="{{ git.repo }}">{{ git.repo }}</a>
<span>{{ build.version }} / {{ git.commit_hash }}</span>
```

PDF 模板在上述配置 JSON 之外额外接收 `pdf` 对象（封面、目录、文章列表、样式原文等），字段见 §5.10。

## 3.8 持久性与重载

- 配置本身持久于磁盘；运行期不写回配置。
- `reload()` 每次全量重读 `camus.yaml` 并重新扫描 `SUMMARY.md`，先重置上一轮的 `camus_`、`routes_`、`transfers_`、`public_config_`，因此反复构建/热重载不会累积路由或友链。
- 路由/友链的新增在下次构建生效。
- `writer::check()` 与 `writer::build()` 会先把进程工作目录切到 `--workdir`，因此 `-w <dir> --check` 读取的是该目录下的配置。

## 3.9 `--check` 输出

`writer::check()` 会：

1. 将 `cmd_.dryrun` 置为 true，切到 `--workdir` 并 `reload()` 配置。
2. 在日志抑制为 ERROR 的情况下执行一次干跑构建，验证完整渲染流水线且不写文件。
3. 统计目录/文章/隐藏文章/字数，并校验资源目录、output/pdf 目录文件数保护、PDF 引擎、PDF 模板/样式/字体与 `cover`。
4. 打印精炼报告：`workdir`、`config`、`source`、`theme`、`site`、`public`、`output`、`assets`、`pdf`、`catalog`、`build` 以及按树形展示的 `Catalog`。
5. 汇总 `Issues`（error/warn），最后输出 `Result: OK` 或 `Result: FAILED`，并返回 0/1。

`--check` 与 `-D` 组合不会额外写文件。
