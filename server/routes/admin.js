const router = require('express').Router();
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const config = require('../config');
const db = require('../db');

const fen2yuan = (f) => f / 100;
const parseArr = (s) => { try { return JSON.parse(s || '[]'); } catch (e) { return []; } };

// 管理后台登录：内存 token + cookie（后端重启后需重新登录）
let adminToken = null;

function getCookie(req, name) {
  const m = (req.headers.cookie || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : '';
}

function checkAdmin(req, res, next) {
  if (adminToken && getCookie(req, 'df_admin') === adminToken) return next();
  return res.status(401).json({ code: 401, msg: '未登录' });
}

/** POST /api/admin/login  { password } */
router.post('/login', (req, res) => {
  if ((req.body || {}).password === config.adminPassword) {
    adminToken = crypto.randomUUID();
    res.setHeader('Set-Cookie', 'df_admin=' + adminToken + '; HttpOnly; Path=/; Max-Age=86400');
    return res.json({ code: 0, msg: '登录成功' });
  }
  return res.status(401).json({ code: 401, msg: '密码错误' });
});
const STATUS_TEXT = {
  unpaid: '待支付', paid: '待开始', ongoing: '进行中',
  done: '已完成', refunded: '已退款', cancelled: '已取消'
};

/** 订单规格存的是 JSON 字符串，转成人话：趣味单「×3」、护航「大神 / 全程包段位」 */
function fmtSpec(raw) {
  try {
    const s = JSON.parse(raw);
    const pre = s.platform ? (s.platform === '电脑端' ? '💻电脑端 · ' : '📱手机端 · ') : '';
    if (s && s.qty) return pre + '×' + s.qty;
    if (s && (s.booster || s.rank)) return pre + (s.booster || s.rank) + ' / ' + s.hour;
    return raw || '';
  } catch (e) {
    return raw || '';
  }
}

/** GET /api/admin/dashboard  管理后台聚合数据 */
router.get('/dashboard', checkAdmin, (req, res) => {
  const st = db.prepare(`SELECT
      COUNT(*) total,
      SUM(CASE WHEN status='unpaid' THEN 1 ELSE 0 END) unpaid,
      SUM(CASE WHEN status IN ('paid','ongoing') THEN total ELSE 0 END) revenue,
      SUM(CASE WHEN date(created_at)=date('now','localtime') THEN 1 ELSE 0 END) todayOrders
    FROM orders`).get();
  const us = db.prepare('SELECT COUNT(*) c, COALESCE(SUM(balance),0) b FROM users').get();

  const orders = db.prepare(
    `SELECT o.*, u.nickname FROM orders o LEFT JOIN users u ON u.id = o.user_id
     ORDER BY o.id DESC LIMIT 50`
  ).all().map((o) => ({
    id: o.id,
    orderNo: o.order_no,
    nickname: o.nickname,
    doneImage: o.done_image || '',
    type: o.type === 'fun' ? '趣味单' : '护航',
    productName: o.product_name,
    spec: fmtSpec(o.spec),
    total: fen2yuan(o.total),
    status: o.status,
    statusText: STATUS_TEXT[o.status] || o.status,
    server: o.server,
    gameId: o.game_id,
    boosterId: o.booster_id,
    createdAt: o.created_at
  }));

  // 用户列表：带上识别信息（下单/打手申请的微信号、手机号），后台好认人
  const users = db.prepare(`
    SELECT u.id, u.nickname, u.balance, u.booster_status, u.created_at, u.openid,
      COALESCE(
        (SELECT o.wx FROM orders o WHERE o.user_id = u.id AND o.wx != '' AND o.wx IS NOT NULL ORDER BY o.id DESC LIMIT 1),
        (SELECT a.wx FROM booster_applications a WHERE a.user_id = u.id AND a.wx != '' AND a.wx IS NOT NULL ORDER BY a.id DESC LIMIT 1),
        ''
      ) AS wechat,
      COALESCE(
        (SELECT a.phone FROM booster_applications a WHERE a.user_id = u.id AND a.phone != '' AND a.phone IS NOT NULL ORDER BY a.id DESC LIMIT 1),
        ''
      ) AS phone
    FROM users u ORDER BY u.id DESC
  `).all().map((u) => ({
    id: u.id,
    nickname: u.nickname,
    balance: fen2yuan(u.balance),
    boosterStatus: u.booster_status,
    wechat: u.wechat || '',
    phone: u.phone || '',
    createdAt: u.created_at,
    openid: u.openid || ''
  }));

  const boosterApps = db.prepare(
    `SELECT a.*, u.nickname AS user_nickname FROM booster_applications a
     JOIN users u ON u.id = a.user_id ORDER BY a.id DESC`
  ).all().map((a) => ({
    id: a.id,
    userId: a.user_id,
    userNickname: a.user_nickname,
    nickname: a.nickname,
    name: a.name,
    phone: a.phone,
    wx: a.wx,
    rank: a.rank,
    price: fen2yuan(a.price || 0),
    intro: a.intro,
    tags: String(a.tags || '').split(/[,，]/).map((x) => x.trim()).filter(Boolean),
    platform: a.platform,
    status: a.status,
    createdAt: a.created_at
  }));


	  // 趣味单（后台可管理全部字段）
	  const funOrders = db.prepare('SELECT * FROM fun_orders ORDER BY id').all().map((f) => ({
	    ...f, tags: parseArr(f.tags), price: fen2yuan(f.price), buy_limit: f.buy_limit || '' , image: f.image || ''
	  }));
  // 护航打手（后台手动维护）
  const boosters = db.prepare('SELECT * FROM boosters ORDER BY id').all().map((b) => ({
    id: b.id,
    name: b.name,
    rank: b.rank,
    score: b.score,
    orders: b.orders,
    price: fen2yuan(b.price),
    modes: parseArr(b.modes),
    tags: parseArr(b.tags),
    desc: b.desc
  }));

  res.json({
    code: 0,
    data: {
      stats: {
        total: st.total || 0,
        unpaid: st.unpaid || 0,
        revenue: fen2yuan(st.revenue || 0),
        todayOrders: st.todayOrders || 0,
        users: us.c || 0,
        userBalance: fen2yuan(us.b || 0)
      },
      orders,
      users,
      boosterApps,
      boosters,
      funOrders
    }
  });
});

// ---- 护航打手管理（后台手动维护） ----

/** POST /api/admin/boosters  新增打手  body: { name, rank, score, orders, price, modes[], tags[], desc } */
router.post('/boosters', checkAdmin, (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ code: 400, msg: '昵称必填' });
  const priceFen = Math.round(Number(b.price || 0) * 100);
  if (!(priceFen >= 1)) return res.status(400).json({ code: 400, msg: '价格无效' });
  const r = db.prepare(
    `INSERT INTO boosters (name, rank, score, orders, price, modes, tags, desc)
     VALUES (?,?,?,?,?,?,?,?)`
  ).run(
    String(b.name).slice(0, 20),
    String(b.rank || '').slice(0, 10),
    Math.max(0, Math.min(5, Number(b.score) || 0)),
    Math.max(0, Math.floor(Number(b.orders) || 0)),
    priceFen,
    JSON.stringify(b.modes || []),
    JSON.stringify(b.tags || []),
    String(b.desc || '').slice(0, 200)
  );
  res.json({ code: 0, data: { id: Number(r.lastInsertRowid) }, msg: '已新增' });
});

/** PUT /api/admin/boosters/:id  更新打手 */
router.put('/boosters/:id', checkAdmin, (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ code: 400, msg: '昵称必填' });
  const priceFen = Math.round(Number(b.price || 0) * 100);
  if (!(priceFen >= 1)) return res.status(400).json({ code: 400, msg: '价格无效' });
  const r = db.prepare(
    `UPDATE boosters SET name=?, rank=?, score=?, orders=?, price=?, modes=?, tags=?, desc=? WHERE id=?`
  ).run(
    String(b.name).slice(0, 20),
    String(b.rank || '').slice(0, 10),
    Math.max(0, Math.min(5, Number(b.score) || 0)),
    Math.max(0, Math.floor(Number(b.orders) || 0)),
    priceFen,
    JSON.stringify(b.modes || []),
    JSON.stringify(b.tags || []),
    String(b.desc || '').slice(0, 200),
    req.params.id
  );
  if (r.changes === 0) return res.status(404).json({ code: 404, msg: '打手不存在' });
  res.json({ code: 0, msg: '已保存' });
});

/** DELETE /api/admin/boosters/:id  删除打手 */
router.delete('/boosters/:id', checkAdmin, (req, res) => {
  const r = db.prepare('DELETE FROM boosters WHERE id = ?').run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ code: 404, msg: '打手不存在' });
  res.json({ code: 0, msg: '已删除' });
});

/** POST /api/admin/booster/:id/status  { status: 1|2 }  审核打手申请（1通过 2驳回） */
router.post('/booster/:id/status', checkAdmin, (req, res) => {
  const s = req.body && req.body.status;
  if (![1, 2].includes(s)) return res.status(400).json({ code: 400, msg: '非法状态' });
  const a = db.prepare('SELECT * FROM booster_applications WHERE id=?').get(req.params.id);
  if (!a) return res.status(404).json({ code: 404, msg: '申请不存在' });
  db.prepare('UPDATE booster_applications SET status=? WHERE id=?').run(s, a.id);
  // 通过 → 打手；驳回 → 回退未申请
  db.prepare('UPDATE users SET booster_status=? WHERE id=?').run(s === 1 ? 2 : 0, a.user_id);
  // 审核通过：用申请时填的展示资料（昵称/段位/单价/标签/简介）直接上大神榜，无需二次编辑
  if (s === 1) {
    const exist = db.prepare('SELECT id FROM boosters WHERE user_id=?').get(a.user_id);
    if (!exist) {
      const minPrice = db.prepare('SELECT MIN(price) p FROM spec_ranks').get().p || 9900;
      const tags = String(a.tags || '').split(/[,，]/).map((x) => x.trim()).filter(Boolean);
      if (a.platform) tags.unshift(a.platform);  // 端别作为标签置顶展示在客户端
      db.prepare(
        `INSERT INTO boosters (user_id, name, rank, score, orders, price, modes, tags, desc)
         VALUES (?,?,?,?,?,?,?,?,?)`
      ).run(
        a.user_id,
        a.nickname || a.name || '大神',
        a.rank || '',
        5.0,
        0,
        a.price && a.price > 0 ? a.price : minPrice,
        '[]',
        JSON.stringify(tags),
        a.intro || ''
      );
    }
  }
  res.json({ code: 0, msg: s === 1 ? '已通过并上架大神榜' : '已驳回' });
});

/** POST /api/admin/orders/:id/status  管理后台改订单状态 */
router.post('/orders/:id/status', checkAdmin, (req, res) => {
  const allowed = ['paid', 'ongoing', 'done', 'refunded', 'cancelled'];
  const s = req.body && req.body.status;
  if (!allowed.includes(s)) return res.status(400).json({ code: 400, msg: '非法状态' });
  const r = db.prepare(
    `UPDATE orders SET status=?, updated_at=datetime('now','localtime') WHERE id=?`
  ).run(s, req.params.id);
  if (!r.changes) return res.status(404).json({ code: 404, msg: '订单不存在' });
  res.json({ code: 0, msg: '已更新' });
});

// ---- 趣味单图片上传 ----
const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
const funStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, 'fun_' + Date.now() + ext);
  }
});
const funUpload = multer({ storage: funStorage, limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/upload/fun-image', checkAdmin, funUpload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ code: 400, msg: '请选择图片' });
  res.json({ code: 0, data: { path: '/uploads/' + req.file.filename } });
});

module.exports = router;
// ---- 趣味单管理 ----
router.post('/fun-orders', checkAdmin, (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ code: 400, msg: '名称必填' });
  const p = Math.round(Number(b.price || 0) * 100);
  if (!(p >= 1)) return res.status(400).json({ code: 400, msg: '价格无效' });
  const cats = ['体验区', '常规区', '赌约区', '赌红区'];
  const category = cats.includes(b.category) ? b.category : '常规区';
  const limits = ['once', 'weekly', ''];
  const buyLimit = limits.includes(b.buy_limit) ? (b.buy_limit || null) : null;
  const r = db.prepare(
    'INSERT INTO fun_orders (name, price, sub, desc, tags, category, buy_limit, image) VALUES (?,?,?,?,?,?,?,?)'
  ).run(
    String(b.name).slice(0, 40), p,
    String(b.sub || '').slice(0, 100), String(b.desc || '').slice(0, 500),
    JSON.stringify(b.tags || []), category, buyLimit,
    String(b.image || '').slice(0, 300)
  );
  res.json({ code: 0, data: { id: Number(r.lastInsertRowid) }, msg: '已新增' });
});

router.put('/fun-orders/:id', checkAdmin, (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ code: 400, msg: '名称必填' });
  const p = Math.round(Number(b.price || 0) * 100);
  if (!(p >= 1)) return res.status(400).json({ code: 400, msg: '价格无效' });
  const cats = ['体验区', '常规区', '赌约区', '赌红区'];
  const category = cats.includes(b.category) ? b.category : '常规区';
  const limits = ['once', 'weekly', ''];
  const buyLimit = limits.includes(b.buy_limit) ? (b.buy_limit || null) : null;
  const r = db.prepare(
    'UPDATE fun_orders SET name=?, price=?, sub=?, desc=?, tags=?, category=?, buy_limit=?, image=? WHERE id=?'
  ).run(
    String(b.name).slice(0, 40), p,
    String(b.sub || '').slice(0, 100), String(b.desc || '').slice(0, 500),
    JSON.stringify(b.tags || []), category, buyLimit,
    String(b.image || '').slice(0, 300), req.params.id
  );
  if (r.changes === 0) return res.status(404).json({ code: 404, msg: '趣味单不存在' });
  res.json({ code: 0, msg: '已保存' });
});

router.delete('/fun-orders/:id', checkAdmin, (req, res) => {
  const r = db.prepare('DELETE FROM fun_orders WHERE id=?').run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ code: 404, msg: '趣味单不存在' });
  res.json({ code: 0, msg: '已删除' });
});
