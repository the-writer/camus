#pragma once

#include <atomic>
#include <cstdint>
#include <mutex>
#include <string>
#include <thread>

#include "catalog.h"
#include "httplib.h"
#include "inja/inja.hpp"
#include "yaml_config.h"

namespace camus
{
	struct cmdline {
		// 初始工作目录
		std::filesystem::path workdir;
		// 空转
		bool dryrun;
		// 监听模式：忽略 public_url，避免生成外网绝对地址
		bool watch;
		// 配合 --check：自动补全缺失的 Front Matter 字段与 SUMMARY.md
		bool fix = false;
	};

	struct article_stats {
		uint16_t articles;
		uint32_t words;
		uint32_t read_mins;
		time_t min_time;
		time_t max_time;

		std::set<std::string> tags;

		NLOHMANN_DEFINE_TYPE_INTRUSIVE(article_stats, articles, words, read_mins, min_time, max_time, tags);
	};

	// 同层排序配置：组顺序（文件 / 目录优先级）与可选的二次时间排序。
	// html.sort 与 pdf.sort 使用完全相同的比较逻辑：组顺序 → 时间方向 → 相对路径字典序兜底。
	struct sort_spec {
		config::pdf_sort_mode group = config::PDF_SORT_FILE_FIRST;
		bool has_time = false;
		bool time_desc = false;
	};

	// 监听控制面板展示的构建状态（由 writer 更新，经 /__camus/status 输出）。
	struct watch_status {
		// HTML 构建：每次完成递增 seq，前端据此判断需要刷新页面
		uint64_t html_seq = 0;
		time_t html_time = 0;
		double html_elapsed = 0;
		size_t html_files = 0;
		size_t html_bytes = 0;
		size_t html_articles = 0;

		// PDF 构建状态
		enum pdf_state : int { PDF_IDLE = 0, PDF_RUNNING = 1, PDF_DONE = 2, PDF_FAILED = 3 };

		uint64_t pdf_seq = 0;
		int pdf_status = PDF_IDLE;
		time_t pdf_time = 0;
		double pdf_elapsed = 0;
		size_t pdf_articles = 0;
		int pdf_pages = 0;
		// 生成的 PDF 文件名（用户可通过 pdf.build 的 --print-to-pdf 自定义）
		std::string pdf_file;
		// 生成的 PDF 完整路径
		std::string pdf_path;
		std::string pdf_error;
	};

	// PDF 构建上下文：后台线程使用的一份状态快照，
	// 避免 PDF 构建与主线程的 HTML 构建共享可变状态。
	struct pdf_context {
		// 配置快照（camus.yaml 解析结果）
		config::camus_conf conf;
		// 模板数据（配置的公开 JSON）
		nlohmann::json public_json;
		// 目录树快照
		catalog::catalog_node catalog;
		// 命令行参数
		cmdline cmd;
		// 独立模板引擎（回调只依赖快照，不引用主线程状态）
		inja::Environment inja;
		// 远程封面的本地副本（为空表示没有封面）
		std::filesystem::path cover_path;
	};

	// PDF 构建结果
	struct pdf_result {
		bool success = false;
		// 生成的 PDF 路径
		std::filesystem::path path;
		// 参与构建的文章数
		size_t articles = 0;
		// PDF 总页数
		int pages = 0;
		// 构建耗时（秒）
		double elapsed = 0;
		// 失败原因（成功时为空）
		std::string error;
	};

	class writer
	{
		// 停止服务
		std::atomic<bool> quit_ = false;
		// 服务器
		httplib::Server watch_server_;
		// 主配置文件
		config::yaml_config conf_;
		// 相对于源文件目录的目录树
		catalog::catalog_node catalog_{};
		// CMD 参数
		cmdline cmd_;
		// 模板引擎
		inja::Environment inja_;
		// 待写入文件缓存
		std::map<std::filesystem::path, std::string> pending_writes_;
		// 干跑模式下记录待写文件（不落盘），供 --check 输出渲染产物清单
		bool capture_writes_ = false;
		// 启动时自动检测更新只执行一次（watch 重建时不重复）
		bool auto_update_checked_ = false;
		// 远程 PDF 封面下载到本地的临时路径（构建结束后清理）
		std::filesystem::path remote_cover_path_;
		// 远程 HTML 图片（logo）下载到本地的临时路径（构建结束后清理）
		std::filesystem::path remote_logo_path_;
		// HTML 同层排序（html.sort，默认目录优先 + 时间倒序）
		sort_spec html_sort_spec_{config::PDF_SORT_DIR_FIRST, true, true};

		// HTML 构建互斥：串行化监听循环构建与控制面板触发的构建
		std::mutex build_mutex_;
		// PDF 构建线程（后台执行）与状态
		std::thread pdf_thread_;
		std::mutex pdf_thread_mutex_;
		std::atomic<bool> pdf_running_{false};
		// 构建状态快照（供控制面板读取）
		std::mutex status_mutex_;
		watch_status status_;
		// 控制面板请求：立即构建 / 立即重建 PDF
		std::atomic<bool> manual_build_requested_{false};
		std::atomic<bool> manual_pdf_requested_{false};
		// 监听模式：PDF 只在首次构建时自动生成，之后由控制面板手动触发
		bool pdf_auto_started_ = false;

		void add_write(const std::filesystem::path &path, std::string_view content);
		void flush_writes();
		void run_only_live(const std::function<void()> &func) const;
		// 监听模式注入控制面板脚本（watch.js）
		void inject_watch_script(std::string &html) const;
		// 确保输出目录存在 watch.js（资源缺失时从数据目录补齐）
		void ensure_watch_script() const;

		// ── PDF 构建 ────────────────────────────────
		// 在后台线程构建 PDF；已在构建时直接返回
		void start_pdf_build();
		// 等待后台 PDF 构建结束
		void wait_pdf_build();
		// 生成 PDF 构建上下文快照（读取主线程状态，需持有 build_mutex_）
		pdf_context make_pdf_snapshot();

		// ── 监听控制面板 ────────────────────────────
		// 注册 /__camus/* 接口
		void register_watch_api();
		// 输出构建状态 JSON
		nlohmann::json watch_status_json();
		// 复制最新 PDF 到 HTML 输出目录，返回可访问的相对 URL
		std::string export_pdf_to_html();

		// ── emit_article 子阶段 ────────────────────────
		void resolve_directory_routes();
		void parse_article_frontmatter();
		void prepare_output_dir() const;
		std::vector<catalog::catalog_node *> collect_articles();
		// filename_case 为 uuid / sha1 / seq 时，为文章与目录页分配扁平化输出路径。
		void assign_output_names(const std::vector<catalog::catalog_node *> &articles);
		void fill_article_nav(std::vector<catalog::catalog_node *> &articles) const;
		std::vector<nlohmann::json> build_toc_items() const;
		// 扁平章节列表（按源路径升序，含分卷信息），current 统一为 false。
		std::vector<nlohmann::json> build_chapter_items();
		void accumulate_article_stats(
			const catalog::catalog_node &node, size_t word_count, uint16_t read_mins,
			std::unordered_map<std::string, article_stats> &stats
		);
		void render_single_article(
			catalog::catalog_node &node, const std::vector<nlohmann::json> &toc_items,
			std::unordered_map<std::string, article_stats> &stats, const std::filesystem::path &out_dir
		);
		void render_stats_page(
			const std::unordered_map<std::string, article_stats> &stats, const std::vector<nlohmann::json> &toc_items
		);
		void finalize_directory_properties();
		void emit_article();
		void emit_friends();
		void emit_search();
		void emit_toc();
		void emit_sitemap();
		void emit_feed();
		void emit_assets();
		// html.pwa=true 时生成各主题的 PWA manifest（name/icon 取自站点配置）。
		void emit_pwa();
		void prepare_remote_cover();
		// 需要从资源目录中移除的文件（manifest 由 emit_pwa 生成；PWA 关闭时移除 sw.js 与图标）
		std::vector<std::string> removed_asset_names() const;

	  public:
		explicit writer(const cmdline &cmd);

		int check();
		void watch();
		int build();
	};
} // namespace camus
