#include "open.h"

#include <cstdlib>
#include <string>

#include <build/build.h>

#include "common/filesystem/filesystem.h"
#include "common/logging/logging.h"
#include "common/paths/paths.h"
#include "projects.h"

namespace
{
	std::string shell_quote(const std::string &value)
	{
		std::string quoted = "'";
		for (const char c : value) {
			quoted += c == '\'' ? "'\\''" : std::string(1, c);
		}

		return quoted + "'";
	}

	int run_command(const std::string &command)
	{
		logging::debug("open command: {}", command);
		return std::system(command.c_str());
	}

	// 用 VS Code 打开目录：优先 code 命令，其次 macOS 的 open -a
	bool open_in_vscode(const std::filesystem::path &path)
	{
		const std::string quoted = shell_quote(filesystem::path_abs(path));

		if (run_command("code " + quoted) == 0) {
			return true;
		}

#ifdef __APPLE__
		if (run_command("open -a 'Visual Studio Code' " + quoted) == 0) {
			return true;
		}
#endif

		return false;
	}

	// 记录项目：路径已存在时只更新名称
	void record_project(const std::filesystem::path &path)
	{
		const std::string name = camus::projects::project_title(path);
		if (const auto id = camus::projects::record(path, name); id) {
			logging::info("project recorded id={} name={} path={}", *id, name, filesystem::path_abs(path));
		}
	}

	int open_project(const std::filesystem::path &workdir)
	{
		// 只有合法的 camus 项目目录才允许打开
		if (!camus::projects::is_camus_project(workdir)) {
			logging::error(
				"open failed: not a camus project path={} missing={}",
				filesystem::path_abs(workdir),
				CAMUS_CONF_NAME
			);
			return 1;
		}

		if (!open_in_vscode(workdir)) {
			logging::error("open project failed: VS Code is not available path={}", filesystem::path_abs(workdir));
			return 1;
		}

		record_project(workdir);
		return 0;
	}

	// 打开已记录的项目：按 ID 或名称查找
	int open_recorded(const std::string &target)
	{
		const auto record = camus::projects::find(target);
		if (!record) {
			logging::error("open failed: project not found target={}", target);
			return 1;
		}

		const std::filesystem::path path = record->path;

		std::error_code ec;
		if (!std::filesystem::is_directory(path, ec) || ec) {
			logging::error("open failed: project path not found path={}", path.string());
			return 1;
		}

		if (!camus::projects::is_camus_project(path)) {
			logging::error("open failed: not a camus project path={} missing={}", path.string(), CAMUS_CONF_NAME);
			return 1;
		}

		if (!open_in_vscode(path)) {
			logging::error("open project failed: VS Code is not available path={}", path.string());
			return 1;
		}

		// 重新读取根目录注册的标题，保持记录与项目现状一致
		record_project(path);
		return 0;
	}

	int open_runtime()
	{
		const std::filesystem::path data_dir = camus::paths::data_dir();

		std::error_code ec;
		if (!std::filesystem::exists(data_dir, ec) || ec) {
			std::filesystem::create_directories(data_dir, ec);
			if (ec) {
				logging::error(
					"open runtime failed: cannot create data dir path={} error={}",
					data_dir.string(),
					ec.message()
				);
				return 1;
			}

			logging::info("data dir created path={}", data_dir.string());
		}

		const std::string path = shell_quote(data_dir.string());

#ifdef __APPLE__
		const std::string command = "open " + path;
#else
		const std::string command = "xdg-open " + path;
#endif

		if (run_command(command) != 0) {
			logging::error("open runtime failed path={}", data_dir.string());
			return 1;
		}

		return 0;
	}
} // namespace

namespace camus
{
	int open_target(const std::string &target, const std::filesystem::path &workdir)
	{
		if (target == CAMUS_OPEN_TARGET_RUNTIME) {
			return open_runtime();
		}

		if (target.empty() || target == CAMUS_OPEN_TARGET_PROJECT) {
			return open_project(workdir);
		}

		// 其它值：已记录项目的 ID 或名称
		if (camus::projects::find(target)) {
			return open_recorded(target);
		}

		if (camus::projects::is_id(target)) {
			logging::error("open failed: project id not found id={}", target);
			return 1;
		}

		logging::warn("unknown open target '{}', fallback to project", target);
		return open_project(workdir);
	}
} // namespace camus
