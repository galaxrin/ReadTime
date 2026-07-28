# ReadTime - 摸鱼阅读软件设计文档

## 项目概述

ReadTime 是一款专为 Mac 用户设计的摸鱼阅读软件，具有完全透明的窗口、老板键一键隐藏等功能，让用户可以在上班时隐蔽地阅读小说。

## 核心需求

### 用户需求
- **隐蔽性**：完全透明的程序窗口，可以在桌面上任意拖动
- **老板键**：一键隐藏/显示窗口（默认 `Cmd + Shift + H`）
- **纯文字悬浮**：文字直接浮在桌面上，没有背景
- **本地文件**：支持导入本地 TXT/EPUB 文件
- **阅读体验**：多格式支持、阅读进度记忆、样式自定义、鼠标感应显示

### 技术选型
- **框架**：Electron + React + TypeScript
- **构建**：Vite + Electron Builder
- **UI**：纯 CSS（保持轻量）
- **状态管理**：React Context + useReducer
- **文件解析**：
  - TXT：`iconv-lite`（编码检测）
  - EPUB：`epubjs`

## 系统架构

### 模块划分

#### 1. TransparentWindow（透明窗口管理）
- 创建无边框、完全透明的 Electron 窗口
- 支持窗口拖动（`-webkit-app-region: drag`）
- 管理窗口显示/隐藏状态
- 控制窗口置顶（可选）

#### 2. BossKey（老板键系统）
- 注册全局快捷键（默认 `Cmd + Shift + H`）
- 实现窗口立即隐藏（opacity 设为 0 + 移出屏幕）
- 支持快捷键自定义
- 隐藏时暂停阅读进度更新

#### 3. BookParser（文件解析器）
- TXT 文件解析：
  - 自动检测编码（UTF-8、GBK、GB2312 等）
  - 按章节分割（支持自定义分隔符）
- EPUB 文件解析：
  - 解析 EPUB 结构
  - 提取章节内容和元数据

#### 4. ReadingEngine（阅读引擎）
- 阅读模式：
  - 滚动模式：连续滚动阅读
  - 翻页模式：按章节翻页（推荐）
- 进度管理：
  - 自动保存阅读位置（文件路径 + 章节 + 行号）
  - 支持多本书同时保存进度
  - 启动时自动加载上次阅读的书
- 样式自定义：
  - 字体大小：12px - 24px
  - 字体颜色：预设主题（黑底白字、白底黑字、护眼绿等）
  - 透明度调节：10% - 100%
  - 行间距调节

#### 5. SettingsManager（配置管理）
- 存储用户配置（JSON 文件）
- 管理阅读进度
- 处理设置界面逻辑

### 数据流

```
用户操作 → React 组件 → Context/Reducer → Electron IPC → 主进程
     ↓
文件读取 → BookParser → ReadingEngine → 渲染显示
     ↓
进度保存 → 本地 JSON 文件
```

## 用户界面设计

### 窗口布局

```
┌─────────────────────────────────┐
│  [控制栏] - 鼠标悬停时显示        │
│  ┌─────────────────────────────┐│
│  │                             ││
│  │     纯文字内容区域           ││
│  │     (完全透明背景)           ││
│  │                             ││
│  └─────────────────────────────┘│
│  [状态栏] - 鼠标悬停时显示        │
└─────────────────────────────────┘
```

### 控制栏功能（鼠标悬停时显示）
- 上一章/下一章按钮
- 进度条
- 设置按钮
- 关闭按钮

### 鼠标感应显示
- 鼠标悬停时显示控制栏和状态栏
- 鼠标移开后 3 秒自动隐藏
- 可调整隐藏延迟时间

### 文件导入方式
- 拖拽文件到窗口
- 菜单栏导入
- 快捷键打开文件选择器

### 菜单栏图标
- 系统托盘图标（可选）
- 右键菜单：打开文件、设置、退出

## 快捷键设计

### 老板键
- 默认：`Cmd + Shift + H`
- 可自定义
- 全局快捷键，即使应用不在焦点也能触发

### 阅读快捷键
- 上一章：`Cmd + ←` 或 `Cmd + [`
- 下一章：`Cmd + →` 或 `Cmd + ]`
- 增大字体：`Cmd + =`
- 减小字体：`Cmd + -`
- 切换透明度：`Cmd + T`

## 项目结构

```
ReadTime/
├── src/
│   ├── main/           # Electron 主进程
│   │   ├── main.ts     # 主进程入口
│   │   ├── window.ts   # 窗口管理
│   │   └── shortcuts.ts # 快捷键管理
│   ├── renderer/       # React 应用
│   │   ├── components/ # 组件
│   │   │   ├── ReadingView.tsx
│   │   │   ├── ControlBar.tsx
│   │   │   ├── StatusBar.tsx
│   │   │   └── Settings.tsx
│   │   ├── hooks/      # 自定义 Hook
│   │   │   ├── useReading.ts
│   │   │   ├── useBossKey.ts
│   │   │   └── useSettings.ts
│   │   ├── contexts/   # Context
│   │   │   ├── ReadingContext.tsx
│   │   │   └── SettingsContext.tsx
│   │   └── utils/      # 工具函数
│   │       ├── fileParser.ts
│   │       ├── progressManager.ts
│   │       └── themeManager.ts
│   └── preload/        # 预加载脚本
│       └── preload.ts
├── public/             # 静态资源
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 性能优化

### 懒加载
- 章节内容按需加载
- 长文本虚拟滚动

### 内存管理
- 只保留当前章节在内存中
- 及时释放已读章节内存

### 启动优化
- 预加载上次阅读位置
- 缓存文件解析结果

## 安全考虑

### 隐私保护
- 阅读进度本地存储，不上传云端
- 隐藏时可选清除最近阅读记录

### 老板键安全
- 隐藏时暂停所有活动
- 任务栏图标同步隐藏

## 测试策略

### 单元测试
- 文件解析器测试
- 进度管理测试
- 快捷键管理测试

### 集成测试
- 窗口显示/隐藏测试
- 老板键响应测试
- 文件导入测试

### 用户测试
- 隐蔽性测试
- 阅读体验测试
- 性能测试

## 部署和分发

### 构建
- 使用 Electron Builder 打包
- 支持 DMG、ZIP 格式

### 分发
- 直接分发 DMG 文件
- 可选：上传到 GitHub Releases

## 未来扩展

### 可能的增强功能
- 在线书源支持
- 阅读统计
- 笔记和高亮
- 多设备同步（加密）

## 附录

### 依赖包列表
- `electron`：Electron 框架
- `react`：React 库
- `react-dom`：React DOM
- `vite`：构建工具
- `@vitejs/plugin-react`：Vite React 插件
- `typescript`：TypeScript 编译器
- `iconv-lite`：编码检测和转换
- `epubjs`：EPUB 文件解析

### 参考资源
- Electron 官方文档：https://www.electronjs.org/
- React 官方文档：https://reactjs.org/
- Vite 官方文档：https://vitejs.dev/
