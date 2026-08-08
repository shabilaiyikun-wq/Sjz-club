const router = require('express').Router();
const db = require('../db');
const { requireAuth, genOrderNo } = require('../auth');

const fen2yuan = (fen) => fen / 100;
const parseJson = (s) => { try { return JSON.parse(s); } catch (e) { return {}; } };

// 出参：把订单里所有分金额转成元
function serialize(o) {
  return {
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
    status: o.status,
    boosterId: o.booster_id,
    payMethod: o.pay_method,
    paidAt: o.paid_at,
    createdAt: o.created_at
  };
}

const STATUS_TEXT = {
  unpaid: '待支付', paid: '待开始', ongoing: '进行中',
  done: '已完成', refunded: '已退款', cancelled: '已取消'
};

/**
 * 下单。服务端重新计算价格，客户端只传类型 + 数量/规格。
 * POST /api/orders  { type:'escort'|'fun', rankId?, hourId?, qty, server, gameId, wx, note }
 */
router.post('/', requireAuth, (req, res) => {
  const u = req.user;
  const b = req.body || {};
  let totalFen, productId, productName, spec;

  if (b.type === 'fun') {
    const f = db.prepare('SELECT * FROM fun_orders WHERE id = ?').get(b.productId);
    if (!f) return res.status(400).json({ code: 400, msg: '趣味单不存在' });
    // 限购校验（取消/退款的不算）：once 每人一次；weekly 每周一次（按自然周 strftime %W）
    if (f.buy_limit === 'once' || f.buy_limit === 'weekly') {
      const once = f.buy_limit === 'once';
      const sql = once
        ? `SELECT COUNT(*) c FROM orders WHERE user_id=? AND type='fun' AND product_id=? AND status NOT IN ('cancelled','refunded')`
        : `SELECT COUNT(*) c FROM orders WHERE user_id=? AND type='fun' AND product_id=? AND status NOT IN ('cancelled','refunded')
           AND strftime('%Y-%W', created_at) = strftime('%Y-%W','now','localtime')`;
      const bought = db.prepare(sql).get(u.id, f.id).c;
      if (bought > 0) {
        return res.status(400).json({ code: 400, msg: once ? '该玩法每人限购 1 次，你已购买过' : '该玩法每周限购 1 次，本周已购买过' });
      }
    }
    const qty = Math.max(1, Math.min(99, Math.floor(Number(b.qty) || 1)));
    totalFen = f.price * qty;
    productId = f.id;
    productName = f.name;
    const platform = ['手机端', '电脑端'].includes(b.platform) ? b.platform : '手机端';
    spec = { qty, platform };
  } else {
    // 护航：价格 = 大神起步价 + 护航时长费（目标段位模块已移除）
    const h = db.prepare('SELECT * FROM spec_hours WHERE id = ?').get(b.hourId);
    if (!h) return res.status(400).json({ code: 400, msg: '时长配置错误' });
    const br = b.boosterId ? db.prepare('SELECT id, name, price FROM boosters WHERE id = ?').get(b.boosterId) : null;
    const base = br && br.price ? br.price : h.price;
    totalFen = base + h.price;
    productId = null;
    productName = '护航·' + (br ? br.name : '大神');
    spec = { booster: br ? br.name : '', hour: h.label, hourId: h.id };
  }

  const no = genOrderNo();
  db.prepare(`INSERT INTO orders
    (order_no, user_id, type, product_id, product_name, spec, server, game_id, wx, note, total)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
    no, u.id, b.type, productId, productName, JSON.stringify(spec),
    b.server || '', b.gameId || '', b.wx || '', b.note || '', totalFen);

  const order = db.prepare('SELECT * FROM orders WHERE order_no = ?').get(no);
  res.json({ code: 0, data: serialize(order), msg: `下单成功，待支付 ¥${(totalFen / 100).toFixed(2)}` });
});

/** GET /api/orders  我的订单列表 ?type=escort|fun|all&status=... */
router.get('/', requireAuth, (req, res) => {
  let sql = 'SELECT * FROM orders WHERE user_id = ?';
  const args = [req.user.id];
  if (req.query.type && req.query.type !== 'all') { sql += ' AND type = ?'; args.push(req.query.type); }
  if (req.query.status && req.query.status !== 'all') { sql += ' AND status = ?'; args.push(req.query.status); }
  sql += ' ORDER BY id DESC';
  const list = db.prepare(sql).all(...args).map(serialize);
  res.json({ code: 0, data: list });
});

/** GET /api/orders/:id  订单详情 */
router.get('/:id', requireAuth, (req, res) => {
  const o = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!o) return res.status(404).json({ code: 404, msg: '订单不存在' });
  res.json({ code: 0, data: { ...serialize(o), statusText: STATUS_TEXT[o.status] } });
});

/** POST /api/orders/:id/cancel  未支付订单取消 */
router.post('/:id/cancel', requireAuth, (req, res) => {
  const o = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!o) return res.status(404).json({ code: 404, msg: '订单不存在' });
  if (o.status !== 'unpaid') return res.status(400).json({ code: 400, msg: '当前状态不可取消' });
  db.prepare(`UPDATE orders SET status='cancelled', updated_at=datetime('now','localtime') WHERE id=?`).run(o.id);
  res.json({ code: 0, msg: '已取消' });
});

module.exports = router;
