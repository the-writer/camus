#pragma once

#include <filesystem>
#include <string>
#include <vector>

namespace camus
{
	// 一次复制操作的结果行，用于命令行表格输出
	struct copy_row {
		std::string item;
		std::string result;
		std::filesystem::path target;
	};

	using copy_report = std::vector<copy_row>;

	// 以表格打印复制结果；report 为空时不输出。
	// base 非空时 Target 列显示相对 base 的路径（如 workdir），为空时显示绝对路径。
	void print_copy_report(const copy_report &report, const std::filesystem::path &base = {});

	// 从平台数据目录安装 camus.yaml、posts 与 .gitignore 到工作目录；
	// 已存在的同名路径不会被覆盖。返回 0 表示成功，非 0 表示失败
	int install_templates(const std::filesystem::path &workdir);

	// full 为假时把最小资源复制到 <workdir>/assets（css/style.css、js/camus.js、
	// 空 fonts/）；full 为真时把完整资源复制到 <workdir>/.camus。force 为真时覆盖已有文件。
	// report 非空时追加本次复制结果。返回 0 表示成功（或已安装且未指定 force），非 0 表示失败
	int
	copy_resources(const std::filesystem::path &workdir, bool force, bool full = false, copy_report *report = nullptr);

	// 只复制主题到 <workdir>/theme：name 为空时复制整个 theme 目录，
	// 非空时只复制 data_dir/theme/<name>；同时复制最小 assets 到 <workdir>/assets。
	// force 为真时覆盖已有文件，否则跳过。report 非空时追加本次复制结果。
	// 返回 0 表示成功，非 0 表示失败
	int copy_theme(
		const std::filesystem::path &workdir, const std::string &name, bool force, copy_report *report = nullptr
	);

	// 在源目录（src 或 posts）下创建文章：path 的最后一级视为文件名（自动补 .md），
	// 缺失的父目录会被递归创建；文件已存在时不覆盖。返回 0 表示成功，非 0 表示失败
	int create_article(const std::filesystem::path &workdir, const std::string &path);

	// 把 AI 技能整体安装到项目根的 .agents/：
	// SKILLS/AGENTS.md → <workdir>/.agents/AGENTS.md，SKILLS/PROMPT.md → <workdir>/.agents/PROMPT.md，
	// SKILLS/<类型>/… → <workdir>/.agents/<类型>/…；
	// SKILLS/AGENTS.root.md → <workdir>/AGENTS.md（短入口，提示先读 .agents/AGENTS.md）。
	// 同名且内容不同的文件视为冲突，提示冲突路径并终止复制（不写入任何文件）；
	// force 为真时覆盖同名文件。skip_existing_root_agents 为真（--copy）时，工作目录根部
	// 已存在 AGENTS.md 则跳过该文件并打印错误，不覆盖用户文件。report 非空时追加本次复制结果。
	// 返回 0 表示成功（或已安装且内容一致），非 0 表示冲突终止或失败。
	int install_agents(
		const std::filesystem::path &workdir, bool force, copy_report *report = nullptr,
		bool skip_existing_root_agents = false
	);

	// 只做 install_agents 的冲突预检，不写入任何文件；供调用方在其它复制动作前
	// 提前终止，避免留下半安装状态。skip_existing_root_agents 语义同 install_agents。
	// 返回 0 表示无冲突，非 0 表示有冲突或失败。
	int check_agents(const std::filesystem::path &workdir, bool force = false, bool skip_existing_root_agents = false);
} // namespace camus
