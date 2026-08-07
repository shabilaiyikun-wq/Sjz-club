const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../auth');

const fen2yuan = (fen) => fen / 100;
const parseJson = (s) => { try { return JSON.parse(s); } catch (e) { return {}; } };

/**
 * GET /api/tasks  打手任务大厅：可抢的已支付订单
 */
router.get('/', requireAuth, (req, res) => {
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
 * POST /api/tasks/grab  { orderId }  打手抢单
 */
router.post('/grab', requireAuth, (req, res) => {
  const orderId = (req.body || {}).orderId;
  const r = db.prepare(
    `UPDATE orders SET booster_id = ?, status = 'ongoing', updated_at=datetime('now','localtime')
     WHERE id = ? AND status = 'paid' AND booster_id IS NULL`
  ).run(req.user.id, orderId);
  if (r.changes === 0) return res.status(409).json({ code: 409, msg: '手慢了，该单已被抢走' });
  res.json({ code: 0, msg: '抢单成功' });
});

module.exports = router;
