#pragma once

#include <string>
#include <vector>

namespace table
{
	// 打印一张对齐的表格：标题（为空则不打印）+ 表头 + 分隔线 + 数据行。
	// 单元格按显示宽度对齐（中文按 2 列计算），最后一列不做尾部填充。
	// rows 中缺少的单元格按空字符串处理，多余的单元格忽略。
	void print(
		const std::string &title, const std::vector<std::string> &headers,
		const std::vector<std::vector<std::string>> &rows
	);
} // namespace table
