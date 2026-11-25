#pragma once

#include <cstdint>
#include <filesystem>
#include <optional>
#include <string>
#include <vector>

namespace camus::projects
{
	// 已记录的项目条目
	struct project_record {
		// 自增 ID（记录后保持不变，删除其它条目不会改变已有 ID）
		uint64_t id = 0;
		// 项目名：根目录注册的标题（源目录根部 SUMMARY.md 的标题，其次 camus.yaml 的 site.title）
		std::string name;
		// 项目绝对路径
		std::filesystem::path path;
	};

	// 项目清单文件：<数据目录>/projects.json
	[[nodiscard]] std::filesystem::path store_file();
	// 读取项目清单；文件不存在或内容非法时返回空列表
	[[nodiscard]] std::vector<project_record> load();
	// 写入项目清单；成功返回 true
	bool save(const std::vector<project_record> &projects);
	// 记录项目：路径已存在时更新名称，否则追加新 ID；写入失败返回空值
	std::optional<uint64_t> record(const std::filesystem::path &path, const std::string &name);
	// 按 ID（纯数字）或名称查找项目
	[[nodiscard]] std::optional<project_record> find(const std::string &key);
	// 是否是项目 ID（纯数字）
	[[nodiscard]] bool is_id(const std::string &key);
	// 按 ID（纯数字）或名称删除项目；未找到或写入失败返回 false
	bool remove(const std::string &key);
	// 是否是合法的 camus 项目目录：存在且包含 camus.yaml
	[[nodiscard]] bool is_camus_project(const std::filesystem::path &path);
	// 读取项目名（根目录注册的标题），无法识别时回退为目录名
	[[nodiscard]] std::string project_title(const std::filesystem::path &path);
	// 打印项目表格（ID / 名称 / 路径）
	void print_table(const std::vector<project_record> &projects);
	// 项目管理入口：打印项目表格；delete_key 非空时先删除对应记录再打印表格
	int manage(const std::string &delete_key);
} // namespace camus::projects
