# React Router v8 迁移设计

日期：2026-09-20  
状态：已批准设计，待实现

## 背景

项目当前依赖 `react-router-dom@^7.18.4`。从 React Router v7 起，官方推荐使用 `react-router`；`react-router-dom` 仅为兼容重导出，**v8 已移除该包**。

## 目标

将路由依赖迁移到 `react-router@8`，消除对即将移除的 `react-router-dom` 的依赖，并满足 v8 最低运行时要求。

## 非目标

- 不迁移到 Framework mode 或 Data mode（`createHashRouter` / `RouterProvider`）
- 不改变现有路由结构、路径或 Hash 策略
- 不做与路由无关的重构

## 方案选择

采用**一步到位**：直接卸载 `react-router-dom`，安装 `react-router@8`，更新 import。

未采用两步走（先 `react-router@7` 再升 v8），因为本项目为 declarative SPA，未使用需 future flag 的 framework/data API。

## 当前用法

| 文件 | API |
|------|-----|
| `src/App.tsx` | `HashRouter`, `Route`, `Routes`, `useLocation` |
| `src/pages/home/Home.tsx` | `Link` |
| `src/pages/login/Login.tsx` | `Link` |

均为 declarative API，v8 中应从 `react-router` 导入（非 `react-router/dom`）。`react-router/dom` 仅用于 `RouterProvider` / `HydratedRouter`，本项目不涉及。

## 变更清单

### 1. 依赖

- 移除：`react-router-dom`
- 新增：`react-router@^8.4.0`（或安装时的最新 8.x）
- 使用 pnpm：`pnpm remove react-router-dom && pnpm add react-router@latest`

### 2. 源码 import

三处文件统一将：

```ts
from "react-router-dom"
```

改为：

```ts
from "react-router"
```

组件与 hook 名称、用法保持不变。

### 3. engines

`package.json` 中：

```json
"engines": {
  "node": ">=22.22.0"
}
```

（v8 要求 `node@>=22.22.0`；当前为 `>=22.13.0`。CI 已使用 Node 24，无需改 workflow。）

### 4. React 版本

已满足 peer：`react` / `react-dom` `^19.3.0`（需 `>=19.2.7`），不改动。

## 验证

- `pnpm install` 成功
- `pnpm build`（`tsc -b && vite build`）通过
- 确认 `package.json` / lockfile 中无 `react-router-dom`

## 风险

低。API 表面无变化；主要风险为 Node 版本声明过旧导致本地环境不符——通过抬高 `engines.node` 对齐官方要求。
