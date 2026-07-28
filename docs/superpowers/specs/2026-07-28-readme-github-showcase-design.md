# README 与 GitHub 展示设计

## 目标

为 ReadTime 创建面向公开 GitHub 仓库的中文 README，使用实际软件截图展示主题和核心功能，并将干净的项目快照发布到 `galaxrin/ReadTime`。

## README 结构

1. 应用图标、项目名和一句话定位。
2. macOS、Electron、React、TypeScript、License 徽章。
3. 实际阅读界面主视觉。
4. 四宫格主题展示：纸张阅读、静谧深色、macOS 玻璃、透明白字。
5. 核心功能：书架与导入、自动滚动与自动切章、主题与排版、老板键与自动隐藏、透明窗口与内容保护。
6. 安装依赖、开发运行、测试和 `.app` 打包命令。
7. 项目结构、快捷键、隐私说明和作者署名。

## 图片

- 图片全部来自实际运行的 ReadTime，不生成虚构界面。
- 保存到 `docs/images/`，使用适合 GitHub 的 PNG。
- 包含一张主阅读界面图、一张主题四宫格、一张设置面板图和一张功能界面图。
- 截图不得包含个人文件路径、私人书名、通知或其他桌面隐私信息。

## 公开范围

包含源码、测试、应用资产、构建配置、README 和展示图片。

排除：

- `node_modules/`
- `dist/`
- `release/`
- `.superpowers/`
- `.worktrees/`
- `docs/superpowers/`

保留远程仓库现有 `LICENSE`。

## 发布

- 在远程 `main` 基础上创建功能分支。
- 提交干净项目快照并推送。
- 创建 Pull Request，验证后合并到 `main`。
- 发布前运行全量测试和生产构建。
