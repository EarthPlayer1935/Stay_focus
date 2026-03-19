# 保持专注 (Stay Focus) VSCode 插件设计方案

## 1. 背景与目标
将 "Stay Focus" Chrome 扩展的核心体验（聚光灯、高亮模式、整行模式等）迁移到 VSCode 中，帮助开发者在阅读代码或长文档时保持专注。考虑到 VSCode 的 API 限制，插件的实现方式将从“基于鼠标指针的全屏 DOM 遮罩”转变为“基于文本光标的装饰（Decorations）”或“独立阅读视图”。

## 2. 技术可行性与方案选择
- **限制分析**: VSCode 不允许插件直接操作编辑器核心的 DOM 结构，因此无法像 Chrome 插件那样在屏幕最上层加一个带 `mix-blend-mode` 的全屏层。VSCode API 只能获取**文本光标（Selection/Cursor）**的位置，无法获取鼠标在屏幕上的实时像素坐标（除非在独立 Webview 内）。
- **解决方案 A：原生代码焦点模式 (推荐)**
  完全依靠 VSCode 的 `TextEditorDecorationType` API 实现。根据光标位置，动态调暗编辑器中其他代码区域的颜色（降低 Opacity 或改变前景色），高亮（保持原色或加粗）当前光标上下文（如上下 N 行）的代码。
- **解决方案 B：沉浸式阅读器 Webview 模式**
  打开一个自定义编辑器（Custom Editor）或 Webview。在其中渲染文本，并在 Webview 内部复用现有的 Chrome 扩展前端代码（原生 DOM、CSS 遮罩跟随鼠标移动）。适合阅读 Markdown 或长文档。
- **结论**: 采用 **方案 A** 作为主要体验，因为绝大多数开发者需要在编写和阅读代码时即时启用，而非在一个只读网页中阅读。

## 3. 核心功能映射设计

### 3.1 聚光灯/高亮模式
- **原理**: 
  - 监听 `vscode.window.onDidChangeTextEditorSelection`（光标移动事件）。
  - 获取当前活动编辑器文档的总行数（Range）。
  - **背景变暗 (Spotlight Dim)**: 给全文档应用带有 `opacity` 属性的 Decoration（例如 `opacity: 0.3`），但不包含当前焦点区域的行。
  - **高亮焦点**: 移除当前光标上下 N 行的 Decoration，让它呈现原本的高亮状态，或者为当前行添加一个柔和的背景色 Decoration。
- **自定义参数**:
  - `Opacity (不透明度)` 映射为全局未选中代码的透明度。

### 3.2 整行模式 (阅读尺)
- **原理**: 
  - 仅给当前光标所在的一行或多行添加带有背景色并且设置 `isWholeLine: true` 的 Decoration。
  - 非常契合代码阅读的场景。

### 3.3 形状控制
- VSCode 难以实现完美的圆形或遮罩渐变。将 Chrome 中的“形状切换”逻辑映射为“**焦点范围控制**”：可以设定高亮单行（类似整行模式）、段落（根据缩进或大括号）、或固定上下 N 行的内容。

## 4. 插件架构设计 (Architecture)

### 4.1 目录与工程结构建议
目前的 `stay_focus` 为 Chrome 扩展结构。建议在项目根目录下新建一个 `vscode/` 目录，或新建分支：
```text
stay_focus/
├── vscode/                   # VSCode 插件根目录
│   ├── package.json          # 插件清单 (含命令、配置项)
│   ├── src/
│   │   ├── extension.ts      # 入口文件（注册命令/事件监听）
│   │   ├── decorations.ts    # 实时计算和更新高亮范围的核心逻辑
│   │   └── config.ts         # 读取并监听 settings.json 的参数
│   └── images/               # 共享现有的图标文件
└── README.md
```

### 4.2 package.json 配置 (贡献点 contributes)
- **命令 (commands)**:
  - `stayFocus.toggle`: 开启/关闭专注模式（可绑定快捷键，例如 `Ctrl+Shift+L`）
- **设置 (configuration)**:
  - `stayFocus.opacity`: 非焦点区域的代码透明度 (默认 0.3)
  - `stayFocus.focusRange`: 焦点区域包含当前光标上下的行数 (默认 1)
  - `stayFocus.mode`: `spotlight` (全局变暗) 或 `highlight` (仅当前区域高亮)
- **状态栏 (statusBar)**:
  - 在 VSCode 右下角状态栏添加一个小图标，随时点击可切换启用/禁用，类似于原有的 Chrome 图标状态。

## 5. 开发路径与后续迭代 (Walkthrough)

1. **环境准备**: 使用 `yo code` 创建 TypeScript 语言的插件脚手架环境。
2. **状态管理**: 在 `extension.ts` 实现总开关状态，更新 StatusBar 图标。
3. **实现核心装饰器 (Decorators)**: 编写动态计算装饰器 Range 的函数，监听活动窗口改变和光标位移，频繁计算 Dim 区域范围（整个文档抛除中间 N 行）。
4. **用户设置集成**: 关联 `workspace.getConfiguration("stayFocus")`，在用户于设置面板修改透明度等参数时立即重新渲染装饰器。
5. **打包并发布**: 复用项目中的 `package.json` 中的发版逻辑，配置 `vsce package` 构建 `.vsix` 插件文件供内测，并在 VSCode Marketplace 发布。

通过以上架构，你可以最大程度还原 Stay Focus 在浏览器端提供的高亮聚光灯与专注能力，并且融入到开发者的代码阅读工作流中。
