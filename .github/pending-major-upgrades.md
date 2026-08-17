# 待处理的主版本（Major）依赖升级

> 最后检查时间：2026-08-17  
> 由依赖升级自动化任务生成

以下依赖存在可用的主版本（x）更新，因涉及破坏性变更或较高迁移成本，暂未自动升级。

## motion

| 项目 | 值 |
|------|-----|
| 当前版本 | `^12.42.2`（已安装 12.42.2） |
| 最新版本 | `13.1.0` |
| 版本跨度 | 12.x → 13.x |
| 使用位置 | `src/App.tsx`（AnimatePresence）、`src/pages/login/Login.tsx`、`src/pages/home/Home.tsx`（motion/react） |

**风险说明：**

- 主版本升级通常包含 API 变更或行为调整。
- 项目通过 `motion/react` 使用 `motion` 与 `AnimatePresence` 组件，需对照 [Motion v13 迁移指南](https://motion.dev/docs/react-upgrade-guide) 验证动画 API 兼容性。

**建议迁移步骤：**

1. 阅读 Motion 13.x changelog 与升级指南。
2. 在独立分支升级并回归测试登录页、首页的入场动画。
3. 确认 `AnimatePresence` 路由切换动画行为无回归。

---

## react-dropzone

| 项目 | 值 |
|------|-----|
| 当前版本 | `^19.1.1`（已安装 19.1.1） |
| 最新版本 | `20.1.0` |
| 版本跨度 | 19.x → 20.x |
| 使用位置 | `src/pages/svg-converter/SvgConverter.tsx`（useDropzone） |

**风险说明：**

- 主版本升级可能变更 `useDropzone` hook 的选项、回调签名或默认行为。
- SVG 转换页依赖拖拽上传功能，升级后需完整测试文件选择与拖拽流程。

**建议迁移步骤：**

1. 查阅 [react-dropzone releases](https://github.com/react-dropzone/react-dropzone/releases) 中 v20 的 breaking changes。
2. 升级后验证拖拽上传、点击选择、文件类型过滤等核心流程。

---

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
- 需同步确认 `typescript-eslint` 对 TS 7 的支持版本。

**建议迁移步骤：**

1. 阅读 [TypeScript 7.0 发布说明](https://devblogs.microsoft.com/typescript/) 了解 breaking changes。
2. 确认 `typescript-eslint` 已支持 TypeScript 7。
3. 在独立分支升级，运行 `pnpm build` 与 `pnpm lint` 修复所有类型与 lint 问题。
