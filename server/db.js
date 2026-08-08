const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { FUN_ORDERS, RANKS_SPEC, HOURS } = require('../data.js');

fs.mkdirSync(path.dirname(config.dbFile), { recursive: true });
const db = new DatabaseSync(config.dbFile);

const SCHEMA = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  openid TEXT UNIQUE NOT NULL,
  nickname TEXT DEFAULT '',
  balance INTEGER NOT NULL DEFAULT 0,   -- 单位：分
  booster_status INTEGER NOT NULL DEFAULT 0, -- 0未申请 1审核中 2已通过(打手)
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS boosters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE,               -- 关联 users.id：打手审核通过自动上架，NULL=后台手动上架的补充大神
  name TEXT NOT NULL,
  rank TEXT,
  score REAL,
  orders INTEGER DEFAULT 0,
  price INTEGER NOT NULL,               -- 分
  modes TEXT,                           -- JSON 数组
  tags TEXT,                            -- JSON 数组
  desc TEXT
);

CREATE TABLE IF NOT EXISTS fun_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,               -- 分
  sub TEXT,
  desc TEXT,
  tags TEXT,
  category TEXT DEFAULT '常规区',        -- 体验区/常规区/赌约区/赌红区
  buy_limit TEXT,                       -- once每人一次 / weekly每周一次 / NULL不限
  image TEXT                            -- 图片路径，如 /images/fun-banner.jpg
);

CREATE TABLE IF NOT EXISTS spec_ranks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  price INTEGER NOT NULL                -- 分
);

CREATE TABLE IF NOT EXISTS spec_hours (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  price INTEGER NOT NULL,               -- 分
  tip TEXT
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no TEXT UNIQUE NOT NULL,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,                   -- escort | fun
  product_id INTEGER,
  product_name TEXT,
  spec TEXT,                            -- JSON：rank/hour/qty
  server TEXT,
  game_id TEXT,
  wx TEXT,
  note TEXT,
  total INTEGER NOT NULL,               -- 分
  status TEXT NOT NULL DEFAULT 'unpaid',-- unpaid/paid/ongoing/done/refunded/cancelled
  booster_id INTEGER,                   -- 接单打手 user_id
  pay_method TEXT,
  paid_at TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);

  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,                   -- 真实姓名
  phone TEXT NOT NULL,                  -- 手机号
  wx TEXT NOT NULL,                     -- 微信号
  nickname TEXT,                        -- 大神昵称（大神榜展示名）
  rank TEXT,                            -- 段位
  price INTEGER,                        -- 单价（分）
  intro TEXT,                           -- 简介
  tags TEXT,                            -- 标签（逗号分隔）
  platform TEXT,                        -- 端别（手机端/电脑端），审核后并入大神标签
  status INTEGER NOT NULL DEFAULT 0,    -- 0待审 1通过 2驳回
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS fortune_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  date TEXT NOT NULL,                   -- 运势日期（当天限一次）
  fortune TEXT,                         -- JSON：level/emoji/text
  created_at TEXT DEFAULT (datetime('now','localtime')),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS wallet_tx (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,              -- 分，正=入 负=出
  type TEXT NOT NULL,                   -- recharge/pay/refund
  balance_after INTEGER,
  order_id INTEGER,
  remark TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);
`;

db.exec(SCHEMA);

// 存量库迁移：boosters 表补 user_id 列（打手审核通过自动上架用；老库没这列时执行）
const boosterCols = db.prepare('PRAGMA table_info(boosters)').all();
if (!boosterCols.some((c) => c.name === 'user_id')) {
  db.exec('ALTER TABLE boosters ADD COLUMN user_id INTEGER');
}

const appNeed = { nickname: 'TEXT', rank: 'TEXT', price: 'INTEGER', intro: 'TEXT', tags: 'TEXT', platform: 'TEXT' };
for (const [c, t] of Object.entries(appNeed)) {
}

// 存量库迁移：users 表补打手状态字段（老库没有这列时执行）
const userCols = db.prepare('PRAGMA table_info(users)').all();
if (!userCols.some((c) => c.name === 'booster_status')) {
  db.exec('ALTER TABLE users ADD COLUMN booster_status INTEGER NOT NULL DEFAULT 0');
}
// 存量库迁移：fun_orders 补分区/限购列，旧趣味单作废（seed 用报价单玩法重建）
const funCols = db.prepare('PRAGMA table_info(fun_orders)').all();
if (!funCols.some((c) => c.name === 'category')) {
  db.exec("ALTER TABLE fun_orders ADD COLUMN category TEXT DEFAULT '常规区'");
  db.exec('DELETE FROM fun_orders');
}
if (!funCols.some((c) => c.name === 'buy_limit')) {
  db.exec('ALTER TABLE fun_orders ADD COLUMN buy_limit TEXT');
  db.exec('DELETE FROM fun_orders');  // 重建带限购配置的玩法
  db.exec("DELETE FROM sqlite_sequence WHERE name='fun_orders'");  // 重置自增，id 回到 1
}
	if (!funCols.some((c) => c.name === 'image')) {
	  db.exec("ALTER TABLE fun_orders ADD COLUMN image TEXT DEFAULT '/images/fun-banner.jpg'");
	}
	// 迁移：orders 表补 done_image 列（护航完成截图）
	var ordCols2 = db.prepare("PRAGMA table_info(orders)").all();
	if (!ordCols2.some(function(c) { return c.name === "done_image"; })) {
	  db.exec("ALTER TABLE orders ADD COLUMN done_image TEXT");
	}
	// 迁移：boosters 表补 avatar 列（打手头像，默认用趣味单图片）
	var boosterCols2 = db.prepare("PRAGMA table_info(boosters)").all();
	if (!boosterCols2.some(function(c) { return c.name === "avatar"; })) {
	  db.exec("ALTER TABLE boosters ADD COLUMN avatar TEXT DEFAULT '/images/fun-banner.jpg'");
	}
// fun_orders 是配置表，id 需与 data.js 一致（从 1 连续）；发现漂移则重建，防前端传的 productId 查不到
const fstat = db.prepare('SELECT COUNT(*) c, COALESCE(MIN(id),0) mn, COALESCE(MAX(id),0) mx FROM fun_orders').get();
if (fstat.c > 0 && (fstat.mn !== 1 || fstat.mx !== fstat.c)) {
  db.exec('DELETE FROM fun_orders');
  db.exec("DELETE FROM sqlite_sequence WHERE name='fun_orders'");
}

/* ===== 初始化种子数据（与前端 data.js 同源，price 统一存分） ===== */
function seed() {
  // boosters 表不再 seed 写死数据：打手审核通过自动上架 + 后台手动上架补充大神，资料由打手自行维护
  if (db.prepare('SELECT COUNT(*) c FROM fun_orders').get().c === 0) {
    const insF = db.prepare(
      'INSERT INTO fun_orders (name, price, sub, desc, tags, category, buy_limit, image) VALUES (?,?,?,?,?,?,?)'
    );
    for (const f of FUN_ORDERS) {
      insF.run(f.name, f.price * 100, f.sub, f.desc, JSON.stringify(f.tags), f.category, f.limit || null, f.image || null);
    }
  }
  if (db.prepare('SELECT COUNT(*) c FROM spec_ranks').get().c === 0) {
    const insR = db.prepare('INSERT INTO spec_ranks (label, price) VALUES (?,?)');
    for (const r of RANKS_SPEC) insR.run(r.t, r.p * 100);
  }
  if (db.prepare('SELECT COUNT(*) c FROM spec_hours').get().c === 0) {
    const insH = db.prepare('INSERT INTO spec_hours (label, price, tip) VALUES (?,?,?)');
    for (const h of HOURS) insH.run(h.t, h.p * 100, h.s);
  }
  // 限购配置（once每人一次/weekly每周一次）以 data.js 为准，每次启动同步
  const syncLim = db.prepare('UPDATE fun_orders SET buy_limit=? WHERE name=?');
  for (const f of FUN_ORDERS) syncLim.run(f.limit || null, f.name);
}

seed();

module.exports = db;
