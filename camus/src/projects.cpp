#include "projects.h"

#include <algorithm>
#include <cctype>
#include <fstream>
#include <iostream>
#include <ranges>

#include <build/build.h>

#include "common/filesystem/filesystem.h"
#include "common/logging/logging.h"
#include "common/paths/paths.h"
#include "common/str/str.h"
#include "nlohmann/json.hpp"
#include "yaml-cpp/yaml.h"
#include "yaml_config.h"

namespace camus::projects
{
	namespace
	{
		// 源目录探测：src 优先，其次 posts；与构建时的探测顺序保持一致
		std::filesystem::path source_dir_of(const std::filesystem::path &workdir)
		{
			std::error_code ec;
			if (std::filesystem::is_directory(workdir / "src", ec) && !ec) {
				return workdir / "src";
			}

			if (std::filesystem::is_directory(workdir / "posts", ec) && !ec) {
				return workdir / "posts";
			}

			return {};
		}

		// camus.yaml 中的 site.title
		std::string config_site_title(const std::filesystem::path &config)
		{
			try {
				const YAML::Node root = YAML::LoadFile(config.string());
				if (const YAML::Node site = root["site"]; site && site.IsMap()) {
					if (const YAML::Node title = site["title"]; title && title.IsScalar()) {
						return strings::trim_space(title.as<std::string>());
					}
				}
			} catch (const std::exception &e) {
				logging::warn("read config failed path={} error={}", config.string(), e.what());
			}

			return {};
		}

		bool is_number(const std::string &value)
		{
			return !value.empty() && std::ranges::all_of(value, [](const char c) {
				return std::isdigit(static_cast<unsigned char>(c)) != 0;
			});
		}

		std::optional<project_record> find_in(const std::vector<project_record> &projects, const std::string &key)
		{
			if (is_number(key)) {
				uint64_t id = 0;
				try {
					id = std::stoull(key);
				} catch (const std::exception &) {
					return std::nullopt;
				}

				for (const auto &project : projects) {
					if (project.id == id) {
						return project;
					}
				}

				return std::nullopt;
			}

			for (const auto &project : projects) {
				if (project.name == key) {
					return project;
				}
			}

			return std::nullopt;
		}

		// 项目清单存放位置：优先运行期目录（安装包写入主题的目录，与 --open runtime 打开的一致）；
		// 该目录不可写时（例如系统级安装）回退到平台默认数据目录。
		std::filesystem::path resolve_store_file()
		{
			const std::filesystem::path runtime = paths::runtime_dir();
			if (filesystem::path_writable(runtime)) {
				return runtime / CAMUS_PROJECTS_FILE;
			}

			const std::filesystem::path fallback = paths::data_dir() / CAMUS_PROJECTS_FILE;
			logging::warn(
				"projects store fallback to data dir: runtime directory is not writable runtime={} store={}",
				filesystem::path_abs(runtime),
				filesystem::path_abs(fallback)
			);

			return fallback;
		}
	} // namespace

	std::filesystem::path store_file()
	{
		static const std::filesystem::path file = resolve_store_file();
		return file;
	}

	std::vector<project_record> load()
	{
		const std::filesystem::path file = store_file();

		std::error_code ec;
		if (!std::filesystem::exists(file, ec) || ec) {
			return {};
		}

		std::ifstream stream(file);
		if (!stream.is_open()) {
			logging::error("read projects failed: cannot open file path={}", file.string());
			return {};
		}

		nlohmann::json root;
		try {
			stream >> root;
		} catch (const std::exception &e) {
			logging::error("read projects failed: invalid json path={} error={}", file.string(), e.what());
			return {};
		}

		// 兼容两种结构：{"projects": [...]} 与直接的 [...]
		const nlohmann::json *list = &root;
		if (root.is_object()) {
			list = &root["projects"];
		}

		if (!list->is_array()) {
			return {};
		}

		std::vector<project_record> projects;
		for (const auto &item : *list) {
			if (!item.is_object()) {
				continue;
			}

			project_record project;
			if (const auto id = item.find("id"); id != item.end() && id->is_number_unsigned()) {
				project.id = id->get<uint64_t>();
			} else if (const auto id = item.find("id"); id != item.end() && id->is_number_integer()) {
				project.id = static_cast<uint64_t>(id->get<int64_t>());
			}

			if (const auto name = item.find("name"); name != item.end() && name->is_string()) {
				project.name = name->get<std::string>();
			}

			if (const auto path = item.find("path"); path != item.end() && path->is_string()) {
				project.path = path->get<std::string>();
			}

			// 缺少 ID 或路径的条目视为无效数据，直接忽略
			if (project.id == 0 || project.path.empty()) {
				continue;
			}

			projects.push_back(project);
		}

		return projects;
	}

	bool save(const std::vector<project_record> &projects)
	{
		nlohmann::json list = nlohmann::json::array();
		for (const auto &project : projects) {
			list.push_back({
				{"id", project.id},
				{"name", project.name},
				{"path", project.path.string()},
			});
		}

		nlohmann::json root;
		root["projects"] = list;

		const std::filesystem::path file = store_file();

		std::error_code ec;
		if (!std::filesystem::exists(file.parent_path(), ec) || ec) {
			std::filesystem::create_directories(file.parent_path(), ec);
			if (ec) {
				logging::error(
					"save projects failed: cannot create dir path={} error={}",
					file.parent_path().string(),
					ec.message()
				);
				return false;
			}
		}

		if (filesystem::write_file(file.string(), root.dump(4)) < 0) {
			logging::error("save projects failed: cannot write file path={}", file.string());
			return false;
		}

		return true;
	}

	std::optional<uint64_t> record(const std::filesystem::path &path, const std::string &name)
	{
		std::vector<project_record> projects = load();
		const std::string abs_path = filesystem::path_abs(path);

		uint64_t max_id = 0;
		for (const auto &project : projects) {
			max_id = std::max(max_id, project.id);
		}

		// 同一路径只保留一条记录：路径相同则更新名称
		for (auto &project : projects) {
			if (project.path.string() != abs_path && !filesystem::path_equal(project.path, abs_path)) {
				continue;
			}

			project.name = name;
			project.path = abs_path;
			if (!save(projects)) {
				return std::nullopt;
			}

			return project.id;
		}

		project_record project;
		project.id = max_id + 1;
		project.name = name;
		project.path = abs_path;
		projects.push_back(project);

		if (!save(projects)) {
			return std::nullopt;
		}

		return project.id;
	}

	std::optional<project_record> find(const std::string &key)
	{
		return find_in(load(), key);
	}

	bool is_id(const std::string &key)
	{
		return is_number(key);
	}

	bool remove(const std::string &key)
	{
		std::vector<project_record> projects = load();
		const auto found = find_in(projects, key);
		if (!found) {
			return false;
		}

		projects.erase(
			std::remove_if(
				projects.begin(),
				projects.end(),
				[&found](const project_record &project) { return project.id == found->id; }
			),
			projects.end()
		);

		return save(projects);
	}

	bool is_camus_project(const std::filesystem::path &path)
	{
		std::error_code ec;
		if (!std::filesystem::is_directory(path, ec) || ec) {
			return false;
		}

		return std::filesystem::is_regular_file(path / CAMUS_CONF_NAME, ec) && !ec;
	}

	std::string project_title(const std::filesystem::path &path)
	{
		// 根目录注册的标题：源目录根部的 SUMMARY.md 优先，其次 camus.yaml 的 site.title
		if (const std::filesystem::path source = source_dir_of(path); !source.empty()) {
			if (const std::string title = config::read_summary_title(source); !title.empty()) {
				return title;
			}
		}

		if (const std::string title = config_site_title(path / CAMUS_CONF_NAME);
			!title.empty() && title != config::default_site_title) {
			return title;
		}

		return path.filename().string();
	}

	void print_table(const std::vector<project_record> &projects)
	{
		if (projects.empty()) {
			std::cout << "No project recorded." << std::endl;
			return;
		}

		size_t id_width = strings::get_display_width("ID");
		size_t name_width = strings::get_display_width("Name");
		for (const auto &project : projects) {
			id_width = std::max(id_width, strings::get_display_width(std::to_string(project.id)));
			name_width = std::max(name_width, strings::get_display_width(project.name));
		}

		std::cout << strings::padding_left("ID", id_width) << "  " << strings::padding_left("Name", name_width)
				  << "  Path" << std::endl;
		std::cout << std::string(id_width + name_width + 4, '-') << std::endl;

		for (const auto &project : projects) {
			std::cout << strings::padding_left(std::to_string(project.id), id_width) << "  "
					  << strings::padding_left(project.name, name_width) << "  " << project.path.string() << std::endl;
		}
	}

	int manage(const std::string &delete_key)
	{
		if (!delete_key.empty()) {
			const auto found = find(delete_key);
			if (!found) {
				logging::error("delete project failed: not found key={}", delete_key);
				return 1;
			}

			if (!remove(delete_key)) {
				logging::error("delete project failed: cannot update store path={}", store_file().string());
				return 1;
			}

			logging::info("project deleted id={} name={} path={}", found->id, found->name, found->path.string());
		}

		print_table(load());
		return 0;
	}
} // namespace camus::projects
