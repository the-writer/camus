#pragma once

#include <filesystem>
#include <string>

namespace camus
{
	// 按照 target 打开：
	//   project（默认）：在 VS Code 中打开工作目录，要求工作目录是合法的 camus 项目，打开成功后记录到项目清单；
	//   runtime：用系统文件管理器打开数据目录（目录不存在时自动创建）；
	//   其它值：按已记录项目的 ID（纯数字）或名称打开对应项目。
	// 打开失败返回非 0。
	int open_target(const std::string &target, const std::filesystem::path &workdir);
} // namespace camus
