# 保持专注 (Stay Focus) 桌面端应用设计方案

## 1. 背景与目标
将 "Stay Focus" 的核心体验迁移为全局桌面应用。目标是实现一个跨所有操作系统窗口的系统级遮罩（Spotlight/Focus 效果），并在鼠标周围保持清晰，以此帮助用户在阅读 PDF、系统应用或其他办公软件时集中注意力。

## 2. 技术选型 (Electron 方案为主)
- **底层框架**: 推荐使用 **Electron** 或 **Tauri**。鉴于本项目原有代码基于 HTML/CSS/JS，选择 Electron 可以直接复用绝大部分代码（如控制面板 UI、全屏遮罩及鼠标事件机制）。
- **核心机制**: 创建一个**无边框、全透明、永远置顶且鼠标穿透**（Click-through）的全屏窗口。

## 3. 核心功能实现分析

### 3.1 全屏透明穿透窗口 (Click-through Layer)
- 在 Electron 的 Main 进程中配置窗口：
  ```javascript
  const win = new BrowserWindow({
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    webPreferences: { nodeIntegration: true }
  });
  // 忽略鼠标事件，允许用户点击下方的实际应用
  win.setIgnoreMouseEvents(true, { forward: true });
  ```
- **Windows / macOS 支持**: `setIgnoreMouseEvents` 带有 `forward: true` 参数可以允许窗口虽然穿透鼠标点击，但仍然能捕获全局的 `mousemove` 消息。如果部分系统受限，也可引入 `iohook` 或轮询 `screen.getCursorScreenPoint()` 来实时获取鼠标坐标。

### 3.2 渲染遮罩效果
- 在 Renderer 进程（全屏的透明网页）中，完全复用目前 Chrome 扩展里 [content.js](file:///d:/D-Destop/%E9%AB%98%E4%BA%A7%E4%BC%BC%E6%AF%8D%E7%8C%AA/stay_focus/content.js) 和 [content.css](file:///d:/D-Destop/%E9%AB%98%E4%BA%A7%E4%BC%BC%E6%AF%8D%E7%8C%AA/stay_focus/content.css) 中根据坐标生成 `radial-gradient` 黑底透明孔的视觉逻辑。
- 跟随鼠标移动，不断更新 `div` 遮罩的孔洞位置。

### 3.3 系统托盘与控制面板
- 将原本的 Chrome Popup 面板移植为**系统托盘（System Tray）管理面板**。
- 左键点击托盘图标时，弹出一个常规设置窗口（非透明），包含：透明度调节、模式切换、形状切换等设置。
- 右键点击托盘图标弹出常用菜单：【开启/关闭】、【重启应用】、【退出应用】等。

### 3.4 全局快捷键控制
- 使用 Electron 的 `globalShortcut` 模块，注册如 `Ctrl+Shift+L` 的系统级快捷键，方便用户随时随地秒切聚光灯。

## 4. 架构及工程化规划

```text
stay_focus_desktop/
├── package.json          # Electron 应用配置
├── main/
│   ├── index.js          # Electron 主进程：窗口管理、托盘、快捷键、IPC 通信
│   └── preload.js        # 连接 Main 与 Renderer
├── renderer/
│   ├── overlay.html      # 全屏遮罩层界面
│   ├── overlay.js        # 实时绘制孔洞逻辑
│   ├── settings.html     # 设置面板 (替代原 popup)
│   └── settings.js       
├── assets/               # 图标资源 (tray-icon.png)
└── build/                # Electron Builder 打包配置
```

## 5. 预期挑战与解决方案
1. **多显示器支持**: Electron 需监听所有屏幕分辨率，当检测到多屏时，可以创建多个置顶窗口或建立一个跨越虚拟分辨率总和的超级窗口。
2. **性能消耗**: 全屏透明图层和高频率的 `mousemove` 可能会增加一点 GPU/CPU 开销，应使用 `requestAnimationFrame` 限制绘制帧率。

---
## 审查项 (User Review Required)
> [!IMPORTANT]
> 请确认是否采用 Electron 作为桌面端的开发框架。
> 说明：如果您非常看重最终打包产生的文件体积大小，我们确实可以选择使用 Tauri (基于 Rust)。但使用 Tauri 涉及到底层 **Rust API 绑定** 工作。原因在于我们应用的核心目标之一是：“**让全屏窗口透明，却又允许鼠标点击穿透到底层桌面，同时还要通过鼠标坐标维持一个可见的光圈**”。 
> - 在 **Electron** 中，只需要一行 JS 代码：`win.setIgnoreMouseEvents(true, { forward: true })` 即可完美实现。
> - 在 **Tauri** 中，暂无这行代码的完美等价物（特别是跨越 Windows 和 macOS 的统一支持）。可能需要编写一些较底层的 Rust 代码（例如分别调用 `windows-rs` / cocoa 级别的 API）去实现鼠标穿透机制，或者引入诸如 `rdev` 之类的 Rust 组件处理全局位置监听。
