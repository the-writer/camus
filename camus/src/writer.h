#pragma once

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
		// 启动时自动检测更新只执行一次（watch 重建时不重复）
		bool auto_update_checked_ = false;
		// 远程 PDF 封面下载到本地的临时路径（构建结束后清理）
		std::filesystem::path remote_cover_path_;
		// 远程 HTML 图片（logo）下载到本地的临时路径（构建结束后清理）
		std::filesystem::path remote_logo_path_;
		// HTML 同层排序（html.sort，默认目录优先 + 时间倒序）
		sort_spec html_sort_spec_{config::PDF_SORT_DIR_FIRST, true, true};

		void add_write(const std::filesystem::path &path, std::string_view content);
		void flush_writes();
		void run_only_live(const std::function<void()> &func) const;

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
		void emit_pdf();

	  public:
		explicit writer(const cmdline &cmd);

		int check();
		void watch();
		int build();
	};
} // namespace camus
