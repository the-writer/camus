#pragma once

#include <string>

namespace camus
{
	// --update 的可选取值：check 只检测并打印下载链接，install 下载并安装
	inline constexpr const char *update_mode_check = "check";
	inline constexpr const char *update_mode_install = "install";

	// 请求 GitHub 最新 release；有新版本时打印下载链接。成功返回 0。
	int check_update();

	// 请求 GitHub 最新 release；有新版本时下载并执行安装命令。成功返回 0。
	int run_update();

	// 统一更新入口：mode 为 update_mode_check 时只检查并打印下载链接，
	// 为 update_mode_install（空值同样按此处理）时下载并安装；mode 非法时返回 1。
	int run_update_command(const std::string &mode);

	// 在后台线程中执行更新检查 / 安装，不阻塞调用方返回；重复调用只启动一次。
	void run_update_detached(bool install);

	// 等待后台更新线程结束；仍在进行时打印等待提示。
	void wait_update();
} // namespace camus
