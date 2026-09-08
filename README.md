# ZXMS 极客工具箱 (ZxmsToolbox)

基于 C# 和 Blazor WebAssembly (.NET 10) + MudBlazor 打造的轻量级在线小工具与摸鱼小游戏集合。  
**全部工具均在浏览器本地运行，数据不会上传服务器。**

## 🌐 在线体验
- **官方域名**：[https://zxms.dpdns.org](https://zxms.dpdns.org)
- **GitHub Pages 备用地址**：[https://ogier-j.github.io/ZxmsToolbox](https://ogier-j.github.io/ZxmsToolbox)

## 🛠️ 已实现功能

### 开发者工具
- [x] Base64 文本编解码
- [x] JSON 格式化 / 压缩 / 校验
- [x] Unix 时间戳 ↔ 日期时间 互转
- [x] 哈希计算（MD5 / SHA1 / SHA256 / SHA384 / SHA512）
- [x] UUID / GUID 批量生成
- [x] URL 编解码

### 站长与日常办公
- [x] 随机密码生成器（可配置长度与字符集）
- [x] 文本字数统计（字符 / 单词 / 中文 / 行数 / UTF-8 字节）
- [x] 颜色格式转换（HEX ↔ RGB ↔ HSL + 实时预览）
- [x] **AI 图片修复 / 水印去除**（本地画笔遮罩 + 智能填充 / 透明抠图 / 一键去背景，纯浏览器处理）
- [x] **DragonBones 即时预览**（支持大文件夹批量扫描与单套骨骼/图集/贴图加载，Pixi 渲染）
- [x] **粒子特效在线编辑器**（Cocos2d-x / Creator 粒子系统实时预览与 .plist 导出）

### 摸鱼与互动小游戏
- [x] 2048（方向键 / WASD）
- [x] 井字棋（玩家 vs 简单 AI）
- [x] 贪吃蛇（方向键 / WASD）

## 🖼️ 关于 AI 图片修复
参考开源项目 [WatermarkOut / free-ai-watermark-remover](https://github.com/IamRamgarhia/free-ai-watermark-remover) 的设计思路：
- 图片全程在浏览器内处理，不上传
- 支持画笔涂抹遮罩、橡皮修正
- 当前内置高效局部像素修复算法（适合小面积半透明水印、角标、文字）
- 完整 MI-GAN（ONNX ≈29MB）深度生成模型可后续按需通过 JS 互操作加载，以获得更强填充效果

## 💻 本地开发与构建
1. 安装 [.NET 10 SDK](https://dotnet.microsoft.com/)
2. 克隆本仓库：
   ```bash
   git clone https://github.com/Ogier-J/ZxmsToolbox.git
   cd ZxmsToolbox
   ```
3. 还原依赖并运行：
   ```bash
   dotnet restore
   dotnet run
   ```
4. 发布（用于 GitHub Pages 等静态托管）：
   ```bash
   dotnet publish -c Release -o publish
   ```

## 📦 技术栈
- .NET 10 Blazor WebAssembly
- MudBlazor 9.x
- 纯客户端逻辑，无后端依赖
- 图片修复使用 HTML5 Canvas + 自研局部填充算法

## 📝 许可证
MIT
