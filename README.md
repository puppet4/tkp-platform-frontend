# TKP 平台前端

TKP 前端是平台的业务操作界面，面向“知识管理 + 智能问答 + 治理运营”。
它让业务团队能够在统一 UI 中完成知识库建设、检索问答和运维治理。

## 平台用处

- 知识资源管理：工作空间、知识库、文档上传与状态追踪
- 检索与问答：基于知识库进行语义检索与对话交互
- 治理与运营：反馈、治理、运行态与告警相关页面
- 权限控制：按租户角色和动作权限控制可见范围

## 技术栈

- React + TypeScript
- Vite
- React Router
- TanStack Query
- Tailwind + Radix UI

## 本地启动

环境建议：
- Node.js 20.x（见 `.nvmrc`）
- npm 10.x 或更高

1. 安装依赖

```bash
npm install
```

2. 启动开发服务

```bash
npm run dev
```

默认地址：`http://127.0.0.1:8080`

## 联调说明（推荐）

前端默认通过 Vite 代理访问后端：
- 前端请求：`/api/*`
- 代理目标：`http://127.0.0.1:8000`

这样可避免浏览器跨域问题。

如需直连后端，可在 `.env` 中设置：

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## 常用命令

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run test
```
