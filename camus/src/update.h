#pragma once

namespace camus
{
	// 请求 GitHub 最新 release；有新版本时打印下载链接。成功返回 0。
	int check_update();

	// 请求 GitHub 最新 release；有新版本时下载并执行安装命令。成功返回 0。
	int run_update();

	// 在后台线程中执行更新检查 / 安装，不阻塞调用方返回；重复调用只启动一次。
	void run_update_detached(bool install);

	// 等待后台更新线程结束；仍在进行时打印等待提示。
	void wait_update();
} // namespace camus
