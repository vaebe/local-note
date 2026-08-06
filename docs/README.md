# 文档索引

| 文档                                                 | 说明                             | 状态                   |
| ---------------------------------------------------- | -------------------------------- | ---------------------- |
| [../README.md](../README.md)                         | 项目入口：功能、命令、结构、部署 | 现行                   |
| [../PRODUCT.md](../PRODUCT.md)                       | 产品目的、用户、品牌与设计原则   | 现行                   |
| [../DESIGN.md](../DESIGN.md)                         | 视觉 token、排版与组件样式约定   | 现行                   |
| [product-requirements.md](./product-requirements.md) | 完整产品需求（PRD）              | 现行（MVP）            |
| [implementation-plan.md](./implementation-plan.md)   | MVP 分阶段实施计划               | **历史归档**（已实施） |

## 阅读建议

1. 新上手：`README.md` → `PRODUCT.md`
2. 改交互 / UI：`PRODUCT.md` + `DESIGN.md` + `src/style.css`
3. 改业务规则：`product-requirements.md` + `src/domain/`
4. 查当初怎么落地：`implementation-plan.md`（勿再当作待办清单）

## 与实现不一致时

以代码与当前 `PRODUCT.md` 为准，并回写 PRD。已知相对初版计划的产品调整：

- 无独立「未分组」入口；笔记归属默认分组或用户分组
- 默认分组不可删除；删除其它分组时笔记迁入默认分组
- 写作区最大宽度 1280px
