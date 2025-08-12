# Cronos

Cronos 是一个基于 React 和 Fluent UI 的 RSS 阅读器和 AI 助手项目。它提供了 RSS 订阅管理、文章阅读、AI 生成摘要等功能，并支持与后端服务交互。

## 功能特性

- **RSS 阅读器**：
  - 管理 RSS 订阅源。
  - 查看最新文章列表。
  - 阅读文章内容。
  - 按订阅源筛选文章。

- **AI 助手**：
  - 使用 LLM 模型生成文章摘要。
  - 支持 Markdown 格式的消息交互。

- **管理面板**：
  - 管理订阅源。
  - 配置 RSS 更新程序。
  - 配置 AI 模型。

## 技术栈

- **前端**：
  - React 19
  - Fluent UI React Components
  - React Markdown
  - Vite 构建工具

- **后端**：
  - FastAPI
  - SQLite 数据库

## 环境配置

1. 克隆项目：
   ```bash
   git clone https://github.com/your-repo/pulse-dashboard.git
   cd pulse-dashboard
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

3. 配置环境变量：
   在项目根目录下创建 `.env` 文件，并添加以下内容：
   ```
   VITE_BACKEND_URL=http://localhost:8000
   ```

4. 启动后端服务：
   请确保后端服务（FastAPI）已运行，默认监听端口为 `8000`。

5. 启动开发服务器：
   ```bash
   npm run dev
   ```

6. 打开浏览器访问：
   ```
   http://localhost:5173
   ```

## 构建与部署

1. 构建项目：
   ```bash
   npm run build
   ```

2. 部署：
   将 `dist/` 目录下的文件部署到静态文件服务器（如 Nginx）。

## 脚本命令

- `npm run dev`：启动开发服务器。
- `npm run build`：构建生产环境代码。
- `npm run lint`：运行 ESLint 检查代码。

## 贡献指南

欢迎对本项目提出建议或贡献代码！请遵循以下步骤：

1. Fork 本仓库。
2. 创建新分支：
   ```bash
   git checkout -b feature/your-feature
   ```
3. 提交更改并推送到你的分支：
   ```bash
   git commit -m "Add your message"
   git push origin feature/your-feature
   ```
4. 提交 Pull Request。