# OnePage 抓取后端

前端和 API 可以一起部署在 Vercel。现有前端已经调用 `/api/fetch`，无需单独配置 API 域名。

## 接口

`GET /api/fetch?url=https%3A%2F%2Fhuaban.com%2Fspace`

默认 `mode=auto`：读取 HTML → 没有指标时尝试无头浏览器 → 可选商业抓取服务 → 返回可用的原始页面信息。也可加 `&mode=browser` 强制浏览器；未配置浏览器时明确返回 `browser-not-configured`。

成功结果包含 `ok: true`、`title`、`image`、`description`、`metrics`、`finalUrl` 和 `source`（http/browser/scraper）。抓取失败返回 `ok: false` 和 `reason`，兼容现有前端；不把空壳或常见验证页作为成功结果。此接口提取页面摘要与指标，不保存截图、全文或用户数据。

## 本地运行

使用 Node.js 22 或更新版本，安装依赖后运行 `npm run dev`。将 `.env.example` 复制为 `.env.local` 并配置需要的服务。Vite 会仅在服务端读取这些变量；不要加 `VITE_` 前缀。

运行 `npm test` 验证后端规则，`npm run build` 检查构建。

## Vercel 部署

1. 在 Vercel 导入该仓库，框架选 Vite，Node.js 版本选 22.x。
2. 构建命令 `npm run build`、输出目录 `dist` 已写入 `vercel.json`；`api/fetch.ts` 会部署为 Node.js Function，最长运行时间配置为 90 秒。
3. 若需要 JS 渲染，在项目环境变量中设置 `BROWSER_WS_ENDPOINT`：由远程 Chromium 服务提供的完整 CDP WebSocket 地址，例如 `wss://<browser-host>/?token=<secret>`。可使用支持 CDP 连接及独立 BrowserContext 的托管服务或自建服务。
4. 可选：设置 `SCRAPER_PROVIDER=zenrows` 或 `scrapingbee` 及 `SCRAPER_API_KEY`，启用已有的商业抓取回退。这些服务由你单独开通和计费。
5. 部署后访问 `/api/fetch?url=https%3A%2F%2Fexample.com` 验证普通抓取，再以 `mode=browser` 验证浏览器连接。

没有配置远程浏览器时，普通 HTML 抓取仍可用，但不会自动具备完整的 JS 页面抓取能力。这里只提供部署文件，不会自动创建付费服务或发布生产环境。

## 边界

- 面向公开 HTTP(S) 网页，不承诺所有网站均能成功。登录墙、验证码、地区限制会影响结果；`huaban.com/space` 返回什么取决于匿名访问时实际展示的页面。
- 每次浏览器抓取使用独立临时会话，结束后关闭；不共享用户 Cookie。登录后抓取需要另做用户认证与登录态隔离。
- 直连请求检查 DNS 结果、固定连接 IP，并逐次验证跳转。浏览器请求也检查目标地址，但浏览器服务仍必须部署在禁止访问内网和云元数据地址的隔离网络中：页面 Worker、WebSocket 和远程 DNS 重绑定不能仅靠请求拦截完全控制。
- 面向公网开放前，应在 Vercel 防火墙配置适合业务的限流与用量预算。当前接口无账户系统，也没有持久化的分布式限流；浏览器服务须设置并发和会话时长限制，避免异常断连后遗留会话。
- Vercel 不保存浏览器进程；远程浏览器承担页面渲染，Vercel 承担 API 和提取逻辑。此设计参考小红书 MCP 的浏览器打开页面、等待渲染、读取内容的思路，未移植其站点专用登录和指纹实现。

参考：[Vercel Functions 限制](https://vercel.com/docs/functions/limitations)、[Puppeteer 远程连接](https://pptr.dev/api/puppeteer.puppeteer.connect)、[xiaohongshu-mcp](https://github.com/xpzouying/xiaohongshu-mcp)。
