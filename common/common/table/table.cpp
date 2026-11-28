#include "table.h"

#include <algorithm>
#include <iostream>

#include "common/str/str.h"

namespace table
{
	void print(
		const std::string &title, const std::vector<std::string> &headers,
		const std::vector<std::vector<std::string>> &rows
	)
	{
		if (headers.empty()) {
			return;
		}

		std::vector<size_t> widths(headers.size(), 0);
		for (size_t i = 0; i < headers.size(); i++) {
			widths[i] = strings::get_display_width(headers[i]);
		}

		for (const auto &row : rows) {
			for (size_t i = 0; i < row.size() && i < widths.size(); i++) {
				widths[i] = std::max(widths[i], strings::get_display_width(row[i]));
			}
		}

		const auto compose = [&widths](const std::vector<std::string> &cells) {
			std::string text;
			for (size_t i = 0; i < widths.size(); i++) {
				if (i > 0) {
					text += "  ";
				}

				const std::string cell = i < cells.size() ? cells[i] : "";
				text += i + 1 == widths.size() ? cell : strings::padding_left(cell, widths[i]);
			}

			return text;
		};

		if (!title.empty()) {
			std::cout << '\n' << strings::coloring_bright_yellow(title) << '\n';
		}

		const std::string header = compose(headers);
		std::cout << header << '\n' << std::string(strings::get_display_width(header), '-') << '\n';

		for (const auto &row : rows) {
			std::cout << compose(row) << '\n';
		}
	}
} // namespace table
