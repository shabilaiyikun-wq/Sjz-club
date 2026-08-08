# 三角洲护航小程序 · 开发恢复笔记

> 关机/换机器后照着这份文档就能继续开发，不用重新熟悉项目。

## 启动步骤（每次都要）

1. **启动后端**
   ```bash
   cd E:\Sjz-club\server && npm start
   ```
   - 端口 3000，数据库 `server/data/app.db`
   - 重启用：`netstat -ano | grep :3000` 找 PID → `taskkill //F //PID <pid>` → 再启动

2. **微信开发者工具**打开 `E:\Sjz-club`，点编译

3. **管理后台**：浏览器开 `http://127.0.0.1:3000/admin`，密码 `admin123`

4. **真机测试**（可选）：`utils/config.js` 的 `API_BASE` 改成 `http://192.168.1.3:3000`，工具勾选「局域网调试」

## 项目结构

- `E:\Sjz-club` — 微信小程序前端（原生 WXML/WXSS/JS，无框架）
- `E:\Sjz-club\server` — Node + Express + 内置 node:sqlite 后端
- `data.js` — 前端兜底数据（趣味单/时长），价格单位为元
- `server/data/app.db` — SQLite 数据库，金额一律存**分**
- `server/admin.html` — 管理后台（仪表盘 tab 分页：仪表盘/订单/用户/打手申请/护航打手）

## 当前功能状态

- ✅ 趣味单点单（体验区/常规区/赌约区/赌红区，限购 once/weekly）
- ✅ 护航下单（选打手 → 选时长 → 填区服/游戏ID/微信 → 支付）
- ✅ 钱包充值/余额支付（mock 支付直接成功）
- ✅ 打手体系：申请（填真实姓名/手机/微信 + 展示资料）→ 后台审核 → 通过后自动上大神榜
  - 申请时填：大神昵称/段位/单价/端别（手机/电脑，作为标签置顶）/预设标签多选/简介
  - 顾客侧卡片标签最多显示 3 个，标签筛选条用完整标签
- ✅ 打手中心：任务大厅抢单 / 我的接单 / 我的资料（可自行修改，立即生效）
- ✅ 管理后台：订单状态改、打手增删改、申请审核

## 最近改动（本次会话收尾）

- 后台改成分页 tab；标签展示限 3 个；下单页删了「目标段位」和「游戏端别」
- 护航定价 = 大神起步价 + 时长费（服务端算，`boosterId + hourId`）
- 打手申请改预设标签多选（12 个预设：秒接单/稳上分/包段位/不掉分/上分快/语音开黑/1对1/技术流/加急/深夜在线/战神/教学陪练）
- 数据库打手数据已全部清空（大神榜/申请/用户状态），从零开始重新申请

## 上线前待办

- 微信支付：`server/config.js` 改 `mockPay: false`，接真实商户号（pay.js 已留 prepay/notify 结构）
- 微信登录：`config.js` 填 `wx.secret`（现在无 secret 时 openid 模拟为 `dev_<code>`，新用户送 ¥128.50 演示余额）
- 改 `config.js` 的 `adminPassword`（现在 admin123）
- doc 页占位文案

## 关键技术约定

- 金额存分，API 层转元；`fen2yuan` 在后端，前端直接用元
- 订单价格服务端重算，客户端不可定价
- `utils/catalog.js` 全局缓存商品目录（打手/趣味单/时长），拉后端 `/api/products`，失败兜底 `data.js`
- 前端统一请求 `utils/request.js`：自动登录、带 token、401 自动重登
- 护航订单 spec 存 `{booster, hour, hourId}`；fmtSpec 兼容旧数据（有 rank 显示 rank，有 platform 显示端别前缀）
- 打手申请审核通过 → 自动 INSERT boosters（用申请填的资料），用户可自己在「打手中心→我的资料」改
