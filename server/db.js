const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { BOOSTERS, FUN_ORDERS, RANKS_SPEC, HOURS } = require('../data.js');

fs.mkdirSync(path.dirname(config.dbFile), { recursive: true });
const db = new DatabaseSync(config.dbFile);

const SCHEMA = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  openid TEXT UNIQUE NOT NULL,
  nickname TEXT DEFAULT '',
  balance INTEGER NOT NULL DEFAULT 0,   -- 单位：分
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS boosters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  tags TEXT
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

/* ===== 初始化种子数据（与前端 data.js 同源，price 统一存分） ===== */
function seed() {
  if (db.prepare('SELECT COUNT(*) c FROM boosters').get().c === 0) {
    const insB = db.prepare(
      'INSERT INTO boosters (name, rank, score, orders, price, modes, tags, desc) VALUES (?,?,?,?,?,?,?,?)'
    );
    for (const b of BOOSTERS) {
      insB.run(b.name, b.rank, b.score, b.orders, b.price * 100,
        JSON.stringify(b.modes), JSON.stringify(b.tags), b.desc);
    }
  }
  if (db.prepare('SELECT COUNT(*) c FROM fun_orders').get().c === 0) {
    const insF = db.prepare(
      'INSERT INTO fun_orders (name, price, sub, desc, tags) VALUES (?,?,?,?,?)'
    );
    for (const f of FUN_ORDERS) {
      insF.run(f.name, f.price * 100, f.sub, f.desc, JSON.stringify(f.tags));
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
}

seed();

module.exports = db;
