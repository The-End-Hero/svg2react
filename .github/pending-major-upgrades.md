# 待处理的主版本（Major）依赖升级

> 最后检查时间：2026-10-01  
> 由依赖升级自动化任务生成

以下依赖存在可用的主版本（x）更新，因涉及破坏性变更或较高迁移成本，暂未自动升级。

## typescript

| 项目 | 值 |
|------|-----|
| 当前版本 | `^6.0.3`（已安装 6.0.3） |
| 最新版本 | `7.0.2` |
| 版本跨度 | 6.x → 7.x |
| 影响范围 | 全项目 TypeScript 编译与类型检查 |

**风险说明：**

- TypeScript 7.x 为主版本升级，可能引入新的类型检查规则、编译选项变更或弃用 API。
- 项目使用 `tsc -b` 进行构建前类型检查，升级可能导致大量类型错误或需调整 `tsconfig` 配置。
- 需同步确认 `typescript-eslint` 对 TS 7 的支持版本（当前 `typescript-eslint@8.69.0` 仍基于 TS 6）。

**建议迁移步骤：**

1. 阅读 [TypeScript 7.0 发布说明](https://devblogs.microsoft.com/typescript/) 了解 breaking changes。
2. 确认 `typescript-eslint` 已支持 TypeScript 7。
3. 在独立分支升级，运行 `pnpm build` 与 `pnpm lint` 修复所有类型与 lint 问题。
