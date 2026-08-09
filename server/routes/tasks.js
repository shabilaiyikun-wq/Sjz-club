const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { requireAuth, checkBooster } = require('../auth');

const fen2yuan = (fen) => fen / 100;
const parseJson = (s) => { try { return JSON.parse(s); } catch (e) { return {}; } };

// 护航完成截图上传：存 public/uploads/，按用户+时间戳命名
const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, 'done_' + req.user.id + '_' + Date.now() + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

/**
 /** GET /api/tasks  打手任务大厅：可抢的已支付订单
 */
router.get('/', requireAuth, checkBooster, (req, res) => {
  const list = db.prepare(
    `SELECT id, order_no, type, product_name, spec, server, game_id, total, status, created_at
     FROM orders WHERE status = 'paid' AND booster_id IS NULL ORDER BY id ASC LIMIT 100`
  ).all().map((o) => ({
    id: o.id,
    orderNo: o.order_no,
    type: o.type,
    productName: o.product_name,
    spec: parseJson(o.spec),
    server: o.server,
    gameId: o.game_id,
    total: fen2yuan(o.total),
    status: o.status,
    createdAt: o.created_at
  }));
  res.json({ code: 0, data: list });
});

/**
 /** POST /api/tasks/grab  { orderId }  打手抢单
 */
router.post('/grab', requireAuth, checkBooster, (req, res) => {
  const orderId = (req.body || {}).orderId;
  const r = db.prepare(
    `UPDATE orders SET booster_id = ?, status = 'ongoing', updated_at=datetime('now','localtime')
     WHERE id = ? AND status = 'paid' AND booster_id IS NULL`
  ).run(req.user.id, orderId);
  if (r.changes === 0) return res.status(409).json({ code: 409, msg: '手慢了，该单已被抢走' });
  res.json({ code: 0, msg: '抢单成功' });
});

/** GET /api/tasks/mine  我接的单（含用户信息） */
router.get('/mine', requireAuth, checkBooster, (req, res) => {
  const list = db.prepare(
    `SELECT o.id, o.order_no, o.type, o.product_name, o.spec, o.server, o.game_id,
            o.wx, o.note, o.total, o.status, o.created_at, o.pay_method, o.paid_at, o.done_image,
            u.nickname AS customer_name, u.id AS user_id
     FROM orders o LEFT JOIN users u ON u.id = o.user_id
     WHERE o.booster_id = ? ORDER BY o.id DESC`
  ).all(req.user.id).map((o) => ({
    id: o.id,
    orderNo: o.order_no,
    type: o.type,
    productName: o.product_name,
    spec: parseJson(o.spec),
    server: o.server,
    gameId: o.game_id,
    wx: o.wx,
    note: o.note,
    total: fen2yuan(o.total),
    totalText: (fen2yuan(o.total)).toFixed(2),
    status: o.status,
    customerName: o.customer_name || '匿名用户',
    doneImage: o.done_image || '',
    payMethod: o.pay_method,
    paidAt: o.paid_at,
    createdAt: o.created_at
  }));
  res.json({ code: 0, data: list });
});

/** POST /api/tasks/:id/done  打手标记完成（含护航截图，仅本人接的单、进行中状态） */
router.post('/:id/done', requireAuth, checkBooster, upload.single('image'), (req, res) => {
  const r = db.prepare(
    `UPDATE orders SET status='done', done_image = ?, updated_at=datetime('now','localtime')
     WHERE id=? AND booster_id=? AND status='ongoing'`
  ).run(req.file ? '/uploads/' + req.file.filename : null, req.params.id, req.user.id);
  if (r.changes === 0) return res.status(409).json({ code: 409, msg: '无权操作或订单状态不对' });
  res.json({ code: 0, data: { doneImage: req.file ? '/uploads/' + req.file.filename : null }, msg: '已完成' });
});

module.exports = router;
