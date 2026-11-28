#include "install.h"

#include <algorithm>
#include <ctime>
#include <exception>
#include <filesystem>
#include <iostream>
#include <string>
#include <utility>
#include <vector>

#include <build/build.h>

#include "common/filesystem/filesystem.h"
#include "common/functions/functions.h"
#include "common/logging/logging.h"
#include "common/paths/paths.h"
#include "common/str/str.h"

namespace
{
	using camus::copy_report;
	using camus::copy_row;

	const std::vector<std::string> template_entries{"posts", "camus.yaml", ".gitignore", "Justfile"};
	const std::vector<std::filesystem::path> minimal_asset_entries{
		std::filesystem::path("css") / "style.css", std::filesystem::path("js") / "camus.js"
	};

	// 复制结果表格中的状态文案
	constexpr const char *copy_copied = "copied";
	constexpr const char *copy_overwritten = "overwritten";
	constexpr const char *copy_created = "created";
	constexpr const char *copy_kept = "kept";
	constexpr const char *copy_merged = "merged";
	constexpr const char *copy_skipped_exists = "skipped (exists)";
	constexpr const char *copy_skipped_source = "skipped (source exists)";
	constexpr const char *copy_skipped_installed = "skipped (already installed)";
	constexpr const char *copy_skipped_missing = "skipped (missing in source)";

	// AI 技能：数据目录 SKILLS/ 下的 AGENTS.md 与类型子目录安装到源目录
	// （优先已有 src，其次已有 posts，否则默认为 posts）根部：
	// <source>/AGENTS.md、<source>/.agents/<类型>/…。
	constexpr const char *skills_dir_name = "SKILLS";

	// 目录 / 文件显示名：含 '-' 且出现过数字时，取最后一个 '-' 之后的片段，去掉 01- 之类的排序前缀。
	std::string strip_order_prefix(std::string name)
	{
		if (name.find_first_of("0123456789") != std::string::npos && name.contains('-')) {
			name = strings::split(name, '-').back();
		}

		return name;
	}

	constexpr const char *private_readme = R"(# private

This directory is excluded from builds.

- Any directory named `private` is skipped when scanning sources.
- Files here are never rendered or published to the generated site or PDF.
- Use it for local drafts, notes, and private assets.
)";

	void add_copy_row(copy_report &report, std::string item, const char *result, const std::filesystem::path &target)
	{
		report.push_back(copy_row{std::move(item), result, target});
	}

	void ensure_private_dir(const std::filesystem::path &workdir, copy_report &report)
	{
		const std::filesystem::path dir = workdir / "posts" / CAMUS_PRIVATE_DIR;
		const bool existed = std::filesystem::is_directory(dir);
		std::filesystem::create_directories(dir);
		add_copy_row(report, "posts/private", existed ? copy_kept : copy_created, dir);

		const std::filesystem::path readme = dir / "README.md";
		if (!std::filesystem::exists(readme)) {
			filesystem::write_file(readme, private_readme);
			add_copy_row(report, "posts/private/README.md", copy_created, readme);
		} else {
			add_copy_row(report, "posts/private/README.md", copy_kept, readme);
		}
	}

	// preserve_source 为真（--copy）时，工作目录已存在 src/ 或 posts/ 就不再注入示例 posts。
	void scaffold_workdir(
		const std::filesystem::path &workdir, const std::filesystem::path &source_dir, const bool preserve_source,
		copy_report &report
	)
	{
		if (!workdir.empty()) {
			std::filesystem::create_directories(workdir);
		}

		const bool has_source =
			std::filesystem::is_directory(workdir / "src") || std::filesystem::is_directory(workdir / "posts");
		const bool skip_posts = preserve_source && has_source;

		for (const auto &name : template_entries) {
			const std::filesystem::path source = source_dir / name;
			const std::filesystem::path target = workdir / name;

			if (skip_posts && name == "posts") {
				add_copy_row(report, name, copy_skipped_source, target);
				continue;
			}

			if (!std::filesystem::exists(source)) {
				add_copy_row(report, name, copy_skipped_missing, target);
				continue;
			}

			if (std::filesystem::exists(target)) {
				add_copy_row(report, name, copy_skipped_exists, target);
				continue;
			}

			std::filesystem::copy(source, target, std::filesystem::copy_options::recursive);
			add_copy_row(report, name, copy_copied, target);
		}

		if (!skip_posts) {
			ensure_private_dir(workdir, report);
		}
	}

	void copy_minimal_assets(
		const std::filesystem::path &source, const std::filesystem::path &local_dir, const bool force,
		copy_report &report
	)
	{
		const std::filesystem::path source_assets = source / "assets";
		const std::filesystem::path target_assets = local_dir / "assets";

		for (const std::string name : {"css", "js"}) {
			const std::filesystem::path dir = target_assets / name;
			const bool existed = std::filesystem::is_directory(dir);
			std::filesystem::create_directories(dir);
			add_copy_row(report, "assets/" + name, existed ? copy_kept : copy_created, dir);
		}

		for (const auto &relative : minimal_asset_entries) {
			const std::filesystem::path from = source_assets / relative;
			const std::filesystem::path to = target_assets / relative;
			const std::string item = "assets/" + relative.generic_string();

			if (!std::filesystem::exists(from)) {
				add_copy_row(report, item, copy_skipped_missing, to);
				continue;
			}

			const bool existed = std::filesystem::exists(to);
			if (existed && !force) {
				add_copy_row(report, item, copy_skipped_exists, to);
				continue;
			}

			std::filesystem::copy_file(from, to, std::filesystem::copy_options::overwrite_existing);
			add_copy_row(report, item, existed ? copy_overwritten : copy_copied, to);
		}

		// 字体目录采用合并查找，只需创建空目录让用户放入自己的字体，无需复制内置文件。
		const std::filesystem::path fonts = target_assets / "fonts";
		const bool fonts_existed = std::filesystem::is_directory(fonts);
		std::filesystem::create_directories(fonts);
		add_copy_row(report, "assets/fonts", fonts_existed ? copy_kept : copy_created, fonts);
	}

	std::filesystem::path template_source_dir()
	{
		const std::filesystem::path config = camus::paths::find(CAMUS_CONF_NAME);
		return config.empty() ? std::filesystem::path{} : config.parent_path();
	}

	// 源目录探测与构建保持一致：优先 src，其次 posts；两者都不存在时默认 posts，
	// 因为 --new 安装的示例内容在 posts/ 下。
	std::filesystem::path agents_target_dir(const std::filesystem::path &workdir)
	{
		if (std::filesystem::is_directory(workdir / "src")) {
			return workdir / "src";
		}

		if (std::filesystem::is_directory(workdir / "posts")) {
			return workdir / "posts";
		}

		return workdir / "posts";
	}

	// 收集技能文件与目标路径的对应关系：AGENTS.md 落到源目录根部，
	// 其余子目录落到 <source>/.agents/<子目录>/ 下。
	std::vector<std::pair<std::filesystem::path, std::filesystem::path>>
	collect_agents_files(const std::filesystem::path &source, const std::filesystem::path &target_root)
	{
		std::vector<std::pair<std::filesystem::path, std::filesystem::path>> files;

		const std::filesystem::path agents_md = source / CAMUS_AGENTS_FILE;
		if (std::filesystem::is_regular_file(agents_md)) {
			files.emplace_back(agents_md, target_root / CAMUS_AGENTS_FILE);
		}

		for (const auto &entry : std::filesystem::directory_iterator(source)) {
			if (!std::filesystem::is_directory(entry.path())) {
				continue;
			}

			const std::filesystem::path base = target_root / CAMUS_AGENTS_DIR / entry.path().filename();
			for (const auto &file : std::filesystem::recursive_directory_iterator(entry.path())) {
				if (std::filesystem::is_regular_file(file.path())) {
					files.emplace_back(file.path(), base / std::filesystem::relative(file.path(), entry.path()));
				}
			}
		}

		return files;
	}

	std::vector<std::filesystem::path> find_agents_conflicts(
		const std::vector<std::pair<std::filesystem::path, std::filesystem::path>> &files, const bool force
	)
	{
		std::vector<std::filesystem::path> conflicts;
		for (const auto &[from, to] : files) {
			if (!std::filesystem::exists(to)) {
				continue;
			}

			if (force || filesystem::read_file(from.string(), true) == filesystem::read_file(to.string(), true)) {
				continue;
			}

			conflicts.push_back(to);
		}

		return conflicts;
	}

	int report_agents_conflicts(const std::vector<std::filesystem::path> &conflicts)
	{
		if (conflicts.empty()) {
			return 0;
		}

		for (const auto &path : conflicts) {
			logging::error("agents file already exists path={}", filesystem::path_abs(path));
		}

		logging::error(
			"agents installation aborted: {} conflicting file(s), remove or rename them, "
			"or run with --force to overwrite",
			conflicts.size()
		);
		return 1;
	}
} // namespace

namespace camus
{
	void print_copy_report(const copy_report &report)
	{
		if (report.empty()) {
			return;
		}

		size_t item_width = strings::get_display_width("Item");
		size_t result_width = strings::get_display_width("Result");
		for (const auto &row : report) {
			item_width = std::max(item_width, strings::get_display_width(row.item));
			result_width = std::max(result_width, strings::get_display_width(row.result));
		}

		const std::string header = strings::padding_left("Item", item_width) + "  " +
								   strings::padding_left("Result", result_width) + "  Target";

		std::cout << strings::coloring_bright_yellow("Copy result:") << std::endl;
		std::cout << header << std::endl;
		std::cout << std::string(strings::get_display_width(header), '-') << std::endl;

		for (const auto &row : report) {
			std::cout << strings::padding_left(row.item, item_width) << "  "
					  << strings::padding_left(row.result, result_width) << "  " << filesystem::path_abs(row.target)
					  << std::endl;
		}
	}

	int install_templates(const std::filesystem::path &workdir)
	{
		const std::filesystem::path source = template_source_dir();
		if (source.empty()) {
			logging::error("install failed: no template resources found in data directories");
			return 1;
		}

		try {
			copy_report ignored;
			scaffold_workdir(workdir, source, false, ignored);
			logging::info("templates installed at '{}'", filesystem::path_abs(workdir));
		} catch (const std::exception &e) {
			logging::error("install failed error={}", e.what());
			return 1;
		}

		return 0;
	}

	int copy_resources(const std::filesystem::path &workdir, const bool force, const bool full, copy_report *report)
	{
		const std::filesystem::path source = paths::source_data_dir();
		if (source.empty()) {
			logging::error("install failed: no resources found in data directories");
			return 1;
		}

		copy_report collected;
		copy_report &rows = report ? *report : collected;
		const std::filesystem::path local_dir = workdir / paths::local_data_dir();

		try {
			if (!full) {
				// 最小资源复制到工作目录根部（assets/），作为本地覆盖层；仅 --full 使用 .camus。
				copy_minimal_assets(source, workdir, force, rows);
				scaffold_workdir(workdir, source, true, rows);
				return 0;
			}

			const bool installed = std::filesystem::is_directory(local_dir) && !std::filesystem::is_empty(local_dir);

			if (installed && !force) {
				logging::warn(
					"resources already installed at '{}', use --force to overwrite",
					filesystem::path_abs(local_dir)
				);
				add_copy_row(rows, ".camus", copy_skipped_installed, local_dir);
				scaffold_workdir(workdir, local_dir, true, rows);
				return 0;
			}

			if (installed) {
				filesystem::empty_path(local_dir, true);
			}

			std::filesystem::create_directories(local_dir);
			for (const auto &entry : std::filesystem::directory_iterator(source)) {
				const std::filesystem::path target = local_dir / entry.path().filename();
				const bool existed = std::filesystem::exists(target);
				std::filesystem::copy(
					entry.path(),
					target,
					std::filesystem::copy_options::recursive | std::filesystem::copy_options::overwrite_existing
				);
				add_copy_row(
					rows,
					".camus/" + entry.path().filename().generic_string(),
					existed ? copy_overwritten : copy_copied,
					target
				);
			}

			scaffold_workdir(workdir, local_dir, true, rows);
		} catch (const std::exception &e) {
			logging::error("install failed error={}", e.what());
			return 1;
		}

		return 0;
	}

	int copy_theme(const std::filesystem::path &workdir, const std::string &name, const bool force, copy_report *report)
	{
		const std::filesystem::path source_root = paths::source_data_dir();
		if (source_root.empty()) {
			logging::error("theme copy failed: no resources found in data directories");
			return 1;
		}

		const std::filesystem::path source_theme = source_root / "theme";
		if (!std::filesystem::is_directory(source_theme)) {
			logging::error("theme copy failed: theme directory not found path={}", source_theme.string());
			return 1;
		}

		std::filesystem::path relative;
		if (!name.empty()) {
			relative = std::filesystem::path(name);
			if (relative.is_absolute()) {
				logging::error("theme copy failed: invalid theme name={}", name);
				return 1;
			}

			for (const auto &part : relative) {
				if (part == "." || part == "..") {
					logging::error("theme copy failed: invalid theme name={}", name);
					return 1;
				}
			}
		}

		const std::filesystem::path source = relative.empty() ? source_theme : source_theme / relative;
		if (!std::filesystem::is_directory(source)) {
			logging::error("theme copy failed: theme not found name={}", name);
			return 1;
		}

		const std::filesystem::path target = workdir / "theme" / relative;

		copy_report collected;
		copy_report &rows = report ? *report : collected;

		try {
			std::filesystem::create_directories(target.parent_path());
			const bool existed = std::filesystem::exists(target);

			std::filesystem::copy_options options = std::filesystem::copy_options::recursive;
			options |= force ? std::filesystem::copy_options::overwrite_existing
							 : std::filesystem::copy_options::skip_existing;
			std::filesystem::copy(source, target, options);

			const std::string item = relative.empty() ? "theme" : "theme/" + relative.generic_string();
			add_copy_row(rows, item, existed ? (force ? copy_overwritten : copy_merged) : copy_copied, target);

			// --theme 同时复制最小资源骨架（css/style.css、js/camus.js、空 fonts/）到工作目录根部。
			copy_minimal_assets(source_root, workdir, force, rows);
		} catch (const std::exception &e) {
			logging::error("theme copy failed error={}", e.what());
			return 1;
		}

		return 0;
	}

	int create_article(const std::filesystem::path &workdir, const std::string &path)
	{
		std::filesystem::path relative(path);
		if (relative.empty() || relative.is_absolute()) {
			logging::error("create failed: invalid article path={}", path);
			return 1;
		}

		for (const auto &part : relative) {
			if (part == "." || part == "..") {
				logging::error("create failed: invalid article path={}", path);
				return 1;
			}
		}

		// 与构建时的源目录探测保持一致：优先 src，其次 posts，默认 src。
		std::filesystem::path source_dir = "src";
		if (std::filesystem::is_directory(workdir / "src")) {
			source_dir = "src";
		} else if (std::filesystem::is_directory(workdir / "posts")) {
			source_dir = "posts";
		}

		if (relative.extension() != ".md") {
			relative += ".md";
		}

		const std::filesystem::path target = workdir / source_dir / relative;
		const std::filesystem::path source_root = workdir / source_dir;

		// 记录本次将要新建的目录（不含源目录本身），用于补建 SUMMARY.md。
		std::vector<std::filesystem::path> created_dirs;
		for (auto dir = target.parent_path(); dir != source_root && !dir.empty(); dir = dir.parent_path()) {
			if (std::filesystem::exists(dir)) {
				break;
			}

			created_dirs.push_back(dir);
		}

		try {
			std::filesystem::create_directories(target.parent_path());

			if (std::filesystem::exists(target)) {
				logging::warn("article already exists path={}", filesystem::path_abs(target));
				return 0;
			}

			// 新建目录同时生成 SUMMARY.md，目录显示名取目录名。
			for (auto it = created_dirs.rbegin(); it != created_dirs.rend(); ++it) {
				const std::filesystem::path summary = *it / CAMUS_SUMMARY_NAME;
				if (std::filesystem::exists(summary)) {
					continue;
				}

				filesystem::write_file(
					summary,
					std::format("---\ntitle: {}\n---\n", strip_order_prefix(it->filename().string()))
				);
				logging::info("summary created at '{}'", filesystem::path_abs(summary));
			}

			std::string name = strip_order_prefix(relative.stem().string());

			const std::string content = std::format(
				"---\ntitle: {}\ncreate-time: {}\n---\n",
				name,
				functions::format_time_t(std::time(nullptr))
			);
			filesystem::write_file(target, content);
			logging::info("article created at '{}'", filesystem::path_abs(target));
		} catch (const std::exception &e) {
			logging::error("create failed error={}", e.what());
			return 1;
		}

		return 0;
	}

	int check_agents(const std::filesystem::path &workdir, const bool force)
	{
		const std::filesystem::path source = paths::find_resource(skills_dir_name);
		if (source.empty() || !std::filesystem::is_directory(source)) {
			return 0;
		}

		try {
			const auto files = collect_agents_files(source, agents_target_dir(workdir));
			return report_agents_conflicts(find_agents_conflicts(files, force));
		} catch (const std::exception &e) {
			logging::error("agents precheck failed error={}", e.what());
			return 1;
		}
	}

	int install_agents(const std::filesystem::path &workdir, const bool force, copy_report *report)
	{
		const std::filesystem::path source = paths::find_resource(skills_dir_name);
		if (source.empty() || !std::filesystem::is_directory(source)) {
			logging::warn("ai skills not found, skip agents installation");
			return 0;
		}

		try {
			const std::filesystem::path target_root = agents_target_dir(workdir);
			const auto files = collect_agents_files(source, target_root);
			if (files.empty()) {
				logging::warn("ai skills are empty, skip agents installation");
				return 0;
			}

			// 预检冲突：目标已存在且内容不同视为冲突，先全部检查完再决定是否复制，
			// 避免出现「一半新文件 + 一半旧文件」的中间状态。
			if (const auto conflicts = find_agents_conflicts(files, force); report_agents_conflicts(conflicts) != 0) {
				return 1;
			}

			for (const auto &[from, to] : files) {
				const bool existed = std::filesystem::exists(to);
				std::filesystem::create_directories(to.parent_path());
				std::filesystem::copy_file(from, to, std::filesystem::copy_options::overwrite_existing);

				if (!report) {
					continue;
				}

				std::filesystem::path item = to.lexically_relative(workdir);
				if (item.empty()) {
					item = to.filename();
				}

				add_copy_row(*report, item.generic_string(), existed ? copy_overwritten : copy_copied, to);
			}

			logging::info(
				"agents installed at '{}' and '{}'",
				filesystem::path_abs(target_root / CAMUS_AGENTS_FILE),
				filesystem::path_abs(target_root / CAMUS_AGENTS_DIR)
			);
		} catch (const std::exception &e) {
			logging::error("agents installation failed error={}", e.what());
			return 1;
		}

		return 0;
	}
} // namespace camus
