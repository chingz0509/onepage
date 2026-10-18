# OnePage 抓取后端

前端和 API 可以一起部署在 Vercel。现有前端已经调用 `/api/fetch`，无需单独配置 API 域名。

## 接口

`GET /api/screenshot?url=<公开网站地址>` 用隔离的浏览器截取 1200×675 的桌面首屏，返回 `previewImage` 公共图片 URL 与页面标题。截图启用图片和字体加载，仍复用公开 IP 校验和浏览器网络代理；不会登录目标网站。JPEG 不超过 128 KiB，存入现有 `onepage-avatars` 公共桶的 `previews/` 内容哈希目录，无需修改数据库结构。成功结果在函数实例中缓存 6 小时，并合并同时发生的同一 URL 请求。截图失败时保留纯链接，不阻止发布；访客直接读取已存图片，不重复截图。

`GET /api/fetch?url=https%3A%2F%2Fhuaban.com%2Fspace`

默认 `mode=auto`：平台数据适配 → 读取 HTML → 没有指标时尝试内置无头浏览器 → 可选商业抓取服务 → 返回可用的原始页面信息。也可加 `&mode=browser` 强制浏览器。Vercel 上无需配置浏览器地址或密钥。

成功结果包含 `ok: true`、`title`、`image`、`description`、`metrics`、`finalUrl` 和 `source`（api/http/browser/scraper）。抓取失败返回 `ok: false` 和 `reason`，兼容现有前端；不把空壳或常见验证页作为成功结果。此接口提取页面摘要与指标，不保存截图、全文或用户数据。

### 花瓣公开画板

`server/huaban.ts` 将 `https://huaban.com/boards/<id>` 适配到花瓣当前的 `https://api.huaban.com/v3/boards/<id>?fields=board:BOARD_DETAIL`。直接读取 `board.pin_count`，不把作者粉丝数当作画板采集数；描述包含作者和采集数。

请求不携带 Cookie 或登录凭据，与网页请求共用公开 IP、跳转、响应大小和超时限制。仅接受 ID 一致、`is_private=0` 且计数有效的画板。接口失败或数据不可用时，继续原有网页读取流程。此入口是实测可用的站点接口，不是长期版本兼容承诺。

2026-10-13 实测公开画板 `27823016` 返回作者 cSummer、标题「作品」、111 张采集，本地完整 `/api/fetch` 路径约 0.5 秒。上线后仍需从生产环境验证，避免把本地成功等同于云端可用。

## 本地运行

WebBridge 默认通过 `http://172.104.164.40:10086/command` 连接服务器上的浏览器，本地开发和 Vercel 使用同一默认地址，不依赖个人电脑上的 WebBridge。可用服务端环境变量 `WEBBRIDGE_URL` 覆盖；如果 Vercel 已配置旧地址，需要更新该变量并重新部署。服务器浏览器需要保持运行，登录态也需在服务器上维护。

使用 Node.js 22，安装依赖后运行 `npm run dev`。内置 Chromium 面向 Linux；macOS / Windows 本地开发请在 `.env.local` 设置 `CHROME_EXECUTABLE_PATH` 指向已安装的 Chrome。Vite 会仅在服务端读取这些变量；不要加 `VITE_` 前缀。

运行 `npm test` 验证后端规则，`npm run build` 检查构建。

## Vercel 部署

1. 在 Vercel 导入该仓库，框架选 Vite，Node.js 版本选 22.x。
2. 构建命令 `npm run build`、输出目录 `dist` 已写入 `vercel.json`；`api/fetch.ts` 会部署为 Node.js Function，最长运行时间配置为 90 秒。
3. 部署会包含 `@sparticuz/chromium` 的浏览器文件，函数自动解压并启动。可选的 `BROWSER_WS_ENDPOINT` 仅用于覆盖默认行为、连接已有远程浏览器服务。
4. 可选：设置 `SCRAPER_PROVIDER=zenrows` 或 `scrapingbee` 及 `SCRAPER_API_KEY`，启用已有的商业抓取回退。这些服务由你单独开通和计费。
5. 部署后访问 `/api/fetch?url=https%3A%2F%2Fexample.com` 验证普通抓取，再以 `mode=browser` 验证浏览器连接。

手机和电脑访客使用同一个服务端接口，不需要在自己的设备上安装浏览器。读取失败时输入区显示原因，可重试或仅保存链接。

## 边界

- 面向公开 HTTP(S) 网页，不承诺所有网站均能成功。登录墙、验证码、地区限制会影响结果；`huaban.com/space` 返回什么取决于匿名访问时实际展示的页面。
- 每次浏览器抓取使用独立临时会话，结束后关闭；不共享用户 Cookie。登录后抓取需要另做用户认证与登录态隔离。
- 直连请求检查 DNS 结果、固定连接 IP，并逐次验证跳转。内置浏览器通过本地 HTTP/CONNECT 代理访问已验证的公开 IP，禁用 QUIC 和非代理 WebRTC；远程浏览器模式仍需要服务商提供网络隔离。
- 每个函数实例同时最多启动两个浏览器，页面阶段最长约 30 秒。此限制不等同于跨实例的分布式限流；高流量场景仍需 Vercel 防火墙和用量预算。
- 浏览器在本次请求结束时关闭。错误原因包括 `site-blocked`、`login-required`、`browser-unavailable`、`busy` 等；不再将“未配置远程浏览器”作为默认状态。

参考：[Vercel Functions 限制](https://vercel.com/docs/functions/limitations)、[Puppeteer 远程连接](https://pptr.dev/api/puppeteer.puppeteer.connect)、[xiaohongshu-mcp](https://github.com/xpzouying/xiaohongshu-mcp)。
