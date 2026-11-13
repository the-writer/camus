#include "render.h"

#include <cstring>
#include <memory>
#include <mutex>

#include "cmark-gfm-core-extensions.h"
#include "cmark-gfm-extension_api.h"
#include "common/error/error.h"
#include "common/str/str.h"

namespace render
{
	namespace
	{
		void ensure_markdown_extensions()
		{
			static std::once_flag registered;
			std::call_once(registered, [] {
				cmark_gfm_core_extensions_ensure_registered();
			});
		}
	}

	std::string render_markdown(const char *html, const std::string &engine, const int opt)
	{
		if (engine == "cmark-gfm") {
			ensure_markdown_extensions();

			const std::unique_ptr<cmark_parser, decltype(&cmark_parser_free)> parser{
				cmark_parser_new(opt),
				cmark_parser_free
			};

			if (!parser) {
				return {};
			}

			// 常用 GFM 扩展：表格、删除线、自动链接、任务列表。
			for (const char *name : {"table", "strikethrough", "autolink", "tasklist"}) {
				if (cmark_syntax_extension *extension = cmark_find_syntax_extension(name)) {
					cmark_parser_attach_syntax_extension(parser.get(), extension);
				}
			}

			cmark_parser_feed(parser.get(), html, strlen(html));

			const std::unique_ptr<cmark_node, decltype(&cmark_node_free)> document{
				cmark_parser_finish(parser.get()),
				cmark_node_free
			};

			if (!document) {
				return {};
			}

			const std::unique_ptr<char, decltype(&free)> html_ptr{
				cmark_render_html(
					document.get(),
					opt,
					cmark_parser_get_syntax_extensions(parser.get())
				),
				free
			};

			if (!html_ptr) {
				return {};
			}

			return std::string{html_ptr.get()};
		}

		logging::fatal("unsupported engine type name={}", engine);
		return "";
	}

	std::string inja_render(inja::Environment env, const std::string &html, const nlohmann::json &data)
	{
		try {
			return env.render(html, data);
		} catch (const inja::InjaError &e) {
			std::cout << strings::mark_string(html, e.location.line, e.location.column);
			logging::fatal("failed to render html error={}", e.what());
		}

		return "";
	}

	static inja::Environment inja_env;

	std::string inja_render(const std::string &html, const nlohmann::json &data)
	{
		return inja_render(inja_env, html, data);
	}
} // namespace render
