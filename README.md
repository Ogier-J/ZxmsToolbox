# ZXMS 极客工具箱 (ZxmsToolbox)

一个基于 **Blazor WebAssembly (.NET 10)** 与 **MudBlazor** 构建的在线工具箱，集成开发者工具、办公工具以及轻量小游戏。

> 🔒 所有功能均在浏览器本地运行，数据不会上传至服务器。

## 🌐 在线体验

- 官方地址：https://zxms.dpdns.org
- GitHub Pages：https://ogier-j.github.io/ZxmsToolbox

---

## ✨ 项目特色

- 🚀 基于 Blazor WebAssembly，纯前端运行
- 🔒 数据本地处理，无需上传
- 📱 响应式设计，支持桌面端与移动端
- 🎨 基于 MudBlazor 构建现代化 UI
- ⚡ 无后端依赖，可部署至静态托管平台
- 🎮 内置多个经典小游戏

---

## 📸 项目预览

> 建议后续补充截图

---

## 🛠️ 功能列表

### 开发者工具

| 功能 | 说明 |
|--------|--------|
| Base64 编解码 | 文本编码与解码 |
| JSON 工具 | 格式化、压缩、校验 |
| 时间戳转换 | Unix 时间戳与日期互转 |
| 哈希计算 | MD5、SHA1、SHA256、SHA384、SHA512 |
| UUID 生成 | 批量生成 GUID |
| URL 编解码 | URL Encode / Decode |

### 办公与日常工具

| 功能 | 说明 |
|--------|--------|
| 密码生成器 | 自定义长度与字符集 |
| 字数统计 | 字符、单词、中文、行数、UTF-8 字节 |
| 颜色转换 | HEX、RGB、HSL 互转 |

### 休闲小游戏

| 游戏 | 说明 |
|--------|--------|
| 2048 | 方向键或 WASD 操作 |
| 井字棋 | 玩家对战 AI |
| 贪吃蛇 | 经典贪吃蛇玩法 |

---

## 📦 技术栈

- .NET 10
- Blazor WebAssembly
- MudBlazor 9.x
- C#
- GitHub Pages

---

## 💻 本地开发

### 克隆项目

```bash
git clone https://github.com/Ogier-J/ZxmsToolbox.git
```

```bash
cd ZxmsToolbox
```

### 运行项目

```bash
dotnet restore
```

```bash
dotnet run
```

默认访问 `https://localhost:xxxx`

---

## 🚀 发布部署

### GitHub Pages

```bash
dotnet publish -c Release -o publish
```

发布后将生成的静态文件部署至 GitHub Pages。

### IIS / Nginx

```bash
dotnet publish -c Release
```

发布目录可直接托管。

---

## 📋 Roadmap

计划中的功能：

- [ ] JWT 解析工具
- [ ] 二维码生成器
- [ ] 正则表达式测试工具
- [ ] Markdown 预览工具
- [ ] Cron 表达式解析器
- [ ] 二维码识别
- [ ] 图片 Base64 转换
- [ ] 文本 Diff 对比工具

---

## 🤝 贡献

欢迎提交：

- Issue
- Pull Request
- 功能建议

如果觉得项目有帮助，欢迎点个 ⭐ Star 支持。

---

## 📄 License

本项目采用 MIT License 开源。
