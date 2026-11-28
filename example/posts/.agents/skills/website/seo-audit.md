---
title: SEO 与结构化数据审查
visibility: hidden
---

# SEO 与结构化数据审查（website）

> 检查页面能否被正确抓取、正确理解、正确展示；输出可执行的修改项。

## 用途

- 上线前检查 title / description / canonical / 索引策略。
- 为文章、书籍、组织等添加结构化数据。
- 排查「收录了但排名不对」「摘要不对」「重复页面」问题。

## 何时使用

- 新页面模板上线时；
- 搜索结果展示（标题、摘要、卡片）不正确时；
- 结构化数据校验报错时；
- 内容迁移后批量检查时。

## 输入

| 输入 | 说明 | 缺失时 |
|---|---|---|
| 页面清单与 URL | 待审页面 | 从站点结构生成 |
| 模板文件 | head 区域写法 | 从主题模板读取 |
| 目标关键词 | 每个页面对应的搜索意图 | 从站点定位与页面目标推断，缺失时向用户确认 |
| 站点地图 / robots.txt | 抓取策略 | 从站点配置读取 |

## 执行步骤

1. **列页面**：路径 / 目标关键词 / 搜索意图（信息 / 导航 / 商业 / 交易）。
2. **检查抓取**：robots.txt、sitemap、`noindex`、canonical、软 404、重定向链。
3. **检查 head**：title 唯一且含关键词、description 长度合适、标题层级唯一、OG/Twitter 卡片完整。
4. **检查内容**：与搜索意图匹配、满足「有用内容」标准、无重复、无thin content。
5. **检查结构化数据**：按类型选 schema.org 词汇，标注 JSON-LD 位置与必填字段。
6. **检查性能与移动**：Core Web Vitals、响应式、内链。
7. **出清单**：按影响排序，标注「必修 / 建议 / 可选」。

## head 检查项

| 项目 | 要求 | 常见错误 |
|------|------|---------|
| `<title>` | 唯一、含核心词、约 30–60 字符 | 全站标题相同；堆关键词 |
| `description` | 约 70–160 字符，概括价值并含关键词 | 缺失；复制正文首句 |
| canonical | 指向规范 URL | 多域名未统一；指向 404 |
| `h1` | 每页唯一且与 title 相关 | 多 h1；缺失 |
| 标题层级 | 不跳级 | h2 → h4 |
| OG / Twitter | `og:title` `og:description` `og:image` `og:url` | 分享无卡片 |
| lang | `<html lang="zh-CN">` | 缺失 |
| 结构化数据 | JSON-LD，字段完整 | 用 microdata 散落；缺必填字段 |
| robots meta | 需要收录则不加 `noindex` | 全站误加 |

## 结构化数据选型

| 页面 | 用什么 | 关键字段 |
|------|--------|---------|
| 文章 | `Article` / `BlogPosting` | headline、datePublished、dateModified、author、image |
| 书籍 | `Book` | name、author、isbn、bookEdition、numberOfPages、inLanguage |
| 产品 | `Product` + `Offer` | name、image、offers.price、offers.availability |
| FAQ | `FAQPage` | mainEntity（问题 + 答案） |
| 站点导航 | `BreadcrumbList` | itemListElement |
| 组织 | `Organization` | name、url、logo、sameAs |
| 人物 | `Person` | name、jobTitle、url |

> 结构化数据必须与页面可见内容一致，标记不可见或夸大的内容属于违规。

## 输出格式

```markdown
## 页面与意图
| 路径 | 目标关键词 | 搜索意图 | 当前 title | 当前 description |
|------|-----------|---------|-----------|------------------|
| /pricing | <...> | 商业 | <...> | <...> |

## 抓取
- robots.txt：<结论>
- sitemap：<结论>
- canonical / noindex：<结论>
- 重定向链与软 404：<结论>

## 问题清单
| 级别 | 页面 | 检查项 | 问题 | 修法 | 参考 |
|------|------|--------|------|------|------|
| 必修 | /pricing | description | 缺失 | 补 70–160 字，含「<关键词>」 | <链接> |

## 结构化数据建议
```json
{ "@context": "https://schema.org", "@type": "Book", "name": "<...>" }
```

## 性能与移动
- LCP / INP / CLS：<...>

## 结论
<必修 n 项，建议 n 项>
```

## 质量检查清单

- [ ] 每个页面的目标关键词与搜索意图已明确；
- [ ] title / description 唯一，不是模板里写死的同一句；
- [ ] canonical 与实际 URL 一致，无指向 404；
- [ ] 结构化数据字段完整，且与页面可见内容一致；
- [ ] JSON-LD 语法正确（无多余逗号、括号配对）；
- [ ] 没有为了 SEO 添加不可见内容或虚假评价；
- [ ] 结论区分了「必修」与「可选」，没有制造焦虑式清单。

## 参考资料

- [Google 搜索中心：文档索引](https://developers.google.com/search/docs) —— 官方文档总入口
- [Google 搜索中心：创建有用内容](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) —— 内容质量标准
- [Schema.org](https://schema.org/) —— 结构化数据词汇表
- [Ahrefs SEO 指南](https://ahrefs.com/blog/seo/) —— 站内结构、关键词与内容策略
- [Core Web Vitals（web.dev）](https://web.dev/articles/vitals) —— 体验类排名因素
