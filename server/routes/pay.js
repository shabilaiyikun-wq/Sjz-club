const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../auth');

const fen2yuan = (fen) => fen / 100;

/**
 * POST /api/pay  { orderId, method: 'balance' | 'wx' }
 * 余额支付：校验并扣款（服务端事务）。
 * 微信支付：mockPay=true 时直接标记已支付；接真实商户后改走 prepay + notify。
 */
router.post('/', requireAuth, (req, res) => {
  const { orderId, method } = req.body || {};
  if (!orderId || !['balance', 'wx'].includes(method)) {
    return res.status(400).json({ code: 400, msg: '参数错误' });
  }
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(orderId, req.user.id);
  if (!order) return res.status(404).json({ code: 404, msg: '订单不存在' });
  if (order.status !== 'unpaid') return res.status(400).json({ code: 400, msg: '订单已支付或已取消' });

  if (method === 'balance') {
    const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.user.id);
    if (user.balance < order.total) {
      return res.status(400).json({ code: 400, msg: `余额不足，还差 ¥${fen2yuan(order.total - user.balance).toFixed(2)}` });
    }
    db.exec('BEGIN');
    try {
      db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(order.total, req.user.id);
      const bal = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.user.id).balance;
      db.prepare(`INSERT INTO wallet_tx (user_id, amount, type, balance_after, order_id, remark)
        VALUES (?,?,?,?,?,?)`).run(req.user.id, -order.total, 'pay', bal, order.id, '护航下单扣款');
      db.prepare(`UPDATE orders SET status='paid', pay_method='balance', paid_at=datetime('now','localtime'),
        updated_at=datetime('now','localtime') WHERE id=?`).run(order.id);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    return res.json({ code: 0, msg: `支付成功 ¥${fen2yuan(order.total).toFixed(2)}` });
  }

  // method === 'wx'
  if (require('../config').mockPay) {
    // 模拟微信支付：直接成功
    db.prepare(`UPDATE orders SET status='paid', pay_method='wx_mock', paid_at=datetime('now','localtime'),
      updated_at=datetime('now','localtime') WHERE id=?`).run(order.id);
    return res.json({ code: 0, msg: '模拟微信支付成功', data: { mock: true } });
  }

  // 真实微信支付预留：调 prepay 拿支付参数，前端 wx.requestPayment
  // TODO: 接入微信支付商户号后实现 wxPay.prepay(order) → res.json({ code:0, data:{ timeStamp, nonceStr, package, signType, paySign } })
  res.status(501).json({ code: 501, msg: '微信支付尚未开通，请先用余额支付' });
});

module.exports = router;
